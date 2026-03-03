from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ─────────────────────────────────────────────
# Backlink record (one indexed, verified link)
# ─────────────────────────────────────────────

class BacklinkRecord(BaseModel):
    """A single verified (or discovered) backlink record.

    Follows the data model defined in the Backlink Index Analysis Engine
    system prompt: source, target, anchor, rel attributes, position,
    lifecycle timestamps, and verification status.
    """

    source_url: str
    """Full URL of the page that contains the link."""

    target_url: str
    """The href value of the link (normalized)."""

    source_domain: str
    """Registered domain of the source page (without www)."""

    anchor_text: str
    """Visible link text, or '[image]' for image links."""

    link_type: str
    """'text' or 'image'."""

    rel_attributes: list[str]
    """rel values found on the <a> tag (e.g. ['nofollow', 'ugc'])."""

    link_position: str
    """Semantic position: 'content' | 'header' | 'nav' | 'footer' | 'sidebar'."""

    first_seen: str
    """ISO-8601 timestamp when the link was first discovered."""

    last_seen: str
    """ISO-8601 timestamp of the last successful verification."""

    current_status: str
    """'active' | 'broken' | 'lost' | 'unverified'."""

    is_follow: bool
    """True when rel does NOT include 'nofollow'."""

    http_status: int
    """HTTP status code of the source page (0 if fetch failed)."""

    discovery_source: str
    """Which discoverer found this candidate: 'duckduckgo' | 'common_crawl' | 'direct'."""

    verification_failed_reason: Optional[str] = None
    """Human-readable reason if verification failed or link was not found."""


# ─────────────────────────────────────────────
# Stats sub-models
# ─────────────────────────────────────────────

class DiscoveryStats(BaseModel):
    dataforseo_candidates: int = 0
    duckduckgo_candidates: int
    bing_candidates: int
    common_crawl_candidates: int
    total_candidates: int
    after_deduplication: int


class VerificationStats(BaseModel):
    verified_active: int
    """Pages fetched successfully that DO contain a link to the target."""

    verified_broken: int
    """Pages that returned 4xx/5xx HTTP status."""

    link_not_found: int
    """Pages that loaded (200 OK) but contain no link to the target."""

    fetch_failed: int
    """Pages where the HTTP request itself failed (timeout, DNS error, etc.)."""

    skipped: int
    """Candidates not verified because verify=False was requested."""


# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────

class BacklinkSummary(BaseModel):
    target_domain: str
    target_url: str
    total_indexed: int
    """Number of backlinks included in indexed_backlinks."""

    follow_count: int
    nofollow_count: int
    text_links: int
    image_links: int
    unique_referring_domains: int
    link_positions: dict[str, int]
    """Counts by position: {'content': N, 'footer': N, ...}"""

    analysis_timestamp: str
    """ISO-8601 timestamp when the analysis completed."""

    discovery_sources_used: list[str]


# ─────────────────────────────────────────────
# Top-level data + response
# ─────────────────────────────────────────────

class BacklinkIndexData(BaseModel):
    summary: BacklinkSummary
    indexed_backlinks: list[BacklinkRecord]
    discovery_stats: DiscoveryStats
    verification_stats: VerificationStats
    warnings: list[str]
    """Non-fatal issues encountered during analysis (e.g. discovery source unavailable)."""


class BacklinkIndexResponse(BaseModel):
    success: bool
    data: Optional[BacklinkIndexData] = None
    error: Optional[str] = None
