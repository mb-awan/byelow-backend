from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

import certifi
import httpx
from bs4 import BeautifulSoup
from html_parser import parse_html
from loguru import logger

from app.config import Settings

# Tags that should be removed entirely (no user-facing text content)
_REMOVE_TAGS = frozenset({
    "script", "style", "noscript", "iframe", "svg", "canvas",
    "form", "button", "input", "select", "textarea",
    "video", "audio", "embed", "object", "picture", "source",
    "nav", "footer", "header", "aside",
})

# Regex for class/id attribute values that signal non-content elements
_NON_CONTENT_RE = re.compile(
    r"(^|\s|-|_)(nav|navigation|navbar|menu|menubar|sidebar|footer|header|"
    r"cookie|banner|popup|modal|overlay|advertisement|social|share-bar|"
    r"breadcrumb|pagination|widget|related-posts|comment-form|signup|"
    r"subscribe|promo|cta-banner|ad-unit)(\s|-|_|$)",
    re.IGNORECASE,
)


@dataclass
class ExtractedContent:
    """Structured content extracted from a webpage."""

    url: str
    final_url: str
    title: str
    meta_description: str
    headings: list[dict]        # [{"level": int, "text": str, "order": int}]
    content_text: str
    image_alts: list[str]
    internal_links: list[dict]  # [{"text": str, "href": str, "is_contextual": bool}]
    word_count: int
    has_schema_markup: bool = False
    extraction_warnings: list[str] = field(default_factory=list)
    fetch_error: str | None = None


async def fetch_and_extract(url: str, settings: Settings) -> ExtractedContent:
    """Fetch a URL and extract structured SEO content from its HTML."""
    warnings: list[str] = []
    final_url = url
    html = ""

    try:
        # Use certifi bundle when verifying (fixes SSL verify on Windows)
        verify = certifi.where() if settings.verify_ssl else False
        async with httpx.AsyncClient(
            timeout=settings.http_timeout,
            follow_redirects=True,
            max_redirects=settings.max_redirects,
            headers={"User-Agent": settings.user_agent},
            verify=verify,
        ) as client:
            response = await client.get(url)
            final_url = str(response.url)
            html = response.text

            if response.status_code >= 400:
                warnings.append(f"Page returned HTTP {response.status_code}")

    except httpx.TooManyRedirects:
        return _empty_result(url, final_url, "Too many redirects", warnings)
    except httpx.TimeoutException:
        return _empty_result(url, final_url, "Request timed out", warnings)
    except httpx.ConnectError as exc:
        return _empty_result(url, final_url, f"Connection failed: {exc}", warnings)
    except httpx.HTTPError as exc:
        return _empty_result(url, final_url, f"HTTP error: {exc}", warnings)

    if not html:
        return _empty_result(url, final_url, "Empty response body", warnings)

    logger.debug(f"Fetched {final_url} ({len(html)} chars)")
    return _parse_html(html, url, final_url, warnings)


def _parse_html(
    html: str, url: str, final_url: str, warnings: list[str]
) -> ExtractedContent:
    """Parse the full HTML and extract all SEO-relevant content."""
    domain = (urlparse(final_url).hostname or urlparse(url).hostname or "").lower()

    soup = parse_html(html)

    # ── Title ──────────────────────────────────────────────────────────
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""
    if not title:
        warnings.append("Page title tag is missing")

    # ── Meta Description ───────────────────────────────────────────────
    meta_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_description = ""
    if meta_tag and meta_tag.get("content"):
        meta_description = str(meta_tag["content"]).strip()
    if not meta_description:
        warnings.append("Meta description is missing")

    # ── Schema markup detection ────────────────────────────────────────
    has_schema = bool(
        soup.find("script", attrs={"type": re.compile(r"application/ld\+json", re.I)})
    )

    # ── Headings (before cleanup, to preserve full hierarchy) ──────────
    headings: list[dict] = []
    for order, tag in enumerate(soup.find_all(re.compile(r"^h[1-6]$", re.I))):
        level = int(tag.name[1])
        text = tag.get_text(strip=True)
        if text:
            headings.append({"level": level, "text": text, "order": order})

    h1_count = sum(1 for h in headings if h["level"] == 1)
    if h1_count == 0:
        warnings.append("H1 heading is missing")
    elif h1_count > 1:
        warnings.append(f"Multiple H1 tags found ({h1_count})")

    # ── Image alt texts ────────────────────────────────────────────────
    image_alts: list[str] = []
    for img in soup.find_all("img"):
        alt = str(img.get("alt", "")).strip()
        if alt:
            image_alts.append(alt)
        elif img.get("src"):
            src_preview = str(img.get("src", ""))[:60]
            warnings.append(f"Image missing alt text: {src_preview}")

    # ── Internal links ─────────────────────────────────────────────────
    internal_links: list[dict] = []
    for a in soup.find_all("a", href=True):
        href = str(a.get("href", "")).strip()
        text = a.get_text(strip=True)
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        if _is_internal(href, domain):
            is_contextual = bool(text) and 3 <= len(text) <= 100
            internal_links.append(
                {"text": text, "href": href, "is_contextual": is_contextual}
            )

    # ── Content extraction (clean copy of soup) ────────────────────────
    content_soup = parse_html(html)
    _strip_non_content(content_soup)

    main_el = _find_main_region(content_soup)
    content_text = _clean_text(main_el or content_soup.body or content_soup)

    word_count = len(content_text.split())

    # Fallback: if stripping was too aggressive, extract from the original soup body
    # (less clean but ensures we don't silently return empty content)
    if word_count < 50 and soup.body:
        fallback_text = _clean_text(soup.body)
        fallback_words = len(fallback_text.split())
        if fallback_words > word_count:
            content_text = fallback_text
            word_count = fallback_words
            warnings.append(
                "Content extracted using full-body fallback — some navigation text may be included"
            )

    if word_count < 50:
        warnings.append(
            f"Very low extracted word count ({word_count}) — content may be JS-rendered or extraction may be incomplete"
        )

    return ExtractedContent(
        url=url,
        final_url=final_url,
        title=title,
        meta_description=meta_description,
        headings=headings,
        content_text=content_text,
        image_alts=image_alts,
        internal_links=internal_links,
        word_count=word_count,
        has_schema_markup=has_schema,
        extraction_warnings=warnings,
    )


# ── Helper functions ───────────────────────────────────────────────────────────

def _strip_non_content(soup: BeautifulSoup) -> None:
    """Remove navigation, ads, scripts, and decorative elements in-place."""
    # Collect by tag name first
    to_remove = []
    for tag_name in _REMOVE_TAGS:
        to_remove.extend(soup.find_all(tag_name))

    # Collect by class/id pattern
    for tag in soup.find_all(True):
        attrs_str = " ".join(
            [" ".join(tag.get("class", [])), tag.get("id", "")]
        )
        if _NON_CONTENT_RE.search(attrs_str):
            to_remove.append(tag)

    seen = set()
    for tag in to_remove:
        tag_id = id(tag)
        if tag_id not in seen and tag.parent is not None:
            seen.add(tag_id)
            tag.decompose()


def _find_main_region(soup: BeautifulSoup):
    """Locate the primary content container using semantic and heuristic signals."""
    # Semantic elements (highest confidence)
    for selector in ("main", "article", '[role="main"]'):
        el = soup.select_one(selector)
        if el:
            return el

    # Common content class/id patterns
    for pattern in (
        "post-content", "entry-content", "article-body", "article-content",
        "page-content", "main-content", "content-body", "blog-content",
        "post-body", "article__body", "content__body",
    ):
        el = soup.find(class_=re.compile(pattern, re.I))
        if el:
            return el
        el = soup.find(id=re.compile(pattern, re.I))
        if el:
            return el

    return None


def _clean_text(element) -> str:
    """Extract and normalize whitespace-collapsed text from an element."""
    raw = element.get_text(separator=" ", strip=True)
    # Collapse multiple whitespace characters
    cleaned = re.sub(r"[ \t\r]+", " ", raw)
    cleaned = re.sub(r"\n{2,}", "\n", cleaned)
    return cleaned.strip()


def _is_internal(href: str, domain: str) -> bool:
    """Return True if href belongs to the same domain or is a relative path."""
    if href.startswith("/"):
        return True
    if not href.startswith("http"):
        return False
    parsed = urlparse(href)
    link_host = (parsed.hostname or "").lower().removeprefix("www.")
    base = domain.lower().removeprefix("www.")
    return link_host == base or link_host.endswith(f".{base}")


def _empty_result(
    url: str, final_url: str, error: str, warnings: list[str]
) -> ExtractedContent:
    return ExtractedContent(
        url=url,
        final_url=final_url,
        title="",
        meta_description="",
        headings=[],
        content_text="",
        image_alts=[],
        internal_links=[],
        word_count=0,
        extraction_warnings=warnings,
        fetch_error=error,
    )
