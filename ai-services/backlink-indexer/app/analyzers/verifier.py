"""Backlink verifier.

For each candidate source URL, this module:
1. Fetches the page via HTTP (respecting redirects, SSL, robots cues).
2. Parses the HTML with BeautifulSoup.
3. Finds all <a href> tags that point to the target domain.
4. Extracts metadata from the first matching link:
       anchor_text, link_type, rel_attributes, link_position, is_follow
5. Returns a VerificationResult with current_status, http_status, and
   a failure reason when no link is found.

Design principles (from the system prompt)
------------------------------------------
- A discovered backlink is NOT an indexed backlink.
- A backlink can only be indexed if ALL conditions are met:
    * Source page is reachable (200 OK)
    * Link exists in HTML
    * Link resolves correctly after redirects
    * Link is not hidden, cloaked, or injected (basic heuristics)
    * Anchor text or image alt is present
- Each record must carry a clear verification result and failure reason.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from loguru import logger

from app.analyzers.classifier import (
    classify_link_position,
    classify_link_type,
    extract_anchor_text,
    extract_rel_attributes,
)


@dataclass
class VerificationResult:
    source_url: str
    http_status: int = 0
    link_found: bool = False

    # Populated when link_found == True
    target_url: str = ""
    anchor_text: str = ""
    link_type: str = "text"
    rel_attributes: list[str] = field(default_factory=list)
    link_position: str = "content"
    is_follow: bool = True
    is_noindex: bool = False
    canonical_url: Optional[str] = None

    # Populated when link_found == False
    failure_reason: Optional[str] = None

    response_time_ms: int = 0

    @property
    def current_status(self) -> str:
        if not self.link_found:
            if self.http_status == 0:
                return "broken"          # Fetch completely failed
            if self.http_status >= 400:
                return "broken"
            return "lost"                # Page loaded but link gone
        return "active"


_BOT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}


def _is_link_to_domain(href: str, target_domain: str) -> bool:
    """Return True when href points to the target domain (or a subdomain)."""
    if not href:
        return False
    try:
        host = urlparse(href).hostname or ""
        host = host.lstrip("www.")
        return host == target_domain or host.endswith(f".{target_domain}")
    except Exception:
        return False


def _is_hidden_link(tag) -> bool:
    """Heuristic: detect links hidden via inline style (display:none, visibility:hidden)."""
    style = tag.get("style", "").lower()
    return "display:none" in style.replace(" ", "") or "visibility:hidden" in style.replace(" ", "")


async def verify_backlink(
    source_url: str,
    target_domain: str,
    *,
    timeout: float = 20.0,
    verify_ssl: bool = False,
) -> VerificationResult:
    """Fetch `source_url` and verify it contains a link to `target_domain`.

    Args:
        source_url: The candidate page to fetch.
        target_domain: The domain we are looking for (without www).
        timeout: Per-request timeout in seconds.
        verify_ssl: Whether to verify SSL certificates.

    Returns:
        VerificationResult with full metadata.
    """
    t0 = time.perf_counter()
    logger.debug(f"[Verify] Fetching {source_url}")

    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers=_BOT_HEADERS,
            verify=verify_ssl,
            max_redirects=5,
        ) as client:
            response = await client.get(source_url)

        response_time_ms = int((time.perf_counter() - t0) * 1000)
        http_status = response.status_code

        if http_status != 200:
            return VerificationResult(
                source_url=source_url,
                http_status=http_status,
                link_found=False,
                failure_reason=f"HTTP {http_status} — page not accessible",
                response_time_ms=response_time_ms,
            )

        # Parse HTML
        soup = BeautifulSoup(response.text, "lxml")

        # Check meta robots for noindex
        meta_robots = soup.find("meta", attrs={"name": re.compile(r"^robots$", re.I)})
        is_noindex = False
        if meta_robots:
            content = meta_robots.get("content", "")
            is_noindex = "noindex" in content.lower()

        # Canonical URL
        canonical_tag = soup.find("link", attrs={"rel": "canonical"})
        canonical_url = None
        if canonical_tag:
            canonical_url = canonical_tag.get("href") or None

        # Find all <a href> tags pointing to the target domain
        matching_links = [
            a for a in soup.find_all("a", href=True)
            if _is_link_to_domain(a["href"], target_domain)
            and not _is_hidden_link(a)
        ]

        if not matching_links:
            return VerificationResult(
                source_url=source_url,
                http_status=http_status,
                link_found=False,
                is_noindex=is_noindex,
                canonical_url=canonical_url,
                failure_reason="Link to target domain not found in page HTML",
                response_time_ms=response_time_ms,
            )

        # Analyse the first (most prominent) matching link
        link_tag = matching_links[0]
        link_type = classify_link_type(link_tag)
        rel_attrs = extract_rel_attributes(link_tag)
        anchor = extract_anchor_text(link_tag, link_type)
        position = classify_link_position(link_tag)
        is_follow = "nofollow" not in rel_attrs

        target_url = link_tag["href"]
        # Resolve relative hrefs
        if not target_url.startswith(("http://", "https://")):
            target_url = urljoin(source_url, target_url)

        logger.debug(f"[Verify] Link verified on {source_url}: {target_url!r}")

        return VerificationResult(
            source_url=source_url,
            http_status=http_status,
            link_found=True,
            target_url=target_url,
            anchor_text=anchor,
            link_type=link_type,
            rel_attributes=rel_attrs,
            link_position=position,
            is_follow=is_follow,
            is_noindex=is_noindex,
            canonical_url=canonical_url,
            response_time_ms=response_time_ms,
        )

    except httpx.TimeoutException:
        rt = int((time.perf_counter() - t0) * 1000)
        return VerificationResult(
            source_url=source_url,
            http_status=0,
            link_found=False,
            failure_reason="Request timed out",
            response_time_ms=rt,
        )
    except Exception as exc:
        rt = int((time.perf_counter() - t0) * 1000)
        logger.debug(f"[Verify] Fetch error for {source_url}: {exc}")
        return VerificationResult(
            source_url=source_url,
            http_status=0,
            link_found=False,
            failure_reason=f"Fetch error: {type(exc).__name__}: {exc}",
            response_time_ms=rt,
        )
