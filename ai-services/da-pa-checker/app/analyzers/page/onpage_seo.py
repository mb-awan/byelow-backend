import re

from bs4 import BeautifulSoup
from html_parser import parse_html

from app.analyzers.base import AnalysisContext, SignalResult


class OnPageSeoAnalyzer:
    """Comprehensive on-page SEO signal analysis."""

    name = "onpage_seo"
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

        soup = parse_html(context.html)
        scores: dict[str, float] = {}

        scores["title"] = self._score_title(soup)
        scores["meta_description"] = self._score_meta_description(soup)
        scores["headings"] = self._score_headings(soup)
        scores["content"] = self._score_content(soup)
        scores["schema"] = self._score_schema(soup)
        scores["images"] = self._score_images(soup)
        scores["canonical"] = self._score_canonical(soup)
        scores["social_tags"] = self._score_social_tags(soup)

        weights = {
            "title": 0.18,
            "meta_description": 0.12,
            "headings": 0.15,
            "content": 0.20,
            "schema": 0.10,
            "images": 0.08,
            "canonical": 0.07,
            "social_tags": 0.10,
        }
        total = sum(scores[k] * weights[k] for k in weights)

        return SignalResult(
            name=self.name,
            raw_value=total,
            normalized_score=min(1.0, max(0.0, total)),
            confidence=1.0,
            details=scores,
        )

    # ---- sub-checks ----

    @staticmethod
    def _score_title(soup: BeautifulSoup) -> float:
        title = soup.find("title")
        if not title or not title.string:
            return 0.0
        length = len(title.string.strip())
        if 30 <= length <= 60:
            return 1.0
        if 20 <= length <= 70:
            return 0.7
        if length > 0:
            return 0.3
        return 0.0

    @staticmethod
    def _score_meta_description(soup: BeautifulSoup) -> float:
        meta = soup.find("meta", attrs={"name": "description"})
        if not meta:
            return 0.0
        content = meta.get("content", "")
        length = len(content.strip())
        if 120 <= length <= 160:
            return 1.0
        if 80 <= length <= 200:
            return 0.7
        if length > 0:
            return 0.3
        return 0.0

    @staticmethod
    def _score_headings(soup: BeautifulSoup) -> float:
        score = 0.0
        h1_tags = soup.find_all("h1")
        if len(h1_tags) == 1:
            score += 0.5  # exactly one H1 — ideal
        elif len(h1_tags) > 1:
            score += 0.2  # multiple H1s — suboptimal

        h2_tags = soup.find_all("h2")
        if h2_tags:
            score += 0.3

        h3_tags = soup.find_all("h3")
        if h3_tags:
            score += 0.2

        return min(1.0, score)

    @staticmethod
    def _score_content(soup: BeautifulSoup) -> float:
        # Extract visible text
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        words = text.split()
        word_count = len(words)

        if word_count >= 1500:
            return 1.0
        if word_count >= 800:
            return 0.8
        if word_count >= 300:
            return 0.6
        if word_count >= 100:
            return 0.3
        return 0.1

    @staticmethod
    def _score_schema(soup: BeautifulSoup) -> float:
        # JSON-LD
        ld_scripts = soup.find_all("script", attrs={"type": "application/ld+json"})
        if ld_scripts:
            return 1.0
        # Microdata
        if soup.find(attrs={"itemscope": True}):
            return 0.7
        # RDFa
        if soup.find(attrs={"typeof": True}):
            return 0.5
        return 0.0

    @staticmethod
    def _score_images(soup: BeautifulSoup) -> float:
        images = soup.find_all("img")
        if not images:
            return 0.5  # no images is neutral
        with_alt = sum(1 for img in images if img.get("alt", "").strip())
        ratio = with_alt / len(images)
        return ratio

    @staticmethod
    def _score_canonical(soup: BeautifulSoup) -> float:
        canonical = soup.find("link", attrs={"rel": "canonical"})
        if canonical and canonical.get("href", "").strip():
            return 1.0
        return 0.0

    @staticmethod
    def _score_social_tags(soup: BeautifulSoup) -> float:
        score = 0.0
        if soup.find("meta", attrs={"property": re.compile(r"^og:")}):
            score += 0.5
        if soup.find("meta", attrs={"name": re.compile(r"^twitter:")}):
            score += 0.3
        if soup.find("meta", attrs={"property": "og:image"}):
            score += 0.2
        return min(1.0, score)
