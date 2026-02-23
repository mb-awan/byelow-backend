from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

from app.analyzers.base import ContentContext

# ── English stop words ─────────────────────────────────────────────────────────

_STOP_WORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "should", "could", "may", "might", "shall", "can", "this", "that",
    "these", "those", "it", "its", "as", "we", "you", "he", "she", "they",
    "not", "no", "so", "if", "when", "than", "then", "there", "their",
    "about", "up", "out", "more", "also", "just", "into", "over", "all",
    "any", "your", "our", "my", "his", "her", "us", "them", "very",
    "how", "what", "which", "who", "where", "why", "page", "site",
    "get", "use", "one", "two", "new", "first", "great", "good", "make",
    "know", "take", "see", "come", "go", "look", "think", "need", "want",
    "give", "find", "tell", "ask", "seem", "feel", "try", "leave", "put",
    "means", "using", "used", "every", "each", "both", "few", "some",
    "such", "now", "even", "back", "still", "way", "well", "only", "also",
})

# ── Result types ───────────────────────────────────────────────────────────────


@dataclass
class KeywordPlacementResult:
    in_title: bool
    in_meta_description: bool
    in_h1: bool
    in_first_100_words: bool
    in_subheadings: bool
    in_alt_texts: bool
    keyword_density_percent: float


@dataclass
class KeywordResult:
    primary_keyword: str
    keyword_confidence: int           # 0–100
    target_keywords: list[str]
    placement: KeywordPlacementResult
    missing_semantic_terms: list[str]
    over_optimization_signals: list[str]
    under_optimization_signals: list[str]
    keyword_score: float              # 0.0–1.0 for overall scoring


# ── Main entry point ───────────────────────────────────────────────────────────

def analyze_keywords(ctx: ContentContext) -> KeywordResult:
    """Analyze keyword placement, density, and semantic coverage."""

    # Determine primary keyword
    provided_kws = [kw.strip().lower() for kw in ctx.target_keywords if kw.strip()]
    if provided_kws:
        primary_keyword = provided_kws[0]
        kw_confidence = 100
    else:
        primary_keyword, kw_confidence = _infer_primary_keyword(ctx)

    all_keywords = [primary_keyword] + [k for k in provided_kws[1:] if k != primary_keyword]

    # Placement analysis
    placement = _check_placement(primary_keyword, ctx)

    # Over/under-optimization
    over_signals = _check_over_optimization(primary_keyword, ctx, placement)
    under_signals = _check_under_optimization(primary_keyword, ctx, placement)

    # Missing semantic terms
    missing_semantic = _find_missing_semantic_terms(primary_keyword, ctx)

    # Keyword score
    kw_score = _compute_keyword_score(placement, kw_confidence, over_signals)

    return KeywordResult(
        primary_keyword=primary_keyword,
        keyword_confidence=kw_confidence,
        target_keywords=all_keywords,
        placement=placement,
        missing_semantic_terms=missing_semantic,
        over_optimization_signals=over_signals,
        under_optimization_signals=under_signals,
        keyword_score=kw_score,
    )


# ── Keyword inference ──────────────────────────────────────────────────────────

def _infer_primary_keyword(ctx: ContentContext) -> tuple[str, int]:
    """Infer primary keyword from title and H1 overlap."""
    h1_text = next((h["text"] for h in ctx.headings if h["level"] == 1), "")
    title_tokens = _tokenize(ctx.title)
    h1_tokens = _tokenize(h1_text)

    # Common meaningful tokens (preserving title order)
    h1_set = set(h1_tokens)
    common = [t for t in title_tokens if t in h1_set]

    if len(common) >= 2:
        keyword = " ".join(common[:5])
        confidence = min(90, 50 + len(common) * 12)
    elif title_tokens:
        keyword = " ".join(title_tokens[:3])
        confidence = 50
    elif h1_tokens:
        keyword = " ".join(h1_tokens[:3])
        confidence = 45
    else:
        keyword = ""
        confidence = 0

    return keyword.strip(), confidence


def _tokenize(text: str) -> list[str]:
    """Tokenize text, removing stop words and short tokens."""
    words = re.findall(r"\b[a-zA-Z]{2,}\b", text.lower())
    return [w for w in words if w not in _STOP_WORDS]


# ── Placement check ────────────────────────────────────────────────────────────

def _check_placement(keyword: str, ctx: ContentContext) -> KeywordPlacementResult:
    """Check where the primary keyword appears across the page."""
    if not keyword:
        return KeywordPlacementResult(
            in_title=False, in_meta_description=False, in_h1=False,
            in_first_100_words=False, in_subheadings=False, in_alt_texts=False,
            keyword_density_percent=0.0,
        )

    kw_lower = keyword.lower()
    h1_text = next((h["text"] for h in ctx.headings if h["level"] == 1), "")
    subheading_text = " ".join(h["text"] for h in ctx.headings if h["level"] > 1)
    first_100_words = " ".join(ctx.content_text.split()[:100])

    in_title = kw_lower in ctx.title.lower()
    in_meta = kw_lower in ctx.meta_description.lower()
    in_h1 = kw_lower in h1_text.lower()
    in_first = kw_lower in first_100_words.lower()
    in_sub = kw_lower in subheading_text.lower()
    in_alt = kw_lower in " ".join(ctx.image_alts).lower()

    # Keyword density (count occurrences in content)
    density = _compute_density(keyword, ctx.content_text, ctx.word_count)

    return KeywordPlacementResult(
        in_title=in_title,
        in_meta_description=in_meta,
        in_h1=in_h1,
        in_first_100_words=in_first,
        in_subheadings=in_sub,
        in_alt_texts=in_alt,
        keyword_density_percent=density,
    )


def _compute_density(keyword: str, content: str, word_count: int) -> float:
    """Compute keyword density as a percentage of total words."""
    if word_count == 0 or not keyword:
        return 0.0
    kw_words = keyword.lower().split()
    kw_len = len(kw_words)
    content_words = content.lower().split()
    count = sum(
        1
        for i in range(len(content_words) - kw_len + 1)
        if content_words[i : i + kw_len] == kw_words
    )
    return round((count * kw_len / max(word_count, 1)) * 100, 2)


# ── Optimization signal checks ────────────────────────────────────────────────

def _check_over_optimization(
    keyword: str, ctx: ContentContext, placement: KeywordPlacementResult
) -> list[str]:
    signals: list[str] = []
    if placement.keyword_density_percent > 4.0:
        signals.append(
            f"Keyword density is {placement.keyword_density_percent:.1f}% — "
            "exceeds the 3–4% threshold; risk of keyword stuffing penalty"
        )
    # Exact-match domain check
    kw_clean = re.sub(r"\W", "", keyword.lower())
    domain_root = ctx.domain.lower().removeprefix("www.").split(".")[0]
    domain_clean = re.sub(r"\W", "", domain_root)
    if kw_clean and kw_clean == domain_clean and len(kw_clean) > 4:
        signals.append(
            "Exact-match keyword domain detected — may appear manipulative to search engines"
        )
    return signals


def _check_under_optimization(
    keyword: str, ctx: ContentContext, placement: KeywordPlacementResult
) -> list[str]:
    signals: list[str] = []
    if not keyword:
        signals.append("Primary keyword could not be determined — target keyword inference failed")
        return signals
    if not placement.in_title:
        signals.append("Primary keyword is absent from the page title tag")
    if not placement.in_h1:
        signals.append("Primary keyword is absent from the H1 heading")
    if not placement.in_meta_description and ctx.meta_description:
        signals.append("Primary keyword is absent from the meta description")
    if not placement.in_first_100_words and ctx.word_count > 100:
        signals.append("Primary keyword does not appear in the first 100 words of content")
    if placement.keyword_density_percent < 0.5 and ctx.word_count > 200:
        signals.append(
            f"Keyword density is {placement.keyword_density_percent:.1f}% — "
            "below 0.5%; keyword is under-represented in the body text"
        )
    return signals


# ── Semantic coverage analysis ─────────────────────────────────────────────────

def _find_missing_semantic_terms(keyword: str, ctx: ContentContext) -> list[str]:
    """Identify semantic signals and content patterns that are absent."""
    if not keyword or ctx.word_count < 200:
        return []

    all_text = (
        ctx.title.lower()
        + " "
        + " ".join(h["text"] for h in ctx.headings).lower()
        + " "
        + ctx.content_text.lower()
    )

    missing: list[str] = []

    # Common content completeness signals expected in most quality articles
    _SEMANTIC_SIGNALS: list[tuple[str, list[str]]] = [
        ("definition or explanation", ["what is", "defined as", "refers to", "is a", "means"]),
        ("benefits or value proposition", ["benefit", "advantage", "why", "helps", "improve"]),
        ("examples or use cases", ["example", "such as", "for instance", "case study", "use case"]),
        ("actionable steps or process", ["step", "how to", "process", "method", "approach"]),
        ("data, statistics, or research", [
            "according to", "study", "research", "statistic", "data", "survey", "percent", "%"
        ]),
        ("conclusion or summary", ["conclusion", "summary", "in summary", "to sum up", "final thoughts"]),
    ]

    if ctx.word_count >= 500:
        for signal_name, patterns in _SEMANTIC_SIGNALS:
            if not any(p in all_text for p in patterns):
                missing.append(signal_name)

    # Frequent content bigrams not present in headings — possible topical gaps
    heading_text_lower = " ".join(h["text"] for h in ctx.headings).lower()
    heading_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", heading_text_lower))
    content_words = re.findall(r"\b[a-zA-Z]{3,}\b", ctx.content_text.lower())

    bigrams = [
        f"{content_words[i]} {content_words[i + 1]}"
        for i in range(len(content_words) - 1)
        if content_words[i] not in _STOP_WORDS
        and content_words[i + 1] not in _STOP_WORDS
    ]
    bigram_freq = Counter(bigrams)

    kw_words = set(keyword.lower().split())
    frequent_gaps = [
        term
        for term, count in bigram_freq.most_common(30)
        if count >= 3
        and not any(w in heading_words for w in term.split())
        and not any(w in kw_words for w in term.split())
    ]

    for term in frequent_gaps[:4]:
        missing.append(f'"{term}" (frequent content term absent from headings — consider a dedicated section)')

    return missing[:10]


# ── Score computation ──────────────────────────────────────────────────────────

def _compute_keyword_score(
    placement: KeywordPlacementResult,
    confidence: int,
    over_signals: list[str],
) -> float:
    """Compute keyword optimization score 0.0–1.0."""
    score = 0.0
    if placement.in_title:             score += 0.25
    if placement.in_h1:                score += 0.25
    if placement.in_meta_description:  score += 0.15
    if placement.in_first_100_words:   score += 0.15
    if placement.in_subheadings:       score += 0.10
    if placement.in_alt_texts:         score += 0.05

    # Density bonus/penalty
    d = placement.keyword_density_percent
    if 0.5 <= d <= 3.0:
        score += 0.05
    elif d > 4.0:
        score -= 0.15

    # Scale by keyword inference confidence
    score *= confidence / 100

    # Over-optimization penalty
    if over_signals:
        score *= 0.80

    return round(min(1.0, max(0.0, score)), 3)
