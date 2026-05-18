import axios, { AxiosError } from 'axios';

import { env } from '../utils/envConfig';

/**
 * Response shape from AI service POST /api/v1/analyze (aligned with Python AuthorityScore)
 */
export interface AIAnalyzeResponse {
  success: boolean;
  data?: {
    domain_authority: number;
    page_authority: number;
    domain: string;
    url: string;
    /** Optional; Python returns this (0–100). */
    spam_score?: number;
    /** Optional; Python returns estimated referring domains count. */
    referring_domains?: number;
    /** Optional; Python returns estimated backlinks. */
    backlinks?: { total?: number; dofollow?: number; nofollow?: number };
    label?: string;
  };
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function formatAIServiceError(err: unknown, serviceLabel = 'AI service'): string {
  if (axios.isAxiosError(err)) {
    const axiosError = err as AxiosError<{ detail?: string; message?: string; error?: string }>;
    const data = axiosError.response?.data;
    const detail =
      (typeof data?.detail === 'string' && data.detail) ||
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error);

    if (detail) {
      return `${serviceLabel} error: ${detail}`;
    }

    if (axiosError.code === 'ECONNREFUSED') {
      const baseUrl = env.AI_SERVICE_URL?.trim() || 'AI_SERVICE_URL';
      return `${serviceLabel} is not reachable at ${baseUrl}. Start it with: cd ai-services && uvicorn main:app --host 0.0.0.0 --port 8000`;
    }

    if (axiosError.code === 'ENOTFOUND') {
      return `${serviceLabel} host not found (${env.AI_SERVICE_URL}). Use http://localhost:8000 for local development.`;
    }

    if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
      return `${serviceLabel} request timed out. The analysis may take longer than expected — try again.`;
    }

    if (axiosError.message && axiosError.message !== 'Error') {
      return `${serviceLabel} error: ${axiosError.message}`;
    }

    return `${serviceLabel} is unavailable. Check that it is running on port 8000.`;
  }

  if (err instanceof Error && err.message) {
    return err.message.startsWith(serviceLabel) ? err.message : `${serviceLabel} error: ${err.message}`;
  }

  return `${serviceLabel} is unavailable.`;
}

async function postToAIService<TResponse>(
  endpoint: string,
  body: unknown,
  timeoutMs: number,
  serviceLabel: string
): Promise<TResponse['data'] | null> {
  const baseUrl = env.AI_SERVICE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
  try {
    const { data } = await axios.post<TResponse>(url, body, { timeout: timeoutMs });
    if (data && typeof data === 'object' && 'success' in data && data.success && 'data' in data && data.data) {
      return data.data as TResponse['data'];
    }
    return null;
  } catch (err) {
    throw new Error(formatAIServiceError(err, serviceLabel));
  }
}

/**
 * Call the AI DA/PA service to analyze a URL.
 * Returns null if AI_SERVICE_URL is not set or the request fails.
 */
export async function callAIServiceAnalyze(url: string): Promise<AIAnalyzeResponse['data'] | null> {
  return postToAIService<AIAnalyzeResponse>('/api/v1/analyze', { url }, DEFAULT_TIMEOUT_MS, 'AI service');
}

/**
 * Response shape from AI service POST /api/v1/content-optimize (Content Optimization Checker)
 */
export interface AIContentOptimizeResponse {
  success: boolean;
  data?: {
    page_overview: {
      url: string;
      final_url: string;
      search_intent: string;
      intent_confidence: number;
      primary_keyword: string;
      keyword_confidence: number;
      seo_content_score: number;
      score_label: string;
    };
    critical_issues: Array<{
      title: string;
      impact_area: string;
      explanation: string;
    }>;
    keyword_analysis: {
      target_keywords: string[];
      primary_keyword: string;
      keyword_placement: {
        in_title: boolean;
        in_meta_description: boolean;
        in_h1: boolean;
        in_first_100_words: boolean;
        in_subheadings: boolean;
        in_alt_texts: boolean;
        keyword_density_percent: number;
      };
      missing_semantic_terms: string[];
      over_optimization_signals: string[];
      under_optimization_signals: string[];
    };
    content_structure: {
      word_count: number;
      content_depth: string;
      heading_hierarchy_issues: Array<{ issue: string; details: string }>;
      missing_sections: string[];
      contextual_internal_links: number;
      internal_linking_opportunities: string[];
    };
    eeat_summary: {
      signals_found: string[];
      signals_missing: string[];
    };
    optimization_suggestions: Array<{
      area: string;
      suggestion: string;
      priority: string;
    }>;
    rewrite_suggestions: {
      needs_rewrite: boolean;
      optimized_title?: string;
      optimized_meta_description?: string;
      optimized_h1?: string;
      example_paragraph_note?: string;
    };
    seo_checklist: {
      content_writers: Array<{ task: string; done: boolean }>;
      seo_teams: Array<{ task: string; done: boolean }>;
      developers: Array<{ task: string; done: boolean }>;
    };
    extraction_warnings: string[];
  };
  error?: string;
}

/**
 * Call the AI Content Optimization service.
 * Returns null if AI_SERVICE_URL is not set or the request fails.
 */
export async function callAIServiceContentOptimize(payload: {
  url: string;
  keywords?: string[];
  country?: string;
  language?: string;
}): Promise<AIContentOptimizeResponse['data'] | null> {
  return postToAIService<AIContentOptimizeResponse>(
    '/api/v1/content-optimize',
    payload,
    DEFAULT_TIMEOUT_MS,
    'AI service'
  );
}

/**
 * Response shape from AI service POST /api/v1/audit (Website Auditor)
 */
export interface AIAuditResponse {
  success: boolean;
  data?: {
    summary: {
      url: string;
      final_url: string;
      overall_score: number;
      overall_label: string;
      total_issues: number;
      issues_by_severity: Record<string, number>;
    };
    categories: Array<{
      category: string;
      score: number;
      label: string;
      earned_points: number;
      total_points: number;
      checks: Array<{ name: string; passed: boolean; weight: number; details?: string }>;
      issues: Array<{
        name: string;
        severity: string;
        category: string;
        explanation: string;
        recommendation: string;
      }>;
    }>;
    all_issues: Array<{
      name: string;
      severity: string;
      category: string;
      explanation: string;
      recommendation: string;
    }>;
  };
  error?: string;
}

/**
 * Call the AI Website Auditor service to audit a URL.
 * Returns null if AI_SERVICE_URL is not set or the request fails.
 */
export async function callAIServiceAudit(url: string): Promise<AIAuditResponse['data'] | null> {
  return postToAIService<AIAuditResponse>('/api/v1/audit', { url }, DEFAULT_TIMEOUT_MS, 'AI service');
}

/**
 * Response shape from AI service POST /api/v1/backlink-index (Backlink Indexer)
 */
export interface AIBacklinkIndexResponse {
  success: boolean;
  data?: {
    summary: {
      target_domain: string;
      target_url: string;
      total_indexed: number;
      follow_count: number;
      nofollow_count: number;
      text_links: number;
      image_links: number;
      unique_referring_domains: number;
      link_positions: Record<string, number>;
      analysis_timestamp: string;
      discovery_sources_used: string[];
    };
    indexed_backlinks: Array<{
      source_url: string;
      target_url: string;
      source_domain: string;
      anchor_text: string;
      link_type: string;
      rel_attributes: string[];
      link_position: string;
      first_seen: string;
      last_seen: string;
      current_status: string;
      is_follow: boolean;
      http_status: number;
      discovery_source: string;
      verification_failed_reason?: string;
    }>;
    discovery_stats: {
      dataforseo_candidates: number;
      duckduckgo_candidates: number;
      bing_candidates: number;
      common_crawl_candidates: number;
      total_candidates: number;
      after_deduplication: number;
    };
    verification_stats: {
      verified_active: number;
      verified_broken: number;
      link_not_found: number;
      fetch_failed: number;
      skipped: number;
    };
    warnings: string[];
  };
  error?: string;
}

/**
 * Call the AI Backlink Indexer service.
 * Returns null if AI_SERVICE_URL is not set or the request fails.
 */
export async function callAIServiceBacklinkIndex(payload: {
  url: string;
  max_backlinks?: number;
  verify?: boolean;
}): Promise<AIBacklinkIndexResponse['data'] | null> {
  return postToAIService<AIBacklinkIndexResponse>('/api/v1/backlink-index', payload, 120_000, 'AI service');
}
