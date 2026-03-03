"""Backlink Index Orchestrator.

Five-phase pipeline (following the system prompt guidelines):

  Phase 1  – Normalize input (URL → domain, validate)
  Phase 2a – DataForSEO discovery (primary; pre-verified backlinks)
  Phase 2b – Free-source discovery (DuckDuckGo + Bing + Common Crawl, concurrent)
  Phase 3  – Deduplication & normalization of free-source candidates
  Phase 4  – HTTP Verification for free-source candidates only
  Phase 5  – Assemble response (BacklinkIndexData with summary + records)

Design principles
-----------------
- DataForSEO results are pre-verified by their crawler → no re-verification needed.
- Free-source candidates (DDG / Bing / CC) require HTTP verification before indexing.
- Only verified active backlinks are counted in the summary follow/nofollow/position stats.
- Uncertainty is flagged via VerificationResult.failure_reason and warnings[].
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from urllib.parse import urlparse

from loguru import logger

from app.analyzers.verifier import VerificationResult, verify_backlink
from app.config import Settings
from app.core.url_utils import extract_domain, normalize_for_dedup
from app.discoverers.bing import discover_via_bing
from app.discoverers.common_crawl import discover_via_common_crawl
from app.discoverers.dataforseo import discover_via_dataforseo
from app.discoverers.duckduckgo import discover_via_duckduckgo
from app.models.responses import (
    BacklinkIndexData,
    BacklinkRecord,
    BacklinkSummary,
    DiscoveryStats,
    VerificationStats,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class BacklinkIndexOrchestrator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    # ──────────────────────────────────────────────────────────
    # Public entry point
    # ──────────────────────────────────────────────────────────

    async def analyze(
        self,
        url: str,
        max_backlinks: int = 50,
        verify: bool = True,
    ) -> BacklinkIndexData:
        """Run the full backlink index pipeline for a target URL/domain."""
        timestamp = _now_iso()
        warnings: list[str] = []

        # ── Phase 1: Normalize ────────────────────────────────
        domain = extract_domain(url)
        logger.info(f"[Orchestrator] Starting backlink index for domain: {domain}")

        # ── Phase 2a: DataForSEO (primary, pre-verified) ──────
        logger.info("[Orchestrator] Phase 2a — DataForSEO discovery")
        dfs_records: list[BacklinkRecord] = []
        dfs_total_count = 0

        if self.settings.dataforseo_login and self.settings.dataforseo_password:
            dfs_records, dfs_total_count, dfs_warning = await discover_via_dataforseo(
                domain,
                login=self.settings.dataforseo_login,
                password=self.settings.dataforseo_password,
                max_results=max_backlinks,
                timestamp=timestamp,
                timeout=self.settings.discovery_timeout,
            )
            if dfs_warning:
                warnings.append(f"DataForSEO: {dfs_warning}")
            logger.info(
                f"[Orchestrator] DataForSEO: {len(dfs_records)} records "
                f"(API total_count={dfs_total_count})"
            )
        else:
            warnings.append(
                "DataForSEO credentials not set (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD). "
                "Falling back to free discovery sources only."
            )

        # ── Phase 2b: Free-source discovery ───────────────────
        logger.info("[Orchestrator] Phase 2b — Free-source discovery (DDG + Bing + CC)")
        ddg_result, bing_result, cc_result = await asyncio.gather(
            discover_via_duckduckgo(
                domain,
                max_results=max(max_backlinks * 2, 60),
                timeout=self.settings.discovery_timeout,
            ),
            discover_via_bing(
                domain,
                max_results=max(max_backlinks, 30),
                timeout=self.settings.discovery_timeout,
            ),
            discover_via_common_crawl(
                domain,
                max_results=20,
                timeout=self.settings.discovery_timeout,
            ),
        )

        if ddg_result.warning:
            warnings.append(f"DuckDuckGo discovery: {ddg_result.warning}")
        if bing_result.warning:
            warnings.append(f"Bing discovery: {bing_result.warning}")
        if cc_result.warning:
            warnings.append(f"Common Crawl discovery: {cc_result.warning}")

        all_candidates = ddg_result.candidates + bing_result.candidates + cc_result.candidates
        ddg_count = len(ddg_result.candidates)
        bing_count = len(bing_result.candidates)
        cc_count = len(cc_result.candidates)
        total_candidates_raw = len(all_candidates)

        logger.info(
            f"[Orchestrator] Free-source candidates — DDG: {ddg_count}, "
            f"Bing: {bing_count}, CC: {cc_count}"
        )

        # ── Phase 3: Deduplication of free-source candidates ──
        # Also skip URLs already covered by DataForSEO results
        dfs_source_urls: set[str] = {r.source_url for r in dfs_records}

        seen_dedup: set[str] = set()
        deduped_candidates = []
        for cand in all_candidates:
            key = normalize_for_dedup(cand.url)
            if key not in seen_dedup and cand.url not in dfs_source_urls:
                seen_dedup.add(key)
                deduped_candidates.append(cand)

        logger.info(
            f"[Orchestrator] After deduplication: {len(deduped_candidates)} free-source candidates"
        )

        # Cap verification load (DataForSEO may already fill most slots)
        remaining_slots = max(0, max_backlinks - len(dfs_records))
        deduped_candidates = deduped_candidates[: remaining_slots * 3]

        discovery_stats = DiscoveryStats(
            dataforseo_candidates=len(dfs_records),
            duckduckgo_candidates=ddg_count,
            bing_candidates=bing_count,
            common_crawl_candidates=cc_count,
            total_candidates=total_candidates_raw,
            after_deduplication=len(deduped_candidates),
        )

        # ── Phase 4: Verification of free-source candidates ───
        logger.info(
            f"[Orchestrator] Phase 4 — Verification (verify={verify}, "
            f"free candidates={len(deduped_candidates)}, remaining_slots={remaining_slots})"
        )

        ver_active = 0
        ver_broken = 0
        ver_link_not_found = 0
        ver_fetch_failed = 0
        ver_skipped = 0

        # Start indexed_backlinks with DataForSEO pre-verified records
        indexed_backlinks: list[BacklinkRecord] = list(dfs_records[:max_backlinks])
        seen_indexed: set[str] = {r.source_url for r in indexed_backlinks}

        if not verify:
            ver_skipped = len(deduped_candidates)
            for cand in deduped_candidates[:remaining_slots]:
                if cand.url not in seen_indexed:
                    record = BacklinkRecord(
                        source_url=cand.url,
                        target_url=url,
                        source_domain=extract_domain(cand.url),
                        anchor_text="",
                        link_type="text",
                        rel_attributes=[],
                        link_position="content",
                        first_seen=timestamp,
                        last_seen=timestamp,
                        current_status="unverified",
                        is_follow=True,
                        http_status=0,
                        discovery_source=cand.source,
                        verification_failed_reason="Verification skipped (verify=false)",
                    )
                    indexed_backlinks.append(record)
                    seen_indexed.add(cand.url)
        else:
            semaphore = asyncio.Semaphore(self.settings.max_concurrent_verifications)

            async def _bounded_verify(cand) -> tuple[VerificationResult, str]:
                async with semaphore:
                    result = await verify_backlink(
                        cand.url,
                        domain,
                        timeout=self.settings.http_timeout,
                        verify_ssl=self.settings.verify_ssl,
                    )
                    return result, cand.source

            tasks = [_bounded_verify(c) for c in deduped_candidates]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for item in results:
                if isinstance(item, Exception):
                    ver_fetch_failed += 1
                    continue

                vr, discovery_source = item

                # Tally verification outcome
                if vr.link_found:
                    ver_active += 1
                elif vr.http_status == 0:
                    ver_fetch_failed += 1
                elif vr.http_status >= 400:
                    ver_broken += 1
                else:
                    ver_link_not_found += 1

                if vr.source_url in seen_indexed or len(indexed_backlinks) >= max_backlinks:
                    continue

                if vr.link_found:
                    record = BacklinkRecord(
                        source_url=vr.source_url,
                        target_url=vr.target_url or url,
                        source_domain=extract_domain(vr.source_url),
                        anchor_text=vr.anchor_text,
                        link_type=vr.link_type,
                        rel_attributes=vr.rel_attributes,
                        link_position=vr.link_position,
                        first_seen=timestamp,
                        last_seen=timestamp,
                        current_status=vr.current_status,
                        is_follow=vr.is_follow,
                        http_status=vr.http_status,
                        discovery_source=discovery_source,
                        verification_failed_reason=None,
                    )
                else:
                    record = BacklinkRecord(
                        source_url=vr.source_url,
                        target_url=url,
                        source_domain=extract_domain(vr.source_url),
                        anchor_text="",
                        link_type="text",
                        rel_attributes=[],
                        link_position="content",
                        first_seen=timestamp,
                        last_seen=timestamp,
                        current_status=vr.current_status,
                        is_follow=True,
                        http_status=vr.http_status,
                        discovery_source=discovery_source,
                        verification_failed_reason=vr.failure_reason,
                    )

                indexed_backlinks.append(record)
                seen_indexed.add(vr.source_url)

        verification_stats = VerificationStats(
            verified_active=ver_active,
            verified_broken=ver_broken,
            link_not_found=ver_link_not_found,
            fetch_failed=ver_fetch_failed,
            skipped=ver_skipped,
        )

        # ── Phase 5: Assemble ─────────────────────────────────
        logger.info(
            f"[Orchestrator] Phase 5 — Assembling report "
            f"(indexed: {len(indexed_backlinks)}, DFS: {len(dfs_records)}, "
            f"free active: {ver_active})"
        )

        active_records = [r for r in indexed_backlinks if r.current_status == "active"]
        follow_count = sum(1 for r in active_records if r.is_follow)
        nofollow_count = sum(1 for r in active_records if not r.is_follow)
        text_links = sum(1 for r in active_records if r.link_type == "text")
        image_links = sum(1 for r in active_records if r.link_type == "image")
        unique_domains = len({r.source_domain for r in active_records})

        positions: dict[str, int] = {}
        for r in active_records:
            positions[r.link_position] = positions.get(r.link_position, 0) + 1

        discovery_sources_used = sorted(
            {r.discovery_source for r in indexed_backlinks}
        )

        # Warn when DataForSEO has more than we returned
        if dfs_total_count > max_backlinks:
            warnings.append(
                f"DataForSEO reports {dfs_total_count} total backlinks for {domain}. "
                f"Only {max_backlinks} were returned. Increase max_backlinks for more results."
            )

        if not active_records and not any("DataForSEO" in w for w in warnings):
            warnings.append(
                "No verified active backlinks were found. This may indicate "
                "the domain is new, not widely linked, or discovery sources "
                "returned limited results. Try increasing max_backlinks."
            )

        summary = BacklinkSummary(
            target_domain=domain,
            target_url=url,
            total_indexed=len(indexed_backlinks),
            follow_count=follow_count,
            nofollow_count=nofollow_count,
            text_links=text_links,
            image_links=image_links,
            unique_referring_domains=unique_domains,
            link_positions=positions,
            analysis_timestamp=timestamp,
            discovery_sources_used=discovery_sources_used,
        )

        return BacklinkIndexData(
            summary=summary,
            indexed_backlinks=indexed_backlinks,
            discovery_stats=discovery_stats,
            verification_stats=verification_stats,
            warnings=warnings,
        )
