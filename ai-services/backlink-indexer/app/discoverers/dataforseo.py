"""DataForSEO Backlinks API discoverer.

Uses the DataForSEO /backlinks/backlinks/live endpoint to fetch
pre-verified backlinks for a target domain. DataForSEO crawls the web
continuously and confirms each link exists, so its results are reliable.

Returned records have current_status='active' and http_status=200 —
no further HTTP verification is needed.
"""

from __future__ import annotations

import base64
from typing import Optional
from urllib.parse import urlparse

import httpx
from loguru import logger

from app.models.responses import BacklinkRecord

_DATAFORSEO_API_URL = "https://api.dataforseo.com/v3/backlinks/backlinks/live"

_POSITION_MAP: dict[str, str] = {
    "content": "content",
    "body": "content",
    "header": "header",
    "footer": "footer",
    "nav": "nav",
    "navigation": "nav",
    "sidebar": "sidebar",
    "widget": "sidebar",
}


async def discover_via_dataforseo(
    domain: str,
    login: str,
    password: str,
    max_results: int = 100,
    timestamp: str = "",
    timeout: float = 30.0,
) -> tuple[list[BacklinkRecord], int, Optional[str]]:
    """Fetch pre-verified backlinks from DataForSEO Backlinks API.

    Args:
        domain: Target domain (e.g. 'example.com'), without www.
        login: DataForSEO API login (DATAFORSEO_LOGIN env var).
        password: DataForSEO API password (DATAFORSEO_PASSWORD env var).
        max_results: Maximum records to fetch (capped at 1000 by API).
        timestamp: ISO-8601 string for first_seen / last_seen fields.
        timeout: HTTP request timeout in seconds.

    Returns:
        (records, total_count, warning_or_None)
        - records: BacklinkRecord objects with current_status='active'
        - total_count: Total backlink count reported by DataForSEO
        - warning_or_None: Error message if something went wrong
    """
    if not login or not password:
        return [], 0, "DataForSEO credentials not configured (DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD)"

    auth = base64.b64encode(f"{login}:{password}".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    }
    payload = [
        {
            "target": domain,
            "target_type": "domain",
            "limit": min(max_results, 1000),
            "order_by": ["rank,desc"],
            "mode": "as_is",
            "filters": [["is_lost", "=", False]],
        }
    ]

    logger.info(f"[DataForSEO] Fetching backlinks for domain: {domain} (limit={min(max_results, 1000)})")

    try:
        async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
            response = await client.post(_DATAFORSEO_API_URL, json=payload, headers=headers)

        if response.status_code != 200:
            return [], 0, f"DataForSEO API returned HTTP {response.status_code}"

        data = response.json()
        tasks = data.get("tasks", [])
        if not tasks:
            return [], 0, "DataForSEO API returned no tasks"

        task = tasks[0]
        status_code = task.get("status_code", 0)
        if status_code != 20000:
            msg = task.get("status_message", "Unknown error")
            return [], 0, f"DataForSEO task error ({status_code}): {msg}"

        results = task.get("result") or []
        if not results:
            return [], 0, None

        result = results[0]
        items = result.get("items") or []
        total_count = result.get("total_count", 0)

        records: list[BacklinkRecord] = []
        for item in items:
            source_url = item.get("url_from", "")
            if not source_url:
                continue

            target_url = item.get("url_to") or f"https://{domain}"
            source_domain = item.get("domain_from") or (
                urlparse(source_url).hostname or ""
            ).lstrip("www.")
            anchor_text = item.get("anchor") or ""
            is_nofollow = item.get("nofollow", False)
            is_dofollow = item.get("dofollow", not is_nofollow)
            link_type_raw = item.get("type", "anchor")
            link_type = "image" if link_type_raw in ("image", "redirect_image") else "text"
            semantic_location = (item.get("semantic_location") or "content").lower()
            is_lost = item.get("is_lost", False)

            link_position = _POSITION_MAP.get(semantic_location, "content")

            rel_attributes: list[str] = []
            if is_nofollow:
                rel_attributes.append("nofollow")

            # DataForSEO marks is_lost=True for links that no longer exist
            current_status = "lost" if is_lost else "active"

            records.append(
                BacklinkRecord(
                    source_url=source_url,
                    target_url=target_url,
                    source_domain=source_domain,
                    anchor_text=anchor_text,
                    link_type=link_type,
                    rel_attributes=rel_attributes,
                    link_position=link_position,
                    first_seen=timestamp,
                    last_seen=timestamp,
                    current_status=current_status,
                    is_follow=is_dofollow,
                    http_status=200,  # DataForSEO has confirmed the page is reachable
                    discovery_source="dataforseo",
                    verification_failed_reason=None,
                )
            )

        logger.info(f"[DataForSEO] {len(records)} records returned (API total_count={total_count})")
        return records, total_count, None

    except httpx.TimeoutException:
        logger.warning("[DataForSEO] Request timed out")
        return [], 0, "DataForSEO API request timed out"
    except Exception as exc:
        logger.warning(f"[DataForSEO] Discovery failed: {exc}")
        return [], 0, f"DataForSEO discovery failed: {exc}"
