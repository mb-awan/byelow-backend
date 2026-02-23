from __future__ import annotations

from pydantic import BaseModel, Field


# ── Section A ──────────────────────────────────────────────────────────────────

class PageOverview(BaseModel):
    url: str
    final_url: str
    search_intent: str                # informational | commercial | transactional | navigational
    intent_confidence: int            # 0–100
    primary_keyword: str
    keyword_confidence: int           # 0–100
    seo_content_score: float = Field(ge=0, le=100)
    score_label: str                  # Poor | Needs Work | Fair | Good | Excellent


# ── Section B ──────────────────────────────────────────────────────────────────

class CriticalIssue(BaseModel):
    title: str
    impact_area: str      # Rankings | User Experience | Intent Match
    explanation: str


# ── Section C ──────────────────────────────────────────────────────────────────

class KeywordPlacement(BaseModel):
    in_title: bool
    in_meta_description: bool
    in_h1: bool
    in_first_100_words: bool
    in_subheadings: bool
    in_alt_texts: bool
    keyword_density_percent: float


class KeywordAnalysis(BaseModel):
    target_keywords: list[str]
    primary_keyword: str
    keyword_placement: KeywordPlacement
    missing_semantic_terms: list[str]
    over_optimization_signals: list[str]
    under_optimization_signals: list[str]


# ── Section D ──────────────────────────────────────────────────────────────────

class HeadingIssueItem(BaseModel):
    issue: str
    details: str


class ContentStructure(BaseModel):
    word_count: int
    content_depth: str          # thin | moderate | good | comprehensive
    heading_hierarchy_issues: list[HeadingIssueItem]
    missing_sections: list[str]
    contextual_internal_links: int
    internal_linking_opportunities: list[str]


# ── Section E ──────────────────────────────────────────────────────────────────

class OptimizationSuggestion(BaseModel):
    area: str
    suggestion: str
    priority: str   # high | medium | low


# ── Section F ──────────────────────────────────────────────────────────────────

class RewriteSuggestions(BaseModel):
    needs_rewrite: bool
    optimized_title: str | None = None
    optimized_meta_description: str | None = None
    optimized_h1: str | None = None
    example_paragraph_note: str | None = None   # Guidance note (not a full rewrite)


# ── Section G ──────────────────────────────────────────────────────────────────

class ChecklistItem(BaseModel):
    task: str
    done: bool   # True if the page already satisfies this requirement


class SEOChecklist(BaseModel):
    content_writers: list[ChecklistItem]
    seo_teams: list[ChecklistItem]
    developers: list[ChecklistItem]


# ── E-E-A-T summary ────────────────────────────────────────────────────────────

class EEATSummary(BaseModel):
    signals_found: list[str]
    signals_missing: list[str]


# ── Top-level report ───────────────────────────────────────────────────────────

class ContentOptimizationReport(BaseModel):
    page_overview: PageOverview                       # A
    critical_issues: list[CriticalIssue]              # B
    keyword_analysis: KeywordAnalysis                 # C
    content_structure: ContentStructure               # D
    eeat_summary: EEATSummary                         # D (trust/authority)
    optimization_suggestions: list[OptimizationSuggestion]  # E
    rewrite_suggestions: RewriteSuggestions           # F
    seo_checklist: SEOChecklist                       # G
    extraction_warnings: list[str]


class ContentOptimizeResponse(BaseModel):
    success: bool
    data: ContentOptimizationReport | None = None
    error: str | None = None
