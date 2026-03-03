"""Bing HTML backlink discoverer.

Uses Bing's publicly accessible HTML search interface (no API key
required) as a fallback when DuckDuckGo is unavailable.

Search strategy:
    query = '"domain.com" -site:domain.com'
"""

from __future__ import annotations

from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from loguru import logger

from app.discoverers.base import DiscoveredCandidate, DiscoveryResult

_SOURCE = "bing"
_BING_SEARCH_URL = "https://www.bing.com/search"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.bing.com/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
}


def _extract_bing_results(html: str, target_domain: str) -> list[tuple[str, str]]:
    """Parse Bing HTML response and return (url, snippet) tuples."""
    soup = BeautifulSoup(html, "lxml")
    results: list[tuple[str, str]] = []

    for result in soup.select("li.b_algo"):
        link_a = result.select_one("h2 a")
        snippet_tag = result.select_one(".b_caption p")
        snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""

        if not link_a:
            continue

        href = link_a.get("href", "")
        if not href or not href.startswith("http"):
            continue

        parsed_host = urlparse(href).hostname or ""
        parsed_host = parsed_host.lstrip("www.")

        # Skip results from the target domain or Bing itself
        if (
            "bing.com" in parsed_host
            or "microsoft.com" in parsed_host
            or parsed_host == target_domain
            or parsed_host.endswith(f".{target_domain}")
        ):
            continue

        results.append((href, snippet))

    return results


async def discover_via_bing(
    domain: str,
    max_results: int = 30,
    timeout: float = 20.0,
) -> DiscoveryResult:
    """Search Bing for pages that mention the target domain.

    Args:
        domain: The target domain (e.g. 'example.com'), without www.
        max_results: Maximum candidates to return.
        timeout: HTTP request timeout in seconds.

    Returns:
        DiscoveryResult with candidates and any warning.
    """
    query = f'"{domain}" -site:{domain}'
    logger.info(f"[Bing] Searching for backlink candidates: {query!r}")

    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers=_HEADERS,
            verify=False,
        ) as client:
            response = await client.get(
                _BING_SEARCH_URL,
                params={"q": query, "cc": "us", "setlang": "en"},
            )

            if response.status_code != 200:
                # Fallback: try simpler query (often less likely to be rate-limited)
                simple_query = f"{domain} -site:{domain}"
                response = await client.get(
                    _BING_SEARCH_URL,
                    params={"q": simple_query, "cc": "us", "setlang": "en"},
                )

            pairs = _extract_bing_results(response.text, domain) if response.status_code == 200 else []
            if response.status_code == 200 and not pairs:
                # Zero results with main query — try domain-only
                response = await client.get(
                    _BING_SEARCH_URL,
                    params={"q": f"{domain} -site:{domain}", "cc": "us", "setlang": "en"},
                )
                if response.status_code == 200:
                    pairs = _extract_bing_results(response.text, domain)

        if response.status_code != 200:
            logger.warning(f"[Bing] Non-200 response: {response.status_code}")
            return DiscoveryResult(
                source=_SOURCE,
                warning=f"Bing returned HTTP {response.status_code}",
            )

        logger.info(f"[Bing] Extracted {len(pairs)} candidate URLs")

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
        logger.warning("[Bing] Request timed out")
        return DiscoveryResult(source=_SOURCE, warning="Bing search timed out")
    except Exception as exc:
        logger.warning(f"[Bing] Discovery failed: {exc}")
        return DiscoveryResult(
            source=_SOURCE,
            warning=f"Bing discovery failed: {exc}",
        )
