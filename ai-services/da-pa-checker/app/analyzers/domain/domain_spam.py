import re

from app.analyzers.base import AnalysisContext, SignalResult

SUSPICIOUS_TLDS = frozenset(
    {
        ".xyz",
        ".top",
        ".click",
        ".loan",
        ".bid",
        ".win",
        ".gq",
        ".ml",
        ".cf",
        ".tk",
        ".ga",
        ".buzz",
        ".rest",
        ".icu",
        ".cam",
        ".monster",
    }
)

FREE_HOSTING = frozenset(
    {
        "blogspot.com",
        "wordpress.com",
        "wix.com",
        "weebly.com",
        "tumblr.com",
        "sites.google.com",
        "000webhostapp.com",
        "netlify.app",
    }
)


class DomainSpamAnalyzer:
    """Detects domain-level spam signals.

    Returns a *spam score* (0 = clean, 1 = very spammy).
    The scoring engine applies a **negative weight** so higher spam
    values reduce the final DA.
    """

    name = "domain_spam"
    signal_type = "domain"

    async def analyze(self, context: AnalysisContext) -> SignalResult:
        penalties: dict[str, float] = {}

        penalties["suspicious_tld"] = self._check_tld(context.domain)
        penalties["keyword_stuffed"] = self._check_keyword_stuffing(
            context.domain
        )
        penalties["free_hosting"] = self._check_free_hosting(context.domain)
        penalties["excessive_redirects"] = self._check_redirects(
            context.redirect_chain
        )
        penalties["young_domain"] = self._check_young_domain(
            context.domain_age_days
        )

        spam_score = min(1.0, sum(penalties.values()))

        return SignalResult(
            name=self.name,
            raw_value=spam_score,
            normalized_score=spam_score,
            confidence=1.0,
            details=penalties,
        )

    # ---- individual checks ----

    @staticmethod
    def _check_tld(domain: str) -> float:
        for tld in SUSPICIOUS_TLDS:
            if domain.endswith(tld):
                return 0.4
        return 0.0

    @staticmethod
    def _check_keyword_stuffing(domain: str) -> float:
        score = 0.0
        # Count hyphens (more than 2 is suspicious)
        hyphens = domain.count("-")
        if hyphens > 3:
            score += 0.3
        elif hyphens > 1:
            score += 0.1

        # Very long domain name
        name_part = domain.split(".")[0]
        if len(name_part) > 30:
            score += 0.2
        elif len(name_part) > 20:
            score += 0.1

        # High digit ratio
        digits = sum(c.isdigit() for c in name_part)
        if len(name_part) > 0 and digits / len(name_part) > 0.4:
            score += 0.2

        return min(0.5, score)

    @staticmethod
    def _check_free_hosting(domain: str) -> float:
        for host in FREE_HOSTING:
            if domain.endswith(host) or domain == host:
                return 0.3
        return 0.0

    @staticmethod
    def _check_redirects(redirect_chain: list[str]) -> float:
        if len(redirect_chain) > 3:
            return 0.3
        if len(redirect_chain) > 1:
            return 0.1
        return 0.0

    @staticmethod
    def _check_young_domain(age_days: int | None) -> float:
        if age_days is None:
            return 0.1  # unknown age is slightly suspicious
        if age_days < 90:
            return 0.3
        if age_days < 180:
            return 0.15
        return 0.0
