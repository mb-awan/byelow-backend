import math
import re

from bs4 import BeautifulSoup
from html_parser import parse_html

from app.analyzers.base import AnalysisContext, SignalResult


class PageBacklinkAnalyzer:
    """Heuristic estimation of page-level backlink strength.

    Uses proxy signals since real backlink data requires external APIs.
    """

    name = "page_backlinks"
    signal_type = "page"

    async def analyze(self, context: AnalysisContext) -> SignalResult:
        scores: dict[str, float] = {}

        scores["sitemap_presence"] = self._check_sitemap_presence(context)
        scores["canonical"] = self._check_canonical(context)
        scores["social_meta"] = self._check_social_meta(context)
        scores["url_depth"] = self._score_url_depth(context)
        scores["response_quality"] = self._score_response_quality(context)

        weights = {
            "sitemap_presence": 0.20,
            "canonical": 0.20,
            "social_meta": 0.20,
            "url_depth": 0.20,
            "response_quality": 0.20,
        }
        total = sum(scores[k] * weights[k] for k in weights)

        return SignalResult(
            name=self.name,
            raw_value=total,
            normalized_score=min(1.0, max(0.0, total)),
            confidence=0.5,  # heuristic
            details=scores,
        )

    @staticmethod
    def _check_sitemap_presence(ctx: AnalysisContext) -> float:
        if not ctx.sitemap_xml:
            return 0.2
        # Check if the specific URL appears in the sitemap
        if ctx.url in ctx.sitemap_xml:
            return 1.0
        # Check if the path appears
        from urllib.parse import urlparse

        path = urlparse(ctx.url).path
        if path and path != "/" and path in ctx.sitemap_xml:
            return 0.8
        return 0.3  # sitemap exists but page not in it

    @staticmethod
    def _check_canonical(ctx: AnalysisContext) -> float:
        if not ctx.html:
            return 0.0
        soup = parse_html(ctx.html)
        canonical = soup.find("link", attrs={"rel": "canonical"})
        if canonical:
            href = canonical.get("href", "")
            if href:
                return 1.0
        return 0.0

    @staticmethod
    def _check_social_meta(ctx: AnalysisContext) -> float:
        if not ctx.html:
            return 0.0
        html_lower = ctx.html.lower()
        score = 0.0
        if 'property="og:url"' in html_lower or "property='og:url'" in html_lower:
            score += 0.4
        if 'name="twitter:card"' in html_lower or "name='twitter:card'" in html_lower:
            score += 0.3
        if 'property="og:image"' in html_lower or "property='og:image'" in html_lower:
            score += 0.3
        return min(1.0, score)

    @staticmethod
    def _score_url_depth(ctx: AnalysisContext) -> float:
        from urllib.parse import urlparse

        path = urlparse(ctx.url).path.strip("/")
        if not path:
            return 1.0  # homepage — highest backlink potential
        depth = path.count("/") + 1
        if depth == 1:
            return 0.8
        if depth == 2:
            return 0.6
        if depth == 3:
            return 0.4
        return 0.2

    @staticmethod
    def _score_response_quality(ctx: AnalysisContext) -> float:
        score = 0.0
        if ctx.status_code == 200:
            score += 0.5
        elif ctx.status_code and 200 <= ctx.status_code < 300:
            score += 0.4

        if ctx.response_time is not None:
            if ctx.response_time < 1.0:
                score += 0.5
            elif ctx.response_time < 3.0:
                score += 0.3
            else:
                score += 0.1

        return min(1.0, score)
