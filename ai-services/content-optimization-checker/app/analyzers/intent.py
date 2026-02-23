from __future__ import annotations

import re
from dataclasses import dataclass

from app.analyzers.base import ContentContext

# ── Intent signal patterns ─────────────────────────────────────────────────────

_TRANSACTIONAL = re.compile(
    r"\b(buy|purchase|order|checkout|add to cart|subscribe|download|sign up|"
    r"register|hire|book|apply|get started|try free|free trial|shop|"
    r"get quote|pricing|price|cost per|plan|upgrade|deal|discount|coupon|"
    r"sale|offer|get now|start now)\b",
    re.IGNORECASE,
)

_COMMERCIAL = re.compile(
    r"\b(best|top|review|reviews|compare|vs\.?|versus|alternative|alternatives|"
    r"comparison|rating|ratings|ranked|ranking|pros and cons|recommended|"
    r"recommendation|worth it|tested|should you|which is better|pick|"
    r"list of the best|expert picks)\b",
    re.IGNORECASE,
)

_INFORMATIONAL = re.compile(
    r"\b(how to|how do|how does|what is|what are|what does|why|guide|tutorial|"
    r"tips|learn|understand|definition|explain|introduction|overview|examples|"
    r"complete guide|step by step|beginners|beginner|advanced|explained|"
    r"meaning|everything you need|difference between|types of|list of|"
    r"ways to|ideas for|what happens|when to)\b",
    re.IGNORECASE,
)

_NAVIGATIONAL = re.compile(
    r"\b(login|log in|sign in|dashboard|account|contact us|about us|"
    r"home page|official site|official website|support|help center|"
    r"documentation|docs|portal|my account|settings)\b",
    re.IGNORECASE,
)

_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("informational", _INFORMATIONAL),
    ("commercial", _COMMERCIAL),
    ("transactional", _TRANSACTIONAL),
    ("navigational", _NAVIGATIONAL),
]


@dataclass
class IntentResult:
    primary_intent: str        # informational | commercial | transactional | navigational
    confidence: int            # 0–100
    signals: dict[str, int]    # per-intent raw match counts across all probe texts
    intent_match_score: float  # 0.0–1.0 used in overall scoring


def analyze_intent(ctx: ContentContext) -> IntentResult:
    """Determine the primary search intent using weighted signals."""

    h1_text = next((h["text"] for h in ctx.headings if h["level"] == 1), "")
    # URL path converted to readable tokens
    from urllib.parse import urlparse
    url_path = urlparse(ctx.url).path.replace("-", " ").replace("/", " ")

    # First 300 words of extracted content
    first_300 = " ".join(ctx.content_text.split()[:300])

    scores: dict[str, float] = {k: 0.0 for k, _ in _PATTERNS}
    raw: dict[str, int] = {k: 0 for k, _ in _PATTERNS}

    # URL (weight ×3)
    for name, pat in _PATTERNS:
        c = len(pat.findall(url_path))
        raw[name] += c
        scores[name] += c * 3.0

    # Title + H1 (weight ×2)
    title_h1 = f"{ctx.title} {h1_text}"
    for name, pat in _PATTERNS:
        c = len(pat.findall(title_h1))
        raw[name] += c
        scores[name] += c * 2.0

    # Content first 300 words (weight ×1)
    for name, pat in _PATTERNS:
        c = len(pat.findall(first_300))
        raw[name] += c
        scores[name] += c * 1.0

    # Determine winner
    best_intent = max(scores, key=lambda k: scores[k])
    best_score = scores[best_intent]

    if best_score == 0:
        # No signals detected — default to informational with low confidence
        primary_intent = "informational"
        confidence = 40
    else:
        primary_intent = best_intent
        total = sum(scores.values()) or 1
        # Confidence: how dominant the winner is, boosted by absolute signal strength
        dominance = best_score / total
        strength_bonus = min(20, int(best_score * 5))
        confidence = min(95, int(dominance * 75) + strength_bonus)

    intent_match_score = min(1.0, confidence / 100)

    return IntentResult(
        primary_intent=primary_intent,
        confidence=confidence,
        signals=raw,
        intent_match_score=intent_match_score,
    )
