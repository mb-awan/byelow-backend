from __future__ import annotations

from app.analyzers.eeat import EEATResult
from app.analyzers.intent import IntentResult
from app.analyzers.keyword import KeywordResult
from app.analyzers.structure import StructureResult


def compute_seo_content_score(
    intent: IntentResult,
    keywords: KeywordResult,
    structure: StructureResult,
    eeat: EEATResult,
) -> float:
    """Compute the overall SEO Content Score (0–100).

    Weights:
      Intent match         25 %
      Keyword quality      25 %
      Content structure    25 %
      E-E-A-T signals      15 %
      Semantic coverage    10 %
    """
    intent_score    = intent.intent_match_score           * 25
    keyword_score   = keywords.keyword_score              * 25
    structure_score = structure.structure_score           * 25
    eeat_score      = eeat.eeat_score                     * 15

    # Semantic coverage: fewer missing terms = higher score
    missing_cap = 10
    missing_count = min(len(keywords.missing_semantic_terms), missing_cap)
    semantic_score = ((missing_cap - missing_count) / missing_cap) * 10

    total = intent_score + keyword_score + structure_score + eeat_score + semantic_score
    return round(min(100.0, max(0.0, total)), 1)
