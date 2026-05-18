import type { AIContentOptimizeResponse } from '@/common/services/aiService.client';

type AIContentReport = NonNullable<AIContentOptimizeResponse['data']>;

/** Dashboard-compatible content optimization response. */
export interface ContentOptimizeDashboardResponse {
  score: number;
  optimizedContent: string;
  suggestions: string[];
  url: string;
  primaryKeyword: string;
  scoreLabel: string;
  report?: AIContentReport;
}

export function toContentOptimizeDashboardResponse(report: AIContentReport): ContentOptimizeDashboardResponse {
  const overview = report.page_overview;
  const rewrite = report.rewrite_suggestions;
  const score = Math.round(overview.seo_content_score ?? 0);

  const suggestions: string[] = [];

  for (const issue of report.critical_issues ?? []) {
    suggestions.push(`[Critical · ${issue.impact_area}] ${issue.title}: ${issue.explanation}`);
  }

  for (const item of report.optimization_suggestions ?? []) {
    suggestions.push(`[${item.priority}] ${item.area}: ${item.suggestion}`);
  }

  for (const signal of report.keyword_analysis?.under_optimization_signals ?? []) {
    suggestions.push(`[Keyword] ${signal}`);
  }

  for (const term of report.keyword_analysis?.missing_semantic_terms ?? []) {
    suggestions.push(`[Semantic] Add related term: ${term}`);
  }

  for (const section of report.content_structure?.missing_sections ?? []) {
    suggestions.push(`[Structure] Add section: ${section}`);
  }

  for (const signal of report.eeat_summary?.signals_missing ?? []) {
    suggestions.push(`[E-E-A-T] ${signal}`);
  }

  const lines: string[] = [
    `# Content Optimization Report`,
    ``,
    `**URL:** ${overview.final_url || overview.url}`,
    `**SEO Content Score:** ${score}/100 (${overview.score_label})`,
    `**Primary keyword:** ${overview.primary_keyword}`,
    `**Search intent:** ${overview.search_intent} (${overview.intent_confidence}% confidence)`,
    ``,
  ];

  if (rewrite.optimized_title) {
    lines.push(`## Suggested title`, rewrite.optimized_title, ``);
  }
  if (rewrite.optimized_meta_description) {
    lines.push(`## Suggested meta description`, rewrite.optimized_meta_description, ``);
  }
  if (rewrite.optimized_h1) {
    lines.push(`## Suggested H1`, rewrite.optimized_h1, ``);
  }
  if (rewrite.example_paragraph_note) {
    lines.push(`## Content guidance`, rewrite.example_paragraph_note, ``);
  }

  lines.push(
    `## Content structure`,
    `- Word count: ${report.content_structure?.word_count ?? 0}`,
    `- Depth: ${report.content_structure?.content_depth ?? 'unknown'}`,
    `- Internal links found: ${report.content_structure?.contextual_internal_links ?? 0}`,
    ``
  );

  if (report.keyword_analysis?.keyword_placement) {
    const p = report.keyword_analysis.keyword_placement;
    lines.push(
      `## Keyword placement`,
      `- In title: ${p.in_title ? 'Yes' : 'No'}`,
      `- In meta description: ${p.in_meta_description ? 'Yes' : 'No'}`,
      `- In H1: ${p.in_h1 ? 'Yes' : 'No'}`,
      `- In first 100 words: ${p.in_first_100_words ? 'Yes' : 'No'}`,
      `- Keyword density: ${p.keyword_density_percent?.toFixed(2) ?? 0}%`,
      ``
    );
  }

  if (suggestions.length > 0) {
    lines.push(`## Top recommendations`, ...suggestions.slice(0, 12).map((s) => `- ${s}`), ``);
  }

  if ((report.extraction_warnings ?? []).length > 0) {
    lines.push(`## Notes`, ...report.extraction_warnings.map((w) => `- ${w}`));
  }

  return {
    score,
    optimizedContent: lines.join('\n'),
    suggestions,
    url: overview.final_url || overview.url,
    primaryKeyword: overview.primary_keyword,
    scoreLabel: overview.score_label,
    report,
  };
}
