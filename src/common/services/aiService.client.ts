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
