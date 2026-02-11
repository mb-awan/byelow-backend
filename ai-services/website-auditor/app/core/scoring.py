from __future__ import annotations

from app.auditors.base import AuditResult, Category


def compute_category_score(result: AuditResult) -> float:
    """Compute a category score as (earned / total) * 100.

    Each check contributes weighted points. The score is the ratio of
    earned points to total possible points, expressed as a percentage.
    """
    return result.score


def compute_overall_score(category_scores: dict[Category, float]) -> float:
    """Compute an overall weighted average score across all categories.

    Category weights:
      - Technical:     25%
      - SEO:           25%
      - Performance:   20%
      - Security:      20%
      - Accessibility: 10%
    """
    weights = {
        Category.TECHNICAL: 0.25,
        Category.SEO: 0.25,
        Category.PERFORMANCE: 0.20,
        Category.SECURITY: 0.20,
        Category.ACCESSIBILITY: 0.10,
    }

    weighted_sum = 0.0
    total_weight = 0.0

    for cat, score in category_scores.items():
        w = weights.get(cat, 0.0)
        weighted_sum += score * w
        total_weight += w

    if total_weight == 0:
        return 0.0

    return round(weighted_sum / total_weight, 1)


def score_label(score: float) -> str:
    """Return a human-readable label for a score."""
    if score >= 90:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 50:
        return "Needs Improvement"
    if score >= 30:
        return "Poor"
    return "Critical"
