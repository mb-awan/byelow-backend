import math
from urllib.parse import urlparse

from app.analyzers.base import AnalysisContext, SignalResult

# CDN / high-traffic infrastructure headers
CDN_HEADERS = frozenset(
    {
        "cf-ray",
        "x-cache",
        "x-cdn",
        "x-served-by",
        "x-amz-cf-id",
        "x-fastly-request-id",
        "x-akamai-transformed",
        "via",
    }
)


class DomainBacklinkEstimator:
    """Heuristic estimation of domain-wide backlink profile quality.

    Uses proxy signals that correlate with high backlink counts when
    no external backlink API is available.
    """

    name = "domain_backlinks"
    signal_type = "domain"

    async def analyze(self, context: AnalysisContext) -> SignalResult:
        scores: dict[str, float] = {}

        scores["sitemap"] = self._score_sitemap(context)
        scores["robots"] = self._score_robots(context)
        scores["cdn"] = self._score_cdn(context)
        scores["structured_data"] = self._score_structured_data(context)
        scores["external_link_volume"] = self._score_external_links(context)
        scores["referring_domains_est"] = self._estimate_referring_domains(
            context
        )

        weights = {
            "sitemap": 0.15,
            "robots": 0.10,
            "cdn": 0.15,
            "structured_data": 0.15,
            "external_link_volume": 0.20,
            "referring_domains_est": 0.25,
        }

        total = sum(scores[k] * weights[k] for k in weights)

        return SignalResult(
            name=self.name,
            raw_value=total,
            normalized_score=min(1.0, max(0.0, total)),
            confidence=0.5,  # heuristic — low confidence
            details=scores,
        )

    @staticmethod
    def _score_sitemap(ctx: AnalysisContext) -> float:
        if not ctx.sitemap_xml:
            return 0.0
        # Larger sitemaps indicate more indexed pages → more backlinks
        url_count = ctx.sitemap_xml.lower().count("<loc>")
        if url_count > 500:
            return 1.0
        if url_count > 100:
            return 0.8
        if url_count > 10:
            return 0.5
        return 0.3

    @staticmethod
    def _score_robots(ctx: AnalysisContext) -> float:
        if not ctx.robots_txt:
            return 0.0
        lines = ctx.robots_txt.strip().splitlines()
        if len(lines) > 10:
            return 0.8  # sophisticated robots.txt
        if len(lines) > 3:
            return 0.5
        return 0.3

    @staticmethod
    def _score_cdn(ctx: AnalysisContext) -> float:
        headers_lower = {k.lower(): v for k, v in ctx.headers.items()}
        cdn_matches = sum(1 for h in CDN_HEADERS if h in headers_lower)
        if cdn_matches >= 2:
            return 1.0
        if cdn_matches == 1:
            return 0.6
        # Check server header for known CDN names
        server = headers_lower.get("server", "").lower()
        if any(cdn in server for cdn in ("cloudflare", "nginx", "varnish")):
            return 0.4
        return 0.0

    @staticmethod
    def _score_structured_data(ctx: AnalysisContext) -> float:
        if not ctx.html:
            return 0.0
        html_lower = ctx.html.lower()
        score = 0.0
        if "application/ld+json" in html_lower:
            score += 0.5
        if 'property="og:' in html_lower or "property='og:" in html_lower:
            score += 0.3
        if 'name="twitter:' in html_lower or "name='twitter:" in html_lower:
            score += 0.2
        return min(1.0, score)

    @staticmethod
    def _score_external_links(ctx: AnalysisContext) -> float:
        count = len(ctx.external_links)
        if count == 0:
            return 0.1
        return min(1.0, math.log1p(count) / math.log1p(50))

    @staticmethod
    def _estimate_referring_domains(ctx: AnalysisContext) -> float:
        """Rough estimation of inbound referring domains based on proxy signals."""
        indicators = 0.0

        # Sites with structured data, sitemaps and CDN tend to have more backlinks
        if ctx.sitemap_xml:
            indicators += 0.25
        if ctx.robots_txt:
            indicators += 0.15
        if ctx.ssl_valid:
            indicators += 0.10

        # Domain age correlates with backlink accumulation
        if ctx.domain_age_days is not None:
            age_years = ctx.domain_age_days / 365.25
            indicators += min(0.30, age_years / 10 * 0.30)

        # Diverse external linking suggests the site participates in the web graph
        unique_ext = len(
            {
                urlparse(l).hostname
                for l in ctx.external_links
                if urlparse(l).hostname
            }
        )
        indicators += min(0.20, unique_ext / 20 * 0.20)

        return min(1.0, indicators)
