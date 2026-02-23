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

/**
 * Call the AI DA/PA service to analyze a URL.
 * Returns null if AI_SERVICE_URL is not set or the request fails.
 */
export async function callAIServiceAnalyze(url: string): Promise<AIAnalyzeResponse['data'] | null> {
  const baseUrl = env.AI_SERVICE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/v1/analyze`;
  try {
    const { data } = await axios.post<AIAnalyzeResponse>(endpoint, { url }, { timeout: DEFAULT_TIMEOUT_MS });
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (err) {
    const axiosError = err as AxiosError<{ detail?: string }>;
    const message = axiosError.response?.data?.detail ?? axiosError.message;
    throw new Error(`AI service error: ${message}`);
  }
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
  const baseUrl = env.AI_SERVICE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/v1/content-optimize`;
  try {
    const { data } = await axios.post<AIContentOptimizeResponse>(endpoint, payload, {
      timeout: DEFAULT_TIMEOUT_MS,
    });
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (err) {
    const axiosError = err as AxiosError<{ detail?: string }>;
    const message = axiosError.response?.data?.detail ?? axiosError.message;
    throw new Error(`AI service error: ${message}`);
  }
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
  const baseUrl = env.AI_SERVICE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/v1/audit`;
  try {
    const { data } = await axios.post<AIAuditResponse>(endpoint, { url }, { timeout: DEFAULT_TIMEOUT_MS });
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (err) {
    const axiosError = err as AxiosError<{ detail?: string }>;
    const message = axiosError.response?.data?.detail ?? axiosError.message;
    throw new Error(`AI service error: ${message}`);
  }
}
