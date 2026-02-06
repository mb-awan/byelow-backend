from urllib.parse import urlparse

from app.analyzers.base import AnalysisContext, SignalResult


class LinkDiversityAnalyzer:
    """Estimates domain-level link diversity from the page's external links.

    Measures how diverse the outbound link profile is as a proxy for the
    domain's overall linking patterns.
    """

    name = "link_diversity"
    signal_type = "domain"

    async def analyze(self, context: AnalysisContext) -> SignalResult:
        external = context.external_links
        if not external:
            return SignalResult(
                name=self.name,
                raw_value=0.0,
                normalized_score=0.1,
                confidence=0.5,
                details={"reason": "no_external_links"},
            )

        domains = set()
        tlds = set()
        for link in external:
            parsed = urlparse(link)
            host = (parsed.hostname or "").lower().removeprefix("www.")
            if host:
                domains.add(host)
                parts = host.rsplit(".", 1)
                if len(parts) == 2:
                    tlds.add(parts[1])

        unique_domains = len(domains)
        unique_tlds = len(tlds)
        total_links = len(external)

        # Domain diversity ratio (unique domains / total links, capped)
        domain_ratio = min(1.0, unique_domains / max(1, total_links))

        # TLD diversity (more TLDs = broader reach)
        # 5+ unique TLDs earns maximum here
        tld_score = min(1.0, unique_tlds / 5)

        # Volume score (more unique referring domains = higher authority)
        # log scale: 20+ unique domains → 1.0
        import math

        volume_score = min(1.0, math.log1p(unique_domains) / math.log1p(20))

        weights = {"domain_ratio": 0.30, "tld_score": 0.30, "volume": 0.40}
        scores = {
            "domain_ratio": domain_ratio,
            "tld_score": tld_score,
            "volume": volume_score,
        }
        total = sum(scores[k] * weights[k] for k in weights)

        return SignalResult(
            name=self.name,
            raw_value=total,
            normalized_score=min(1.0, max(0.0, total)),
            confidence=0.7,  # proxy signal, not direct measurement
            details={
                "unique_domains": unique_domains,
                "unique_tlds": unique_tlds,
                "total_external_links": total_links,
                **scores,
            },
        )
