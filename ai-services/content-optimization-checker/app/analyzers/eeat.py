from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.analyzers.base import ContentContext

# ── Patterns ───────────────────────────────────────────────────────────────────

_AUTHOR_RE = re.compile(
    r"(written by|by [A-Z][a-z]+ [A-Z][a-z]+|author:|authored by|"
    r"contributor:|reviewed by|fact.checked by|expert review)",
    re.IGNORECASE,
)

_SOURCE_RE = re.compile(
    r"(according to|study shows|research shows|as reported by|cited|"
    r"source:|references?:|survey|report by|found that|[0-9]+\s*%|"
    r"statistic|data shows|evidence suggests)",
    re.IGNORECASE,
)

_DATE_RE = re.compile(
    r"(published|updated|last modified|last updated|posted on|date:)\s*"
    r"(on\s+)?"
    r"(\d{1,2}[\s/\-]\w+[\s/\-]\d{2,4}|"
    r"[A-Za-z]+ \d{1,2},?\s+\d{4}|"
    r"\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)

_TRUST_HREFS = re.compile(
    r"/(about|contact|privacy|terms|disclaimer|faq|careers|team)", re.IGNORECASE
)

_TRUST_TEXT = re.compile(
    r"\b(about us|contact|privacy policy|terms of service|disclaimer|our team)\b",
    re.IGNORECASE,
)


@dataclass
class EEATResult:
    has_author_signal: bool
    has_schema_markup: bool
    has_sources_citations: bool
    has_date_signals: bool
    has_trust_signals: bool
    signals_found: list[str] = field(default_factory=list)
    signals_missing: list[str] = field(default_factory=list)
    eeat_score: float = 0.0   # 0.0–1.0


def analyze_eeat(ctx: ContentContext) -> EEATResult:
    """Evaluate Experience, Expertise, Authority, and Trust signals."""

    found: list[str] = []
    missing: list[str] = []

    # ── Author attribution ─────────────────────────────────────────────
    has_author = bool(_AUTHOR_RE.search(ctx.content_text))
    if has_author:
        found.append("Author attribution present (byline or 'Written by')")
    else:
        missing.append(
            "No author attribution found — add a byline or author bio to signal expertise"
        )

    # ── Schema markup ──────────────────────────────────────────────────
    has_schema = ctx.has_schema_markup
    if has_schema:
        found.append("Structured data (JSON-LD schema markup) detected")
    else:
        missing.append(
            "No JSON-LD schema markup detected — implement Article, Person, or "
            "Organization schema to enhance search appearance and trust signals"
        )

    # ── Data, statistics, citations ───────────────────────────────────
    has_sources = bool(_SOURCE_RE.search(ctx.content_text))
    if has_sources:
        found.append("Statistics or external citations detected — improves credibility")
    else:
        missing.append(
            "No data or citations found — add research-backed statistics or "
            "expert quotes to improve E-E-A-T credibility"
        )

    # ── Date signals ───────────────────────────────────────────────────
    has_dates = bool(_DATE_RE.search(ctx.content_text)) or bool(
        _DATE_RE.search(ctx.title)
    )
    if has_dates:
        found.append("Publish or update date signals present")
    else:
        missing.append(
            "No publish/update date signals found — add a visible 'Last updated' "
            "date and include it in schema to signal content freshness"
        )

    # ── Trust-page links ───────────────────────────────────────────────
    trust_links = [
        l
        for l in ctx.internal_links
        if _TRUST_HREFS.search(l.get("href", ""))
        or _TRUST_TEXT.search(l.get("text", ""))
    ]
    has_trust = len(trust_links) > 0
    if has_trust:
        found.append(
            f"Trust links present (about/contact/privacy): {len(trust_links)} link(s) found"
        )
    else:
        missing.append(
            "No about/contact/privacy links visible from this page — "
            "these are essential for establishing site authority and trust"
        )

    # ── Compute score ──────────────────────────────────────────────────
    factors = [has_author, has_schema, has_sources, has_dates, has_trust]
    base_score = sum(factors) / len(factors)
    if sum(factors) >= 4:
        base_score = min(1.0, base_score + 0.10)

    return EEATResult(
        has_author_signal=has_author,
        has_schema_markup=has_schema,
        has_sources_citations=has_sources,
        has_date_signals=has_dates,
        has_trust_signals=has_trust,
        signals_found=found,
        signals_missing=missing,
        eeat_score=round(base_score, 3),
    )
