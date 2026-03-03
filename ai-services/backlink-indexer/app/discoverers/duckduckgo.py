"""DuckDuckGo HTML backlink discoverer.

Uses DuckDuckGo's publicly accessible HTML search interface (no API key
required) to find pages that mention the target domain but are not part
of it.  Results are candidates that must still be verified.

Search strategy:
    query = '"domain.com" -site:domain.com'

This instructs DDG to find pages that contain a literal mention of the
domain while excluding pages hosted on the domain itself.
"""

from __future__ import annotations

import asyncio
import re
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from bs4 import BeautifulSoup
from loguru import logger

from app.discoverers.base import DiscoveredCandidate, DiscoveryResult

_SOURCE = "duckduckgo"

# DDG's HTML search endpoints
_DDG_HTML_URL = "https://html.duckduckgo.com/html/"
_DDG_LITE_URL = "https://lite.duckduckgo.com/lite/"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://duckduckgo.com/",
}


def _decode_ddg_href(href: str) -> str | None:
    """Convert a DDG redirect href to the actual destination URL."""
    if not href:
        return None
    # DDG redirect: /l/?uddg=ENCODED_URL&rut=...
    if "/l/?" in href or href.startswith("/l/?"):
        try:
            full = href if href.startswith("http") else f"https://duckduckgo.com{href}"
            params = parse_qs(urlparse(full).query)
            if "uddg" in params:
                decoded = unquote(params["uddg"][0])
                if decoded.startswith("http"):
                    return decoded
        except Exception:
            pass
        return None
    if href.startswith("http"):
        return href
    return None


def _extract_urls_from_html(html: str, target_domain: str) -> list[tuple[str, str]]:
    """Parse DDG HTML response and return (url, snippet) tuples.

    Returns only URLs that do NOT belong to the target domain.
    """
    soup = BeautifulSoup(html, "lxml")
    results: list[tuple[str, str]] = []

    for result_div in soup.select(".result"):
        # Title link
        title_a = result_div.select_one("a.result__a")
        snippet_tag = result_div.select_one(".result__snippet")
        snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""

        if not title_a:
            continue

        href = title_a.get("href", "")
        url = _decode_ddg_href(href)

        if not url:
            # Fall back to displayed URL text
            url_span = result_div.select_one(".result__url")
            if url_span:
                raw = url_span.get_text(strip=True)
                if raw and not raw.startswith("http"):
                    raw = f"https://{raw}"
                if raw.startswith("http"):
                    url = raw

        if not url:
            continue

        # Skip URLs from the target domain itself
        parsed_host = urlparse(url).hostname or ""
        parsed_host = parsed_host.lstrip("www.")
        if parsed_host == target_domain or parsed_host.endswith(f".{target_domain}"):
            continue

        results.append((url, snippet))

    return results


def _extract_urls_from_lite_html(html: str, target_domain: str) -> list[tuple[str, str]]:
    """Parse DDG Lite HTML response and return (url, snippet) tuples."""
    soup = BeautifulSoup(html, "lxml")
    results: list[tuple[str, str]] = []

    for row in soup.select("table tr"):
        link_a = row.select_one("a[href]")
        if not link_a:
            continue
        href = link_a.get("href", "")
        url = _decode_ddg_href(href) or (href if href.startswith("http") else None)
        if not url:
            continue
        # Skip DDG-internal and target-domain links
        parsed_host = urlparse(url).hostname or ""
        parsed_host = parsed_host.lstrip("www.")
        if (
            "duckduckgo" in parsed_host
            or parsed_host == target_domain
            or parsed_host.endswith(f".{target_domain}")
        ):
            continue
        results.append((url, ""))

    return results


async def _try_ddg_endpoint(
    client: httpx.AsyncClient,
    endpoint: str,
    query: str,
    *,
    method: str = "POST",
) -> httpx.Response | None:
    """Attempt a search against one DDG endpoint. Returns None on failure."""
    try:
        if method == "GET":
            resp = await client.get(endpoint, params={"q": query, "kl": "us-en"})
        else:
            resp = await client.post(endpoint, data={"q": query, "b": "", "kl": "us-en"})
        if resp.status_code == 200 and len(resp.text) > 500:
            return resp
        logger.debug(f"[DDG] {endpoint} returned status {resp.status_code}")
        return None
    except Exception as exc:
        logger.debug(f"[DDG] {endpoint} failed: {exc}")
        return None


async def discover_via_duckduckgo(
    domain: str,
    max_results: int = 40,
    timeout: float = 25.0,
) -> DiscoveryResult:
    """Search DuckDuckGo for pages that mention the target domain.

    Tries multiple DDG endpoints and methods for resilience against
    bot-detection challenges (202 responses, redirect loops).

    Args:
        domain: The target domain (e.g. 'example.com'), without www.
        max_results: Maximum candidates to return.
        timeout: HTTP request timeout in seconds.

    Returns:
        DiscoveryResult with candidates and any warning.
    """
    query = f'"{domain}" -site:{domain}'
    logger.info(f"[DDG] Searching for backlink candidates: {query!r}")

    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers=_HEADERS,
            verify=False,
        ) as client:
            response = None

            # Strategy 1: POST to html.duckduckgo.com (standard)
            response = await _try_ddg_endpoint(client, _DDG_HTML_URL, query, method="POST")

            # Strategy 2: POST to lite.duckduckgo.com
            if response is None:
                response = await _try_ddg_endpoint(client, _DDG_LITE_URL, query, method="POST")

            # Strategy 3: GET to lite.duckduckgo.com
            if response is None:
                response = await _try_ddg_endpoint(client, _DDG_LITE_URL, query, method="GET")

            # Strategy 4: Simpler query (no quotes) — often returns more results when main query is blocked
            if response is None:
                simple_query = f"{domain} -site:{domain}"
                response = await _try_ddg_endpoint(client, _DDG_LITE_URL, simple_query, method="GET")
                if response is None:
                    response = await _try_ddg_endpoint(client, _DDG_HTML_URL, simple_query, method="POST")

            if response is None:
                logger.warning("[DDG] All DuckDuckGo endpoints failed or returned bot-challenge")
                return DiscoveryResult(
                    source=_SOURCE,
                    warning=(
                        "DuckDuckGo returned a bot-challenge response from this server. "
                        "Discovery via DuckDuckGo was skipped. "
                        "Results may be limited."
                    ),
                )

            # Detect which parser to use based on content
            html = response.text
            if "result__a" in html:
                pairs = _extract_urls_from_html(html, domain)
            else:
                pairs = _extract_urls_from_lite_html(html, domain)

            # If main query returned no URLs, try simpler query on same response or retry with domain-only
            if not pairs and len(html) > 500:
                simple_query = f"{domain} -site:{domain}"
                fallback = await _try_ddg_endpoint(client, _DDG_LITE_URL, simple_query, method="GET")
                if fallback:
                    html = fallback.text
                    pairs = _extract_urls_from_lite_html(html, domain) if "result__a" not in html else _extract_urls_from_html(html, domain)

        logger.info(f"[DDG] Extracted {len(pairs)} candidate URLs")

        # Deduplicate
        seen: set[str] = set()
        candidates: list[DiscoveredCandidate] = []
        for url, snippet in pairs:
            if url not in seen and len(candidates) < max_results:
                seen.add(url)
                candidates.append(
                    DiscoveredCandidate(url=url, source=_SOURCE, raw_snippet=snippet)
                )

        return DiscoveryResult(source=_SOURCE, candidates=candidates)

    except httpx.TimeoutException:
        logger.warning("[DDG] Request timed out")
        return DiscoveryResult(source=_SOURCE, warning="DuckDuckGo search timed out")
    except Exception as exc:
        logger.warning(f"[DDG] Discovery failed: {exc}")
        return DiscoveryResult(
            source=_SOURCE,
            warning=f"DuckDuckGo discovery failed: {exc}",
        )
