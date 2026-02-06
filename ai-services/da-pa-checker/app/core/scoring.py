import math

from app.analyzers.base import SignalResult
from app.config import Settings


class ScoringEngine:
    """Computes a 0–100 authority score from weighted signal results.

    Steps:
    1. Weighted sum (negative weights handle spam penalties automatically)
    2. Normalize to 0–1 range
    3. Logarithmic transformation (Moz-style curve)
    4. Clamp to 0–100
    """

    def __init__(self, settings: Settings) -> None:
        self.log_scale_factor = settings.log_scale_factor

    def compute(
        self,
        signals: list[SignalResult],
        weights: dict[str, float],
    ) -> float:
        if not signals:
            return 0.0

        weighted_sum = 0.0
        total_positive_weight = 0.0

        for signal in signals:
            weight = weights.get(signal.name, 0.0)
            contribution = signal.normalized_score * weight * signal.confidence
            weighted_sum += contribution
            if weight > 0:
                total_positive_weight += weight

        # Normalize to 0–1 range based on maximum possible positive score
        if total_positive_weight > 0:
            raw = weighted_sum / total_positive_weight
        else:
            raw = 0.0

        raw = max(0.0, min(1.0, raw))

        # Logarithmic curve: easy early gains, exponentially harder at top
        # f(0)=0, f(1)=100, concave shape
        sf = self.log_scale_factor
        if raw <= 0:
            final = 0.0
        else:
            final = 100.0 * math.log1p(raw * sf) / math.log1p(sf)

        return round(max(0.0, min(100.0, final)), 1)
