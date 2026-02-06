import re

from bs4 import BeautifulSoup

from app.analyzers.base import AnalysisContext, SignalResult


class PageSpamAnalyzer:
    """Detects page-level spam / thin content signals.

    Returns 0.0 (clean) to 1.0 (very spammy).
    Weight is negative, so higher spam reduces PA.
    """

    name = "page_spam"
    signal_type = "page"

    async def analyze(self, context: AnalysisContext) -> SignalResult:
        if not context.html:
            return SignalResult(
                name=self.name,
                raw_value=0.3,
                normalized_score=0.3,
                confidence=0.5,
                details={"reason": "no_html"},
            )

        soup = BeautifulSoup(context.html, "lxml")
        penalties: dict[str, float] = {}

        penalties["thin_content"] = self._check_thin_content(soup)
        penalties["hidden_text"] = self._check_hidden_text(soup)
        penalties["keyword_stuffing"] = self._check_keyword_stuffing(soup)
        penalties["excessive_ads"] = self._check_excessive_ads(soup)
        penalties["noindex"] = self._check_noindex(soup)
        penalties["link_farm"] = self._check_link_farm(context, soup)

        spam_score = min(1.0, sum(penalties.values()))

        return SignalResult(
            name=self.name,
            raw_value=spam_score,
            normalized_score=spam_score,
            confidence=1.0,
            details=penalties,
        )

    @staticmethod
    def _check_thin_content(soup: BeautifulSoup) -> float:
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        word_count = len(text.split())
        if word_count < 50:
            return 0.4
        if word_count < 150:
            return 0.2
        if word_count < 300:
            return 0.1
        return 0.0

    @staticmethod
    def _check_hidden_text(soup: BeautifulSoup) -> float:
        hidden_patterns = [
            {"style": re.compile(r"display\s*:\s*none", re.I)},
            {"style": re.compile(r"visibility\s*:\s*hidden", re.I)},
            {"style": re.compile(r"font-size\s*:\s*0", re.I)},
            {"style": re.compile(r"color\s*:\s*(?:white|#fff(?:fff)?|rgba?\(255)", re.I)},
        ]
        count = 0
        for pattern in hidden_patterns:
            matches = soup.find_all(attrs=pattern)
            for el in matches:
                if el.get_text(strip=True):
                    count += 1
        if count >= 3:
            return 0.4
        if count >= 1:
            return 0.2
        return 0.0

    @staticmethod
    def _check_keyword_stuffing(soup: BeautifulSoup) -> float:
        text = soup.get_text(separator=" ", strip=True).lower()
        words = text.split()
        if len(words) < 50:
            return 0.0

        from collections import Counter

        freq = Counter(words)
        # Exclude common stop words
        stop_words = frozenset(
            {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
             "to", "for", "of", "and", "or", "it", "this", "that", "with",
             "as", "by", "from", "be", "not", "but", "have", "has", "had",
             "do", "does", "did", "will", "would", "can", "could", "should",
             "may", "might", "shall", "i", "you", "he", "she", "we", "they"}
        )

        total = len(words)
        for word, count in freq.most_common(10):
            if word in stop_words or len(word) < 3:
                continue
            density = count / total
            if density > 0.05:
                return 0.3
            if density > 0.03:
                return 0.15

        return 0.0

    @staticmethod
    def _check_excessive_ads(soup: BeautifulSoup) -> float:
        iframes = soup.find_all("iframe")
        ad_divs = soup.find_all(
            attrs={"class": re.compile(r"ad[s\-_]|sponsor|banner", re.I)}
        )
        ad_count = len(iframes) + len(ad_divs)
        if ad_count > 10:
            return 0.3
        if ad_count > 5:
            return 0.15
        return 0.0

    @staticmethod
    def _check_noindex(soup: BeautifulSoup) -> float:
        meta = soup.find("meta", attrs={"name": "robots"})
        if meta:
            content = (meta.get("content") or "").lower()
            if "noindex" in content:
                return 0.3
        return 0.0

    @staticmethod
    def _check_link_farm(ctx: AnalysisContext, soup: BeautifulSoup) -> float:
        for tag in soup(["script", "style"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        word_count = len(text.split())
        ext_count = len(ctx.external_links)

        if word_count < 100 and ext_count > 20:
            return 0.4
        if word_count > 0 and ext_count / max(1, word_count) > 0.1:
            return 0.2
        return 0.0
