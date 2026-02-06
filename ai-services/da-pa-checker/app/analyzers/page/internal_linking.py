import math
import re

from bs4 import BeautifulSoup

from app.analyzers.base import AnalysisContext, SignalResult

POOR_ANCHORS = frozenset(
    {"click here", "here", "read more", "link", "more", "this"}
)


class InternalLinkingAnalyzer:
    """Analyzes the internal link structure visible on the page."""

    name = "internal_linking"
    signal_type = "page"

    async def analyze(self, context: AnalysisContext) -> SignalResult:
        if not context.html:
            return SignalResult(
                name=self.name,
                raw_value=0.0,
                normalized_score=0.0,
                confidence=0.5,
                details={"reason": "no_html"},
            )

        soup = BeautifulSoup(context.html, "lxml")
        scores: dict[str, float] = {}

        internal = context.internal_links
        external = context.external_links

        # --- volume (more internal links = better connected, log scale) ---
        count = len(internal)
        scores["volume"] = min(1.0, math.log1p(count) / math.log1p(50))

        # --- diversity (unique target paths) ---
        unique = len(set(internal))
        scores["diversity"] = min(1.0, math.log1p(unique) / math.log1p(30))

        # --- ratio (internal vs external) ---
        total_links = count + len(external)
        if total_links > 0:
            ratio = count / total_links
            scores["ratio"] = min(1.0, ratio)
        else:
            scores["ratio"] = 0.0

        # --- anchor text quality ---
        scores["anchor_quality"] = self._score_anchor_quality(soup)

        # --- navigation presence ---
        scores["navigation"] = self._score_navigation(soup)

        weights = {
            "volume": 0.25,
            "diversity": 0.25,
            "ratio": 0.15,
            "anchor_quality": 0.20,
            "navigation": 0.15,
        }
        total = sum(scores[k] * weights[k] for k in weights)

        return SignalResult(
            name=self.name,
            raw_value=total,
            normalized_score=min(1.0, max(0.0, total)),
            confidence=0.9,
            details={**scores, "internal_count": count, "unique_targets": unique},
        )

    @staticmethod
    def _score_anchor_quality(soup: BeautifulSoup) -> float:
        anchors = soup.find_all("a", href=True)
        if not anchors:
            return 0.0

        good = 0
        total = 0
        for a in anchors:
            text = a.get_text(strip=True).lower()
            if not text:
                continue
            total += 1
            if text not in POOR_ANCHORS and len(text) > 2:
                good += 1

        return good / max(1, total)

    @staticmethod
    def _score_navigation(soup: BeautifulSoup) -> float:
        score = 0.0
        if soup.find("nav"):
            score += 0.6
        if soup.find("header"):
            score += 0.2
        if soup.find("footer"):
            score += 0.2
        return min(1.0, score)
