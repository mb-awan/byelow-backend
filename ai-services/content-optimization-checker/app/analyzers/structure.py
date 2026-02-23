from __future__ import annotations

from dataclasses import dataclass

from app.analyzers.base import ContentContext


@dataclass
class HeadingIssue:
    issue: str
    details: str


@dataclass
class StructureResult:
    heading_hierarchy_issues: list[HeadingIssue]
    missing_sections: list[str]
    content_depth: str              # thin | moderate | good | comprehensive
    word_count: int
    contextual_internal_links: int
    internal_linking_opportunities: list[str]
    structure_score: float          # 0.0–1.0


def analyze_structure(ctx: ContentContext, primary_intent: str) -> StructureResult:
    """Analyze heading hierarchy, content depth, missing sections, and internal linking."""

    heading_issues = _check_heading_hierarchy(ctx.headings)
    depth = _classify_depth(ctx.word_count)
    missing_sections = _detect_missing_sections(ctx, primary_intent)

    contextual_links = [l for l in ctx.internal_links if l.get("is_contextual")]
    contextual_count = len(contextual_links)
    linking_opps = _find_linking_opportunities(ctx, contextual_links)

    structure_score = _compute_structure_score(
        heading_issues, depth, contextual_count
    )

    return StructureResult(
        heading_hierarchy_issues=heading_issues,
        missing_sections=missing_sections,
        content_depth=depth,
        word_count=ctx.word_count,
        contextual_internal_links=contextual_count,
        internal_linking_opportunities=linking_opps,
        structure_score=structure_score,
    )


# ── Heading hierarchy ──────────────────────────────────────────────────────────

def _check_heading_hierarchy(headings: list[dict]) -> list[HeadingIssue]:
    issues: list[HeadingIssue] = []

    if not headings:
        issues.append(HeadingIssue(
            issue="No heading tags found",
            details="The page contains no H1–H6 tags. Headings are critical for "
                    "content structure, crawlability, and keyword signals.",
        ))
        return issues

    # H1 presence
    h1s = [h for h in headings if h["level"] == 1]
    if len(h1s) == 0:
        issues.append(HeadingIssue(
            issue="Missing H1 tag",
            details="Every page must have exactly one H1. The H1 is the strongest "
                    "on-page keyword signal and defines the page's primary topic.",
        ))
    elif len(h1s) > 1:
        issues.append(HeadingIssue(
            issue=f"Multiple H1 tags ({len(h1s)} found)",
            details="Only one H1 is allowed per page. Multiple H1s dilute topical "
                    "authority and confuse crawlers about the page's primary subject.",
        ))

    # Skipped heading levels
    prev_level = 0
    for h in headings:
        level = h["level"]
        if prev_level > 0 and level > prev_level + 1:
            issues.append(HeadingIssue(
                issue=f"Skipped heading level: H{prev_level} → H{level}",
                details=f'Heading "{h["text"][:60]}" jumps from H{prev_level} to '
                        f"H{level}. Heading levels should be sequential to maintain "
                        "a proper document outline.",
            ))
        prev_level = level

    return issues


# ── Content depth ──────────────────────────────────────────────────────────────

def _classify_depth(word_count: int) -> str:
    if word_count < 300:
        return "thin"
    if word_count < 700:
        return "moderate"
    if word_count < 1500:
        return "good"
    return "comprehensive"


# ── Missing sections ───────────────────────────────────────────────────────────

_INTENT_SECTIONS: dict[str, list[tuple[str, list[str]]]] = {
    "informational": [
        ("Introduction / Definition", ["what is", "defined", "introduction", "overview"]),
        ("How It Works / Process", ["how", "works", "process", "step", "method"]),
        ("Examples or Use Cases", ["example", "such as", "instance", "case"]),
        ("Conclusion / Summary", ["conclusion", "summary", "final", "takeaway", "wrap"]),
    ],
    "commercial": [
        ("Comparison Table or Criteria", ["compare", "vs", "versus", "criteria", "table"]),
        ("Pros and Cons", ["pros", "cons", "advantage", "disadvantage", "benefit", "drawback"]),
        ("Expert Verdict or Recommendation", ["recommend", "verdict", "winner", "best for", "our pick"]),
        ("FAQ", ["faq", "frequently asked", "question"]),
    ],
    "transactional": [
        ("Pricing Information", ["price", "cost", "plan", "pricing", "$", "fee", "tariff"]),
        ("Key Features", ["feature", "include", "what you get", "capability", "offers"]),
        ("Social Proof (Reviews / Testimonials)", ["review", "testimonial", "rating", "customer", "stars"]),
        ("FAQ", ["faq", "frequently asked", "question"]),
    ],
    "navigational": [],
}


def _detect_missing_sections(ctx: ContentContext, intent: str) -> list[str]:
    """Return sections typically expected for the given intent that are absent."""
    content_lower = ctx.content_text.lower()
    heading_text = " ".join(h["text"] for h in ctx.headings).lower()
    all_text = f"{heading_text} {content_lower}"

    expected = _INTENT_SECTIONS.get(intent, _INTENT_SECTIONS["informational"])
    missing: list[str] = []
    for section_name, patterns in expected:
        if not any(p in all_text for p in patterns):
            missing.append(section_name)
    return missing


# ── Internal linking ───────────────────────────────────────────────────────────

def _find_linking_opportunities(
    ctx: ContentContext, contextual_links: list[dict]
) -> list[str]:
    opps: list[str] = []
    count = len(contextual_links)

    if count == 0:
        opps.append(
            "No contextual internal links found — add links to related content "
            "on your site using descriptive anchor text"
        )
    elif count < 3:
        opps.append(
            f"Only {count} contextual internal link(s) detected — "
            "aim for 3–7 contextual links to improve crawl depth and topic authority"
        )

    # Generic anchor text check
    generic = {"click here", "read more", "learn more", "here", "this", "more"}
    generic_count = sum(
        1 for l in contextual_links if l.get("text", "").lower().strip() in generic
    )
    if generic_count > 0:
        opps.append(
            f"{generic_count} internal link(s) use generic anchor text "
            "('click here', 'read more', etc.) — replace with descriptive, keyword-rich anchors"
        )

    if not opps:
        opps.append(
            f"{count} contextual internal links present — verify they point to "
            "topically relevant pages"
        )

    return opps


# ── Score ──────────────────────────────────────────────────────────────────────

def _compute_structure_score(
    issues: list[HeadingIssue],
    depth: str,
    contextual_links: int,
) -> float:
    score = 1.0

    for issue in issues:
        title = issue.issue.lower()
        if "no heading" in title or "missing h1" in title:
            score -= 0.30
        elif "multiple h1" in title:
            score -= 0.15
        else:  # skipped levels
            score -= 0.05

    depth_factor = {"thin": 0.0, "moderate": 0.50, "good": 0.85, "comprehensive": 1.0}[depth]
    score = score * 0.60 + depth_factor * 0.40

    if contextual_links >= 3:
        score = min(1.0, score + 0.05)
    elif contextual_links == 0:
        score = max(0.0, score - 0.05)

    return round(min(1.0, max(0.0, score)), 3)
