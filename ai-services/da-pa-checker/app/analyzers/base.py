from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


@dataclass
class SignalResult:
    """Result produced by a single signal analyzer."""

    name: str
    raw_value: float
    normalized_score: float  # 0.0 – 1.0
    confidence: float = 1.0  # 0.0 – 1.0
    details: dict = field(default_factory=dict)


@dataclass
class AnalysisContext:
    """Shared data bag populated by collectors, consumed by analyzers."""

    url: str
    domain: str
    scheme: str

    # HTTP collector
    html: str | None = None
    status_code: int | None = None
    headers: dict = field(default_factory=dict)
    redirect_chain: list[str] = field(default_factory=list)
    response_time: float | None = None

    # DNS collector
    dns_records: dict = field(default_factory=dict)
    has_mx: bool = False
    has_spf: bool = False
    has_dmarc: bool = False

    # WHOIS collector
    domain_age_days: int | None = None
    registrar: str | None = None
    whois_raw: dict = field(default_factory=dict)

    # SSL collector
    ssl_valid: bool | None = None
    ssl_issuer: str | None = None
    ssl_days_remaining: int | None = None

    # Additional HTTP fetches
    robots_txt: str | None = None
    sitemap_xml: str | None = None

    # Links extracted from page HTML
    internal_links: list[str] = field(default_factory=list)
    external_links: list[str] = field(default_factory=list)


@runtime_checkable
class SignalAnalyzer(Protocol):
    """Contract that every signal analyzer must satisfy."""

    name: str
    signal_type: str  # "domain" or "page"

    async def analyze(self, context: AnalysisContext) -> SignalResult: ...
