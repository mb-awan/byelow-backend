from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class BacklinkData:
    total_backlinks: int
    referring_domains: int
    domain_authority_external: float | None = None


class BacklinkProvider(Protocol):
    """Pluggable interface for external backlink data sources."""

    async def get_domain_backlinks(self, domain: str) -> BacklinkData | None: ...

    async def get_page_backlinks(self, url: str) -> BacklinkData | None: ...


class HeuristicBacklinkProvider:
    """Default provider — returns None, forcing heuristic estimation."""

    async def get_domain_backlinks(self, domain: str) -> BacklinkData | None:
        return None

    async def get_page_backlinks(self, url: str) -> BacklinkData | None:
        return None
