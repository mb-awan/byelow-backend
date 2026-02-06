import math

from app.analyzers.base import AnalysisContext, SignalResult


class DomainTrustAnalyzer:
    name = "domain_trust"
    signal_type = "domain"

    async def analyze(self, context: AnalysisContext) -> SignalResult:
        scores: dict[str, float] = {}
        confidence = 1.0

        # --- Domain age (0–1) ---
        if context.domain_age_days is not None:
            age_years = context.domain_age_days / 365.25
            # log curve: 0-2yr steep growth, 2-10yr gradual, 10+ plateau
            scores["domain_age"] = min(1.0, math.log1p(age_years) / math.log1p(15))
        else:
            scores["domain_age"] = 0.3  # uncertain default
            confidence = min(confidence, 0.5)

        # --- SSL trust (0–1) ---
        if context.ssl_valid is True:
            ssl_score = 0.7
            if context.ssl_days_remaining is not None:
                if context.ssl_days_remaining > 90:
                    ssl_score = 1.0
                elif context.ssl_days_remaining > 30:
                    ssl_score = 0.8
                # ≤30 days = 0.7 (valid but expiring soon)
            scores["ssl"] = ssl_score
        elif context.ssl_valid is False:
            scores["ssl"] = 0.0
        else:
            scores["ssl"] = 0.3
            confidence = min(confidence, 0.7)

        # --- DNS quality (0–1) ---
        dns_score = 0.0
        if context.has_mx:
            dns_score += 0.35
        if context.has_spf:
            dns_score += 0.30
        if context.has_dmarc:
            dns_score += 0.35
        scores["dns"] = dns_score

        # Weighted composite
        weights = {"domain_age": 0.50, "ssl": 0.20, "dns": 0.30}
        total = sum(scores[k] * weights[k] for k in weights)

        return SignalResult(
            name=self.name,
            raw_value=total,
            normalized_score=min(1.0, max(0.0, total)),
            confidence=confidence,
            details=scores,
        )
