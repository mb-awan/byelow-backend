from __future__ import annotations

import time
from dataclasses import dataclass, field

import httpx
from loguru import logger

from app.config import Settings


@dataclass
class FetchResult:
    """Data captured from fetching a page."""

    final_url: str = ""
    status_code: int = 0
    redirect_chain: list[dict] = field(default_factory=list)
    headers: dict[str, str] = field(default_factory=dict)
    html: str = ""
    ttfb: float = 0.0
    total_time: float = 0.0
    html_size_bytes: int = 0
    error: str | None = None
    robots_txt: str | None = None
    sitemap_xml: str | None = None


async def fetch_page(url: str, settings: Settings) -> FetchResult:
    """Fetch a page and capture response data.

    Follows redirects, measures TTFB and total time, captures headers,
    status codes, and the redirect chain. Does not bypass authentication,
    CAPTCHA, or rate limits.
    """
    result = FetchResult()

    try:
        async with httpx.AsyncClient(
            timeout=settings.http_timeout,
            follow_redirects=True,
            max_redirects=settings.max_redirects,
            headers={"User-Agent": settings.user_agent},
            verify=True,
        ) as client:
            # Measure TTFB using an event hook
            ttfb_marker: float = 0.0
            start_time = time.monotonic()

            # Fetch the main page
            response = await client.get(url)
            total_time = time.monotonic() - start_time

            # TTFB approximation: time of the first response in the chain
            if response.history:
                # First redirect response was received quickly, use elapsed of final
                ttfb_marker = response.elapsed.total_seconds()
            else:
                ttfb_marker = response.elapsed.total_seconds()

            result.final_url = str(response.url)
            result.status_code = response.status_code
            result.headers = dict(response.headers)
            result.html = response.text
            result.html_size_bytes = len(response.content)
            result.ttfb = round(ttfb_marker, 4)
            result.total_time = round(total_time, 4)

            # Capture redirect chain
            for r in response.history:
                result.redirect_chain.append(
                    {
                        "url": str(r.url),
                        "status_code": r.status_code,
                    }
                )

            # Fetch robots.txt
            result.robots_txt = await _fetch_resource(
                client, url, "/robots.txt"
            )

            # Fetch sitemap.xml
            result.sitemap_xml = await _fetch_resource(
                client, url, "/sitemap.xml"
            )

    except httpx.TooManyRedirects:
        result.error = "Too many redirects"
        logger.warning(f"Too many redirects for {url}")
    except httpx.TimeoutException:
        result.error = "Request timed out"
        logger.warning(f"Timeout fetching {url}")
    except httpx.ConnectError as exc:
        result.error = f"Connection failed: {exc}"
        logger.warning(f"Connection failed for {url}: {exc}")
    except httpx.HTTPError as exc:
        result.error = f"HTTP error: {exc}"
        logger.warning(f"HTTP error for {url}: {exc}")

    return result


async def _fetch_resource(
    client: httpx.AsyncClient, base_url: str, path: str
) -> str | None:
    """Fetch a well-known resource relative to the base URL's origin."""
    from urllib.parse import urlparse

    parsed = urlparse(base_url)
    resource_url = f"{parsed.scheme}://{parsed.hostname}{path}"
    try:
        resp = await client.get(resource_url)
        if resp.status_code == 200 and "text" in resp.headers.get(
            "content-type", ""
        ):
            return resp.text
    except httpx.HTTPError:
        pass
    return None
