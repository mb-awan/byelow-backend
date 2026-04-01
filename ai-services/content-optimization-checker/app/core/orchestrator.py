from __future__ import annotations

from urllib.parse import urlparse

from loguru import logger

from app.analyzers.base import ContentContext
from app.analyzers.eeat import analyze_eeat
from app.analyzers.intent import analyze_intent
from app.analyzers.keyword import analyze_keywords
from app.analyzers.scoring import compute_seo_content_score
from app.analyzers.structure import analyze_structure
from app.config import Settings
from app.core.extractor import fetch_and_extract
from app.models.responses import (
    ChecklistItem,
    ContentOptimizationReport,
    ContentStructure,
    CriticalIssue,
    EEATSummary,
    HeadingIssueItem,
    KeywordAnalysis,
    KeywordPlacement,
    OptimizationSuggestion,
    PageOverview,
    RewriteSuggestions,
    SEOChecklist,
)

_SCORE_LABELS = [
    (80, "Excellent"),
    (65, "Good"),
    (50, "Fair"),
    (30, "Needs Work"),
    (0,  "Poor"),
]


class ContentOptimizationOrchestrator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def optimize(
        self,
        url: str,
        keywords: list[str] | None = None,
        country: str = "",
        language: str = "",
    ) -> ContentOptimizationReport:

        # ── Phase 1: Fetch and extract content ────────────────────────
        logger.info(f"Fetching and extracting content for: {url}")
        extracted = await fetch_and_extract(url, self.settings)

        if extracted.fetch_error:
            raise RuntimeError(f"Could not fetch page: {extracted.fetch_error}")

        # ── Phase 2: Build shared context ─────────────────────────────
        domain = (
            urlparse(extracted.final_url).hostname
            or urlparse(url).hostname
            or ""
        )
        ctx = ContentContext(
            url=url,
            final_url=extracted.final_url,
            domain=domain,
            title=extracted.title,
            meta_description=extracted.meta_description,
            headings=extracted.headings,
            content_text=extracted.content_text,
            image_alts=extracted.image_alts,
            internal_links=extracted.internal_links,
            word_count=extracted.word_count,
            has_schema_markup=extracted.has_schema_markup,
            target_keywords=keywords or [],
            country=country,
            language=language,
            extraction_warnings=extracted.extraction_warnings,
        )

        logger.info(
            f"Extracted — title={bool(ctx.title)}, words={ctx.word_count}, "
            f"headings={len(ctx.headings)}, links={len(ctx.internal_links)}"
        )

        # ── Phase 3: Run analyzers ────────────────────────────────────
        intent_result    = analyze_intent(ctx)
        keyword_result   = analyze_keywords(ctx)
        structure_result = analyze_structure(ctx, intent_result.primary_intent)
        eeat_result      = analyze_eeat(ctx)

        logger.info(
            f"Analysis — intent={intent_result.primary_intent} "
            f"({intent_result.confidence}%), kw={keyword_result.primary_keyword!r}"
        )

        # ── Phase 4: Compute overall score ────────────────────────────
        seo_score = compute_seo_content_score(
            intent_result, keyword_result, structure_result, eeat_result
        )
        score_label = _label(seo_score)

        logger.info(f"SEO Content Score: {seo_score} ({score_label})")

        # ── Phase 5: Assemble sections A–G ───────────────────────────

        # A. Page Overview
        page_overview = PageOverview(
            url=url,
            final_url=extracted.final_url,
            search_intent=intent_result.primary_intent,
            intent_confidence=intent_result.confidence,
            primary_keyword=keyword_result.primary_keyword or "— not determined —",
            keyword_confidence=keyword_result.keyword_confidence,
            seo_content_score=seo_score,
            score_label=score_label,
        )

        # B. Critical Issues
        critical_issues = _build_critical_issues(ctx, keyword_result, structure_result)

        # C. Keyword & Semantic Coverage
        kp = keyword_result.placement
        keyword_analysis = KeywordAnalysis(
            target_keywords=keyword_result.target_keywords,
            primary_keyword=keyword_result.primary_keyword,
            keyword_placement=KeywordPlacement(
                in_title=kp.in_title,
                in_meta_description=kp.in_meta_description,
                in_h1=kp.in_h1,
                in_first_100_words=kp.in_first_100_words,
                in_subheadings=kp.in_subheadings,
                in_alt_texts=kp.in_alt_texts,
                keyword_density_percent=kp.keyword_density_percent,
            ),
            missing_semantic_terms=keyword_result.missing_semantic_terms,
            over_optimization_signals=keyword_result.over_optimization_signals,
            under_optimization_signals=keyword_result.under_optimization_signals,
        )

        # D. Content Structure + E-E-A-T
        content_structure = ContentStructure(
            word_count=structure_result.word_count,
            content_depth=structure_result.content_depth,
            heading_hierarchy_issues=[
                HeadingIssueItem(issue=i.issue, details=i.details)
                for i in structure_result.heading_hierarchy_issues
            ],
            missing_sections=structure_result.missing_sections,
            contextual_internal_links=structure_result.contextual_internal_links,
            internal_linking_opportunities=structure_result.internal_linking_opportunities,
        )
        eeat_summary = EEATSummary(
            signals_found=eeat_result.signals_found,
            signals_missing=eeat_result.signals_missing,
        )

        # E. Optimization Suggestions
        optimization_suggestions = _build_optimization_suggestions(
            ctx, keyword_result, structure_result, eeat_result, intent_result
        )

        # F. Rewrite Suggestions
        rewrite_suggestions = _build_rewrite_suggestions(
            ctx, keyword_result, intent_result
        )

        # G. Final SEO Checklist
        seo_checklist = _build_checklist(ctx, keyword_result, structure_result, eeat_result)

        return ContentOptimizationReport(
            page_overview=page_overview,
            critical_issues=critical_issues,
            keyword_analysis=keyword_analysis,
            content_structure=content_structure,
            eeat_summary=eeat_summary,
            optimization_suggestions=optimization_suggestions,
            rewrite_suggestions=rewrite_suggestions,
            seo_checklist=seo_checklist,
            extraction_warnings=ctx.extraction_warnings,
        )


# ── Section builders ───────────────────────────────────────────────────────────

def _build_critical_issues(ctx, keyword_result, structure_result) -> list[CriticalIssue]:
    issues: list[CriticalIssue] = []

    # Missing title
    if not ctx.title:
        issues.append(CriticalIssue(
            title="Page title tag is missing",
            impact_area="Rankings",
            explanation="The <title> tag is one of the most important on-page SEO elements. "
                        "Missing it severely reduces crawlability and click-through rate from SERPs.",
        ))

    # Missing H1
    h1_count = sum(1 for h in ctx.headings if h["level"] == 1)
    if h1_count == 0:
        issues.append(CriticalIssue(
            title="H1 heading is missing",
            impact_area="Rankings",
            explanation="The H1 is the primary keyword signal for crawlers. Without it, "
                        "search engines have no clear indication of the page's main topic.",
        ))
    elif h1_count > 1:
        issues.append(CriticalIssue(
            title=f"Multiple H1 tags detected ({h1_count})",
            impact_area="Rankings",
            explanation="Multiple H1s dilute topical authority and confuse crawlers. "
                        "Each page must have exactly one H1.",
        ))

    # Missing meta description
    if not ctx.meta_description:
        issues.append(CriticalIssue(
            title="Meta description is missing",
            impact_area="User Experience",
            explanation="Without a meta description, search engines auto-generate a snippet, "
                        "which often misrepresents the page and reduces CTR.",
        ))

    # Thin content
    if structure_result.content_depth == "thin":
        issues.append(CriticalIssue(
            title=f"Thin content — only {ctx.word_count} words detected",
            impact_area="Rankings",
            explanation="Pages with fewer than 300 words rarely rank for competitive queries. "
                        "Search engines interpret thin content as low-value.",
        ))

    # Keyword not in title AND H1 (both missing is critical)
    kp = keyword_result.placement
    if keyword_result.primary_keyword and not kp.in_title and not kp.in_h1:
        issues.append(CriticalIssue(
            title="Primary keyword absent from both title and H1",
            impact_area="Rankings",
            explanation=f'The keyword "{keyword_result.primary_keyword}" appears in neither the '
                        "title tag nor the H1 — the two most important keyword placement signals.",
        ))

    return issues


def _build_optimization_suggestions(
    ctx, keyword_result, structure_result, eeat_result, intent_result
) -> list[OptimizationSuggestion]:
    suggestions: list[OptimizationSuggestion] = []
    kp = keyword_result.placement
    kw = keyword_result.primary_keyword

    # Keyword placement suggestions
    if kw and not kp.in_title:
        suggestions.append(OptimizationSuggestion(
            area="Title Tag",
            suggestion=f'Move the primary keyword "{kw}" closer to the beginning of the title tag (ideally within the first 60 characters).',
            priority="high",
        ))
    if kw and not kp.in_h1:
        suggestions.append(OptimizationSuggestion(
            area="H1 Heading",
            suggestion=f'Rewrite the H1 to naturally include "{kw}" — it should be the clear topic of the page.',
            priority="high",
        ))

    # Meta description
    if not ctx.meta_description:
        suggestions.append(OptimizationSuggestion(
            area="Meta Description",
            suggestion="Add a compelling meta description (150–160 characters) that includes the primary keyword and a clear call-to-action.",
            priority="high",
        ))
    elif len(ctx.meta_description) < 100:
        suggestions.append(OptimizationSuggestion(
            area="Meta Description",
            suggestion=f"Current meta description is too short ({len(ctx.meta_description)} chars). Expand it to 150–160 characters with keyword and CTA.",
            priority="medium",
        ))
    elif len(ctx.meta_description) > 165:
        suggestions.append(OptimizationSuggestion(
            area="Meta Description",
            suggestion=f"Current meta description is too long ({len(ctx.meta_description)} chars) and will be truncated in SERPs. Trim it to under 160 characters.",
            priority="medium",
        ))

    # Content depth
    if structure_result.content_depth in ("thin", "moderate"):
        target = 700 if structure_result.content_depth == "moderate" else 1500
        suggestions.append(OptimizationSuggestion(
            area="Content Depth",
            suggestion=f"Expand content to at least {target} words. Add the missing sections identified below to cover the topic more comprehensively.",
            priority="high" if structure_result.content_depth == "thin" else "medium",
        ))

    # Missing sections
    for section in structure_result.missing_sections:
        suggestions.append(OptimizationSuggestion(
            area="Content Sections",
            suggestion=f"Add a '{section}' section — this is typically expected for {intent_result.primary_intent} intent pages and improves topical completeness.",
            priority="medium",
        ))

    # Heading hierarchy
    for issue in structure_result.heading_hierarchy_issues:
        if "Skipped" in issue.issue:
            suggestions.append(OptimizationSuggestion(
                area="Heading Structure",
                suggestion=f"Fix heading hierarchy: {issue.issue}. {issue.details}",
                priority="medium",
            ))

    # Internal linking
    if structure_result.contextual_internal_links < 3:
        suggestions.append(OptimizationSuggestion(
            area="Internal Linking",
            suggestion=f"Add contextual internal links to {max(0, 3 - structure_result.contextual_internal_links)} more related pages using descriptive anchor text.",
            priority="medium",
        ))

    # E-E-A-T improvements
    for signal in eeat_result.signals_missing:
        # Only include the most actionable ones
        if "author" in signal.lower():
            suggestions.append(OptimizationSuggestion(
                area="E-E-A-T: Authorship",
                suggestion=signal,
                priority="high",
            ))
        elif "schema" in signal.lower():
            suggestions.append(OptimizationSuggestion(
                area="E-E-A-T: Schema Markup",
                suggestion=signal,
                priority="medium",
            ))
        elif "citation" in signal.lower() or "data" in signal.lower() or "statistic" in signal.lower():
            suggestions.append(OptimizationSuggestion(
                area="E-E-A-T: Trust Signals",
                suggestion=signal,
                priority="medium",
            ))
        elif "date" in signal.lower():
            suggestions.append(OptimizationSuggestion(
                area="E-E-A-T: Freshness",
                suggestion=signal,
                priority="low",
            ))

    # Image alt texts
    missing_alt_count = sum(1 for w in ctx.extraction_warnings if "missing alt" in w.lower())
    if missing_alt_count > 0:
        suggestions.append(OptimizationSuggestion(
            area="Image Alt Texts",
            suggestion=f"{missing_alt_count} image(s) are missing alt text. Add descriptive alt text with relevant keywords where natural.",
            priority="low",
        ))

    return suggestions


def _build_rewrite_suggestions(ctx, keyword_result, intent_result) -> RewriteSuggestions:
    kw = keyword_result.primary_keyword
    intent = intent_result.primary_intent
    kp = keyword_result.placement
    needs_rewrite = False

    optimized_title: str | None = None
    optimized_meta: str | None = None
    optimized_h1: str | None = None
    example_note: str | None = None

    # Title rewrite
    title_len = len(ctx.title)
    if not kp.in_title or title_len < 20 or title_len > 70:
        needs_rewrite = True
        if kw:
            kw_title = kw.title()
            templates = {
                "informational":  f"{kw_title}: The Complete Guide (Updated 2024)",
                "commercial":     f"Best {kw_title} in 2024: Expert Reviews & Comparisons",
                "transactional":  f"{kw_title} — Start Today | [Brand Name]",
                "navigational":   f"{kw_title} | [Brand Name]",
            }
            optimized_title = templates.get(intent, f"{kw_title} — [Brand Name]")
            if title_len > 70:
                optimized_title += "  [trim to 60–70 characters]"

    # Meta description rewrite
    meta_len = len(ctx.meta_description)
    if not kp.in_meta_description or meta_len < 100 or meta_len > 165:
        needs_rewrite = True
        if kw:
            kw_lower = kw.lower()
            templates = {
                "informational":  f"Learn everything about {kw_lower}. This guide covers [key topics] to help you [benefit]. Updated for 2024.",
                "commercial":     f"Compare the best {kw_lower} options. Read our expert reviews and recommendations to find the right fit for your needs.",
                "transactional":  f"Get {kw_lower} today — [Key benefit]. Trusted by [X] customers. [CTA, e.g., Start free trial].",
                "navigational":   f"Looking for {kw_lower}? Visit [Brand] for [benefit]. [CTA].",
            }
            optimized_meta = templates.get(intent, f"Discover {kw_lower}: [compelling description with CTA, 150–160 chars].")

    # H1 rewrite
    h1s = [h["text"] for h in ctx.headings if h["level"] == 1]
    current_h1 = h1s[0] if h1s else ""
    if not kp.in_h1 or not current_h1:
        needs_rewrite = True
        if kw:
            kw_title = kw.title()
            templates = {
                "informational":  f"The Complete Guide to {kw_title}",
                "commercial":     f"Best {kw_title}: Expert Reviews and Rankings",
                "transactional":  f"Get {kw_title} — Fast, Easy, and Reliable",
                "navigational":   f"{kw_title}",
            }
            optimized_h1 = templates.get(intent, f"{kw_title}")

    # Example paragraph note (guidance only — no LLM rewrite)
    if needs_rewrite and ctx.content_text:
        first_para = ctx.content_text.split("\n")[0][:200]
        example_note = (
            f'Opening paragraph detected: "{first_para}..." — '
            "Ensure it opens with the primary keyword within the first sentence, "
            "clearly states the page's topic, and addresses the user's intent immediately."
        )

    return RewriteSuggestions(
        needs_rewrite=needs_rewrite,
        optimized_title=optimized_title,
        optimized_meta_description=optimized_meta,
        optimized_h1=optimized_h1,
        example_paragraph_note=example_note,
    )


def _build_checklist(ctx, keyword_result, structure_result, eeat_result) -> SEOChecklist:
    kp = keyword_result.placement
    kw = keyword_result.primary_keyword

    content_writers = [
        ChecklistItem(
            task="Add primary keyword to the page title tag (within first 60 characters)",
            done=kp.in_title,
        ),
        ChecklistItem(
            task="Include primary keyword naturally in the H1 heading",
            done=kp.in_h1,
        ),
        ChecklistItem(
            task="Write a compelling meta description (150–160 chars) with keyword and CTA",
            done=bool(ctx.meta_description) and 100 <= len(ctx.meta_description) <= 165,
        ),
        ChecklistItem(
            task="Use primary keyword in the first 100 words of content",
            done=kp.in_first_100_words,
        ),
        ChecklistItem(
            task=f"Expand content to at least 700 words (currently {ctx.word_count})",
            done=ctx.word_count >= 700,
        ),
        ChecklistItem(
            task="Cover all missing content sections identified in Section D",
            done=len(structure_result.missing_sections) == 0,
        ),
        ChecklistItem(
            task="Add author bio or byline to signal expertise",
            done=eeat_result.has_author_signal,
        ),
        ChecklistItem(
            task="Include at least one data point, statistic, or external citation",
            done=eeat_result.has_sources_citations,
        ),
        ChecklistItem(
            task="Add descriptive alt text to all images",
            done=not any("missing alt" in w.lower() for w in ctx.extraction_warnings),
        ),
    ]

    seo_teams = [
        ChecklistItem(
            task="Confirm target keyword(s) match the page's search intent",
            done=keyword_result.keyword_confidence >= 70,
        ),
        ChecklistItem(
            task="Fix heading hierarchy — ensure H2s before H3s, no skipped levels",
            done=len(structure_result.heading_hierarchy_issues) == 0,
        ),
        ChecklistItem(
            task="Add 3–7 contextual internal links to topically related pages",
            done=structure_result.contextual_internal_links >= 3,
        ),
        ChecklistItem(
            task="Ensure keyword density is between 0.5% and 3%",
            done=0.5 <= kp.keyword_density_percent <= 3.0,
        ),
        ChecklistItem(
            task="Check for keyword cannibalization — verify no other page targets the same keyword",
            done=False,  # Cannot determine without broader site analysis
        ),
        ChecklistItem(
            task="Add a visible publish date and last-updated date",
            done=eeat_result.has_date_signals,
        ),
    ]

    developers = [
        ChecklistItem(
            task="Implement JSON-LD schema markup (Article, BlogPosting, or relevant type)",
            done=eeat_result.has_schema_markup,
        ),
        ChecklistItem(
            task="Add breadcrumb schema for improved SERP appearance",
            done=False,  # Cannot determine without broader site analysis
        ),
        ChecklistItem(
            task="Verify canonical tag points to the correct URL",
            done=False,  # Cannot determine without inspecting <head>
        ),
        ChecklistItem(
            task="Ensure page loads quickly (Core Web Vitals: LCP < 2.5 s, CLS < 0.1)",
            done=False,  # Requires performance measurement
        ),
        ChecklistItem(
            task="Link to trust pages (About, Contact, Privacy) from this page or site-wide nav",
            done=eeat_result.has_trust_signals,
        ),
    ]

    return SEOChecklist(
        content_writers=content_writers,
        seo_teams=seo_teams,
        developers=developers,
    )


def _label(score: float) -> str:
    for threshold, label in _SCORE_LABELS:
        if score >= threshold:
            return label
    return "Poor"
