import asyncio

from loguru import logger

from app.analyzers.base import AnalysisContext, SignalResult
from app.analyzers.domain.backlink_estimator import DomainBacklinkEstimator
from app.analyzers.domain.domain_spam import DomainSpamAnalyzer
from app.analyzers.domain.domain_trust import DomainTrustAnalyzer
from app.analyzers.domain.link_diversity import LinkDiversityAnalyzer
from app.analyzers.page.internal_linking import InternalLinkingAnalyzer
from app.analyzers.page.onpage_seo import OnPageSeoAnalyzer
from app.analyzers.page.page_backlinks import PageBacklinkAnalyzer
from app.analyzers.page.page_spam import PageSpamAnalyzer
from app.collectors.dns_collector import DnsCollector
from app.collectors.http_collector import HttpCollector
from app.collectors.ssl_collector import SslCollector
from app.collectors.whois_collector import WhoisCollector
from app.config import Settings
from app.core.scoring import ScoringEngine
from app.core.url_utils import parse_url
from app.models.responses import AuthorityScore


class AnalysisOrchestrator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.scoring = ScoringEngine(settings)

        # Collectors
        self.http = HttpCollector(settings)
        self.dns = DnsCollector()
        self.whois = WhoisCollector()
        self.ssl = SslCollector()

        # Domain-level analyzers (DA)
        self.da_analyzers = [
            DomainBacklinkEstimator(),
            DomainTrustAnalyzer(),
            LinkDiversityAnalyzer(),
            DomainSpamAnalyzer(),
        ]

        # Page-level analyzers (PA)
        self.pa_analyzers = [
            PageBacklinkAnalyzer(),
            OnPageSeoAnalyzer(),
            InternalLinkingAnalyzer(),
            PageSpamAnalyzer(),
        ]

    async def analyze(self, url: str) -> AuthorityScore:
        scheme, domain, path = parse_url(url)

        # Reconstruct the normalized URL
        normalized_url = f"{scheme}://{domain}{path}"
        ctx = AnalysisContext(url=normalized_url, domain=domain, scheme=scheme)

        # Phase 1 — concurrent data collection
        logger.info(f"Collecting data for {normalized_url}")
        results = await asyncio.gather(
            self.http.collect(ctx),
            self.dns.collect(ctx),
            self.whois.collect(ctx),
            self.ssl.collect(ctx),
            return_exceptions=True,
        )
        for r in results:
            if isinstance(r, Exception):
                logger.warning(f"Collector failed: {r}")

        # Phase 2 — concurrent signal analysis
        logger.info(f"Analyzing signals for {normalized_url}")
        da_raw = await asyncio.gather(
            *[a.analyze(ctx) for a in self.da_analyzers],
            return_exceptions=True,
        )
        pa_raw = await asyncio.gather(
            *[a.analyze(ctx) for a in self.pa_analyzers],
            return_exceptions=True,
        )

        da_signals = self._filter_signals(da_raw, "DA")
        pa_signals = self._filter_signals(pa_raw, "PA")

        # Phase 3 — scoring
        da_weights = {
            "domain_backlinks": self.settings.da_weight_backlinks,
            "domain_trust": self.settings.da_weight_domain_age,
            "link_diversity": self.settings.da_weight_link_diversity,
            "domain_spam": self.settings.da_weight_domain_spam,
        }

        pa_weights = {
            "page_backlinks": self.settings.pa_weight_page_backlinks,
            "onpage_seo": self.settings.pa_weight_onpage_seo,
            "internal_linking": self.settings.pa_weight_internal_linking,
            "page_spam": self.settings.pa_weight_page_spam,
        }

        da_score = self.scoring.compute(da_signals, da_weights)
        pa_score = self.scoring.compute(pa_signals, pa_weights)

        return AuthorityScore(
            domain_authority=da_score,
            page_authority=pa_score,
            domain=domain,
            url=normalized_url,
        )

    @staticmethod
    def _filter_signals(
        raw: list, label: str
    ) -> list[SignalResult]:
        signals: list[SignalResult] = []
        for item in raw:
            if isinstance(item, SignalResult):
                signals.append(item)
            elif isinstance(item, Exception):
                logger.warning(f"{label} analyzer failed: {item}")
        return signals
