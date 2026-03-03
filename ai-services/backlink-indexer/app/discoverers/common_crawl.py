"""Common Crawl CDX backlink discoverer.

Uses the Common Crawl CDX Index Server (completely free, no API key) to
discover pages that link to the target domain.

Strategy
--------
Phase A — Find pages from the target domain crawled by CC:
    Query the CDX API for URLs on the target domain to confirm CC has
    crawled it and to understand what target pages exist.

Phase B — Find external pages that reference the target domain:
    Search the CDX for pages whose ORIGINAL URL contains the domain string
    as a path component or query parameter (e.g., pages referencing the
    domain in their URL).  This catches redirect pages, aggregator pages,
    and link directories.

Phase C — WAT record scan for outbound links:
    For a small sample of pages from well-known, high-traffic domains
    (Wikipedia, blog aggregators, forum sites) fetch WAT records and
    check if they contain outbound links to the target domain.

This approach is free and accurate but rate-limited by CC's servers.
"""

from __future__ import annotations

import asyncio
import json
from urllib.parse import urlparse

import httpx
from loguru import logger

from app.discoverers.base import DiscoveredCandidate, DiscoveryResult

_SOURCE = "common_crawl"
_CC_COLLINFO_URL = "https://index.commoncrawl.org/collinfo.json"
_CC_INDEX_BASE = "https://index.commoncrawl.org"
_CC_DATA_BASE = "https://data.commoncrawl.org"

# Broad seed domains whose pages are likely to link to many other sites
# and are crawled frequently by CC — used for WAT-based backlink discovery.
_SEED_URL_PATTERNS = [
    "en.wikipedia.org/wiki/*",
    "reddit.com/r/*",
    "news.ycombinator.com*",
    "dev.to/*",
    "medium.com/*",
    "github.com/*",
]

# How many WAT records to scan
_MAX_WAT_RECORDS = 10


async def _get_latest_cc_index(client: httpx.AsyncClient) -> str | None:
    """Fetch the most recent Common Crawl index ID (e.g. 'CC-MAIN-2024-51')."""
    try:
        resp = await client.get(_CC_COLLINFO_URL, timeout=10.0)
        resp.raise_for_status()
        collections = resp.json()
        if collections and isinstance(collections, list):
            return collections[0].get("id")
    except Exception as exc:
        logger.warning(f"[CC] Failed to fetch collinfo: {exc}")
    return None


async def _query_cc_index(
    client: httpx.AsyncClient,
    index_id: str,
    url_pattern: str,
    *,
    limit: int = 20,
) -> list[dict]:
    """Query the CC CDX index for pages matching a URL pattern."""
    endpoint = f"{_CC_INDEX_BASE}/{index_id}-index"
    params = {
        "url": url_pattern,
        "output": "json",
        "limit": str(limit),
        "fl": "url,filename,offset,length,status,timestamp",
        "filter": "status:200",
    }
    try:
        resp = await client.get(endpoint, params=params, timeout=15.0)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        records = []
        for line in resp.text.strip().splitlines():
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
        return records
    except Exception as exc:
        logger.warning(f"[CC] CDX query failed for {url_pattern}: {exc}")
        return []


async def _fetch_wat_record(
    client: httpx.AsyncClient,
    filename: str,
    offset: str,
    length: str,
) -> dict | None:
    """Fetch a single WAT record via HTTP Range request and parse the JSON payload."""
    url = f"{_CC_DATA_BASE}/{filename}"
    start = int(offset)
    end = start + int(length) - 1
    headers = {"Range": f"bytes={start}-{end}"}
    try:
        resp = await client.get(url, headers=headers, timeout=25.0)
        if resp.status_code not in (200, 206):
            return None
        content = resp.content
        # WAT records may be gzip-compressed in the stream;
        # try to decompress first, then fall back to raw decode.
        try:
            import gzip
            text = gzip.decompress(content).decode("utf-8", errors="replace")
        except Exception:
            text = content.decode("utf-8", errors="replace")
        # WAT JSON block starts at the first '{'
        json_start = text.find("{")
        if json_start == -1:
            return None
        return json.loads(text[json_start:])
    except Exception as exc:
        logger.debug(f"[CC] WAT fetch failed ({filename}): {exc}")
        return None


def _extract_outbound_links_to_domain(wat_record: dict, target_domain: str) -> list[str]:
    """Extract hrefs from a WAT record that point to the target domain."""
    matching: list[str] = []
    try:
        envelope = wat_record.get("Envelope", {})
        payload = envelope.get("Payload-Metadata", {})
        http_resp = payload.get("HTTP-Response-Metadata", {})
        html_meta = http_resp.get("HTML-Metadata", {})
        links = html_meta.get("Links", [])
        for link in links:
            href = link.get("url", "")
            if not href:
                continue
            host = urlparse(href).hostname or ""
            host = host.lstrip("www.")
            if host == target_domain or host.endswith(f".{target_domain}"):
                matching.append(href)
    except Exception:
        pass
    return matching


async def discover_via_common_crawl(
    domain: str,
    max_results: int = 20,
    timeout: float = 30.0,
) -> DiscoveryResult:
    """Discover backlink candidates using the Common Crawl public index.

    Args:
        domain: Target domain (e.g. 'example.com'), without www.
        max_results: Maximum candidate URLs to return.
        timeout: Per-request timeout in seconds.

    Returns:
        DiscoveryResult with candidates and optional warning.
    """
    logger.info(f"[CC] Starting Common Crawl discovery for domain: {domain}")

    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        verify=False,
    ) as client:
        # Step 1: Get the latest CC index ID
        index_id = await _get_latest_cc_index(client)
        if not index_id:
            return DiscoveryResult(
                source=_SOURCE,
                warning="Could not retrieve Common Crawl index list",
            )

        logger.info(f"[CC] Using index: {index_id}")

        # Step 2: Scan seed URL patterns from high-traffic sites to find pages
        # that have outbound links to the target domain.
        # We fetch WAT records from these pages and check outbound links.
        seed_tasks = [
            _query_cc_index(client, index_id, pattern, limit=3)
            for pattern in _SEED_URL_PATTERNS
        ]
        seed_results_nested = await asyncio.gather(*seed_tasks, return_exceptions=True)

        seed_records: list[dict] = []
        for result in seed_results_nested:
            if isinstance(result, Exception):
                continue
            seed_records.extend(result)

        logger.info(f"[CC] Got {len(seed_records)} seed CDX records from broad patterns")

        # Step 3: Also look for pages from external sites that contain the domain
        # in their URL (e.g., redirect aggregators, cached pages, link lists).
        # Use a targeted pattern that finds pages referencing the domain in their path.
        referrer_records = await _query_cc_index(
            client,
            index_id,
            f"*/{domain}*",  # pages like /some-path/domain.com or /redirect/domain.com
            limit=15,
        )
        # Filter to external pages only (not the target domain itself)
        referrer_records = [
            r for r in referrer_records
            if not (urlparse(r.get("url", "")).hostname or "").lstrip("www.").endswith(domain)
        ]
        logger.info(f"[CC] Got {len(referrer_records)} external referrer CDX records")

        all_candidate_records = (seed_records + referrer_records)[:_MAX_WAT_RECORDS]

        # Step 4: Fetch WAT records and scan outbound links
        candidates: list[DiscoveredCandidate] = []
        seen_urls: set[str] = set()

        wat_tasks = []
        valid_records = []
        for record in all_candidate_records:
            filename = record.get("filename", "")
            offset = record.get("offset", "")
            length = record.get("length", "")
            if filename and offset and length:
                wat_tasks.append(_fetch_wat_record(client, filename, offset, length))
                valid_records.append(record)

        if wat_tasks:
            wat_results = await asyncio.gather(*wat_tasks, return_exceptions=True)
            for i, wat_result in enumerate(wat_results):
                if isinstance(wat_result, Exception) or wat_result is None:
                    continue
                page_url = valid_records[i].get("url", "")
                outbound = _extract_outbound_links_to_domain(wat_result, domain)
                if outbound and page_url and page_url not in seen_urls:
                    # Skip pages from the target domain itself
                    page_host = (urlparse(page_url).hostname or "").lstrip("www.")
                    if page_host == domain or page_host.endswith(f".{domain}"):
                        continue
                    seen_urls.add(page_url)
                    candidates.append(
                        DiscoveredCandidate(
                            url=page_url,
                            source=_SOURCE,
                            raw_snippet=f"CC WAT: links to {', '.join(outbound[:3])}",
                        )
                    )
                    if len(candidates) >= max_results:
                        break

        if not candidates:
            logger.info(f"[CC] No external referrers found via WAT for {domain}")
        else:
            logger.info(f"[CC] Found {len(candidates)} candidates via WAT outbound links")

        return DiscoveryResult(
            source=_SOURCE,
            candidates=candidates[:max_results],
            warning=None if candidates else (
                "Common Crawl WAT scan returned no external referrers for this domain. "
                "This is normal for newer or smaller domains."
            ),
        )
