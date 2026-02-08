import asyncio
from urllib.parse import urlparse

from loguru import logger

from app.analyzers.base import AnalysisContext
from app.collectors.dns_collector import DnsCollector
from app.collectors.http_collector import HttpCollector
from app.collectors.ssl_collector import SslCollector
from app.collectors.whois_collector import WhoisCollector
from app.config import Settings
from app.core.url_utils import parse_url
from app.models.responses import AuthorityScore, BacklinksInfo
from app.services.backlink_provider import estimate_backlinks_from_score

# CDN headers that indicate high-traffic infrastructure
CDN_HEADERS = frozenset(
    {
        "cf-ray",
        "x-cache",
        "x-cdn",
        "x-served-by",
        "x-amz-cf-id",
        "x-fastly-request-id",
        "x-akamai-transformed",
    }
)

CDN_SERVER_NAMES = ("cloudflare", "akamai", "fastly", "varnish", "cloudfront")

# Suspicious TLDs commonly used by spam sites
SUSPICIOUS_TLDS = frozenset(
    {
        ".xyz", ".top", ".click", ".loan", ".bid", ".win",
        ".gq", ".ml", ".cf", ".tk", ".ga", ".buzz",
        ".rest", ".icu", ".cam", ".monster",
    }
)

FREE_HOSTING = frozenset(
    {
        "blogspot.com", "wordpress.com", "wix.com", "weebly.com",
        "tumblr.com", "sites.google.com", "000webhostapp.com", "netlify.app",
    }
)


class AnalysisOrchestrator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.http = HttpCollector(settings)
        self.dns = DnsCollector()
        self.whois = WhoisCollector()
        self.ssl = SslCollector()

    async def analyze(self, url: str) -> AuthorityScore:
        scheme, domain, path = parse_url(url)
        normalized_url = f"{scheme}://{domain}{path}"
        ctx = AnalysisContext(url=normalized_url, domain=domain, scheme=scheme)

        # Phase 1 — collect data from all sources concurrently
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

        # Phase 2 — compute web presence score from collected signals
        presence = self._compute_presence_score(ctx)
        logger.info(f"Presence score for {domain}: {presence:.3f}")

        # Phase 3 — derive DA, PA, spam, and estimated backlink counts
        da = round(min(100.0, max(0.0, presence * 100)))
        pa = self._calculate_pa(da, presence)
        spam = self._calculate_spam_score(ctx)
        estimates = estimate_backlinks_from_score(presence)

        logger.info(
            f"Results for {domain} — DA={da}, PA={pa}, spam={spam}, "
            f"est_rd={estimates.estimated_referring_domains}"
        )

        return AuthorityScore(
            domain_authority=float(da),
            page_authority=float(pa),
            spam_score=spam,
            referring_domains=estimates.estimated_referring_domains,
            backlinks=BacklinksInfo(
                total=estimates.estimated_backlinks_total,
                dofollow=estimates.estimated_dofollow,
                nofollow=estimates.estimated_nofollow,
            ),
            domain=domain,
            url=normalized_url,
        )

    # ------------------------------------------------------------------
    # Presence score: 0.0–1.0 from observable signals
    # ------------------------------------------------------------------

    def _compute_presence_score(self, ctx: AnalysisContext) -> float:
        s = 0.0
        s += self._score_sitemap(ctx)       # 0–0.30
        s += self._score_domain_age(ctx)    # 0–0.25
        s += self._score_infrastructure(ctx)  # 0–0.20
        s += self._score_content(ctx)       # 0–0.13
        s += self._score_external_links(ctx)  # 0–0.12
        return min(1.0, max(0.0, s))

    @staticmethod
    def _score_sitemap(ctx: AnalysisContext) -> float:
        if not ctx.sitemap_xml:
            return 0.0
        text = ctx.sitemap_xml.lower()
        loc_count = text.count("<loc>")
        is_index = "<sitemapindex" in text
        # Sitemap index entries each represent thousands of URLs
        if is_index:
            loc_count = loc_count * 5000
        if loc_count >= 50000:
            return 0.30
        if loc_count >= 5000:
            return 0.25
        if loc_count >= 1000:
            return 0.20
        if loc_count >= 500:
            return 0.16
        if loc_count >= 100:
            return 0.12
        if loc_count >= 50:
            return 0.08
        if loc_count >= 10:
            return 0.05
        if loc_count > 0:
            return 0.02
        return 0.0

    @staticmethod
    def _score_domain_age(ctx: AnalysisContext) -> float:
        if ctx.domain_age_days is None:
            return 0.0
        age_years = ctx.domain_age_days / 365.25
        if age_years >= 20:
            return 0.25
        if age_years >= 15:
            return 0.22
        if age_years >= 10:
            return 0.18
        if age_years >= 7:
            return 0.14
        if age_years >= 5:
            return 0.10
        if age_years >= 3:
            return 0.07
        if age_years >= 1:
            return 0.04
        if age_years >= 0.5:
            return 0.01
        return 0.0

    @staticmethod
    def _score_infrastructure(ctx: AnalysisContext) -> float:
        score = 0.0
        # CDN detection
        headers_lower = {k.lower(): v for k, v in ctx.headers.items()}
        cdn_matches = sum(1 for h in CDN_HEADERS if h in headers_lower)
        server = headers_lower.get("server", "").lower()
        has_cdn = cdn_matches >= 1 or any(n in server for n in CDN_SERVER_NAMES)
        if has_cdn:
            score += 0.08
        # SSL
        if ctx.ssl_valid:
            score += 0.02
        # DNS maturity
        if ctx.has_mx:
            score += 0.04
        if ctx.has_spf:
            score += 0.03
        if ctx.has_dmarc:
            score += 0.03
        return min(0.20, score)

    @staticmethod
    def _score_content(ctx: AnalysisContext) -> float:
        if not ctx.html:
            return 0.0
        html_lower = ctx.html.lower()
        score = 0.0
        if "application/ld+json" in html_lower:
            score += 0.04
        if 'property="og:' in html_lower or "property='og:" in html_lower:
            score += 0.03
        if 'name="twitter:' in html_lower or "name='twitter:" in html_lower:
            score += 0.02
        # robots.txt complexity
        if ctx.robots_txt:
            lines = ctx.robots_txt.strip().splitlines()
            if len(lines) > 10:
                score += 0.02
            elif len(lines) > 3:
                score += 0.01
        # Good HTML structure (h1 + title + meta description)
        has_title = "<title" in html_lower and "</title>" in html_lower
        has_h1 = "<h1" in html_lower
        has_meta_desc = 'name="description"' in html_lower or "name='description'" in html_lower
        if has_title and has_h1 and has_meta_desc:
            score += 0.02
        return min(0.13, score)

    @staticmethod
    def _score_external_links(ctx: AnalysisContext) -> float:
        unique_domains = set()
        for link in ctx.external_links:
            parsed = urlparse(link)
            host = (parsed.hostname or "").lower().removeprefix("www.")
            if host:
                unique_domains.add(host)
        count = len(unique_domains)
        if count >= 50:
            return 0.12
        if count >= 30:
            return 0.09
        if count >= 15:
            return 0.07
        if count >= 8:
            return 0.05
        if count >= 3:
            return 0.03
        if count >= 1:
            return 0.01
        return 0.0

    # ------------------------------------------------------------------
    # PA: slightly below DA
    # ------------------------------------------------------------------

    @staticmethod
    def _calculate_pa(da: float, presence_score: float) -> float:
        if da <= 0:
            return 0.0
        # PA factor decreases slightly for larger sites
        rd_log = presence_score * 7.699  # log10(50M) ≈ 7.699
        factor = max(0.85, 0.97 - rd_log * 0.003)
        pa = da * factor
        return round(min(100.0, max(0.0, pa)), 1)

    # ------------------------------------------------------------------
    # Spam score: 0–100 from observable domain/page signals
    # ------------------------------------------------------------------

    @staticmethod
    def _calculate_spam_score(ctx: AnalysisContext) -> float:
        score = 0.0

        # Suspicious TLD
        for tld in SUSPICIOUS_TLDS:
            if ctx.domain.endswith(tld):
                score += 25
                break

        # Free hosting
        for host in FREE_HOSTING:
            if ctx.domain.endswith(host) or ctx.domain == host:
                score += 15
                break

        # Keyword-stuffed domain name
        name_part = ctx.domain.split(".")[0]
        hyphens = name_part.count("-")
        if hyphens > 3:
            score += 15
        elif hyphens > 1:
            score += 5
        if len(name_part) > 30:
            score += 10
        digits = sum(c.isdigit() for c in name_part)
        if len(name_part) > 0 and digits / len(name_part) > 0.4:
            score += 10

        # Excessive redirects
        if len(ctx.redirect_chain) > 3:
            score += 15
        elif len(ctx.redirect_chain) > 1:
            score += 5

        # Very young domain
        if ctx.domain_age_days is not None:
            if ctx.domain_age_days < 90:
                score += 15
            elif ctx.domain_age_days < 180:
                score += 8

        # No SSL
        if ctx.ssl_valid is False:
            score += 10

        return min(100.0, max(0.0, score))
