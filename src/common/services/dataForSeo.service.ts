import { AxiosError } from 'axios';

import { logger } from '@/server';

import { dataForSeoClient } from '../utils/dataForSeo.client';

/**
 * DataForSEO API response types (minimal - only what we need)
 */
export interface DataForSeoBacklinksSummary {
  total_count: number;
  items_count: number;
  // We don't store the full items array - only counts
}

export interface DataForSeoReferringDomainsSummary {
  referring_domains: number;
  total_count: number;
  items_count: number;
}

export interface DataForSeoDomainMetrics {
  referringDomains: number;
  backlinksTotal: number;
  backlinksDofollow: number;
  backlinksNofollow: number;
}

/**
 * Centralized DataForSEO API client
 *
 * PHASE 1: Uses DataForSEO ONLY for discovery (referring domains + backlinks count)
 * - Fetches referring domains count
 * - Fetches backlinks summary (total, dofollow, nofollow)
 * - Does NOT store full backlink lists
 * - Does NOT recalculate DA from DataForSEO metrics
 *
 * PHASE 2 TODO:
 * - Replace backlink verification with internal crawler
 * - Store link graph in MongoDB
 * - Reduce API dependency by verifying backlinks internally
 * - Implement homepage crawl + internal link analysis for PA calculation
 *
 * PHASE 3 TODO:
 * - Replace entirely with internal backlink discovery crawler
 * - Implement full backlink discovery crawler
 * - Add historical link tracking
 * - Implement learning-based spam detection
 * - Remove DataForSEO dependency completely
 */
class DataForSeoService {
  private readonly maxRetries = 1;
  private readonly retryDelay = 1000; // 1 second

  /**
   * Retry wrapper for API calls
   */
  private async retry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt < this.maxRetries) {
        logger.warn(`DataForSEO API call failed, retrying (attempt ${attempt + 1}/${this.maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.retry(fn, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Fetch referring domains count for a domain
   *
   * PHASE 2 TODO: Replace with internal crawler that discovers referring domains
   * PHASE 3 TODO: Use internal backlink discovery crawler instead
   */
  async fetchReferringDomainsCount(domain: string): Promise<number> {
    try {
      const response = await this.retry(() =>
        dataForSeoClient.post('/backlinks/referring_domains/live', [
          {
            target: domain,
            limit: 1, // We only need the count, not the items
          },
        ])
      );

      const result = response.data.tasks?.[0]?.result?.[0] as DataForSeoReferringDomainsSummary | undefined;

      if (!result) {
        throw new Error('Invalid response from DataForSEO API');
      }

      return result.referring_domains || 0;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(`DataForSEO API error (fetchReferringDomainsCount): ${axiosError.message}`);
      throw new Error(`Failed to fetch referring domains: ${axiosError.message}`);
    }
  }

  /**
   * Fetch backlinks summary (total, dofollow, nofollow counts)
   *
   * Note: This uses sampling (1000 items) to estimate dofollow/nofollow ratios.
   * For exact counts, we would need to fetch all backlinks, which is expensive.
   *
   * PHASE 2 TODO: Replace with internal crawler for backlink verification
   * - Crawl discovered referring domains to verify backlinks
   * - Store verified backlinks in link graph database
   * - Get exact dofollow/nofollow counts from verified data
   *
   * PHASE 3 TODO: Replace with internal backlink discovery crawler
   * - Implement full backlink discovery crawler
   * - Discover backlinks by crawling the web
   * - Store complete link graph with historical tracking
   */
  async fetchBacklinksSummary(domain: string): Promise<{
    total: number;
    dofollow: number;
    nofollow: number;
  }> {
    try {
      const response = await this.retry(() =>
        dataForSeoClient.post('/backlinks/backlinks/live', [
          {
            target: domain,
            limit: 1000, // We need to count dofollow/nofollow, so fetch some items
            order_by: ['rank,desc'],
          },
        ])
      );

      const result = response.data.tasks?.[0]?.result?.[0] as
        | {
            total_count: number;
            items: Array<{ dofollow: boolean }>;
          }
        | undefined;

      if (!result) {
        throw new Error('Invalid response from DataForSEO API');
      }

      const total = result.total_count || 0;
      const items = result.items || [];

      // Count dofollow and nofollow from the fetched items
      // Note: This is an approximation based on the sample. For exact counts, we'd need to fetch all.
      // PHASE 2 TODO: Use internal crawler to get exact counts by verifying backlinks
      // PHASE 3 TODO: Use internal discovery crawler to discover and count all backlinks
      const dofollowCount = items.filter((item) => item.dofollow === true).length;
      const nofollowCount = items.filter((item) => item.dofollow === false).length;

      // Estimate dofollow/nofollow ratios from sample and apply to total
      const sampleSize = items.length;
      let dofollow = 0;
      let nofollow = 0;

      if (sampleSize > 0) {
        const dofollowRatio = dofollowCount / sampleSize;
        const nofollowRatio = nofollowCount / sampleSize;

        // Apply ratios to total (approximation)
        dofollow = Math.round(total * dofollowRatio);
        nofollow = Math.round(total * nofollowRatio);

        // Ensure they sum to total (adjust for rounding)
        const sum = dofollow + nofollow;
        if (sum !== total) {
          dofollow += total - sum; // Adjust dofollow to make sum = total
        }
      } else {
        // If no items, assume all are dofollow (conservative estimate)
        dofollow = total;
        nofollow = 0;
      }

      return {
        total,
        dofollow,
        nofollow,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(`DataForSEO API error (fetchBacklinksSummary): ${axiosError.message}`);
      throw new Error(`Failed to fetch backlinks summary: ${axiosError.message}`);
    }
  }

  /**
   * Fetch all required metrics from DataForSEO in a single optimized call
   *
   * PHASE 1: Uses DataForSEO for discovery only
   * - Calls API once per request (optimized)
   * - Fetches only referring domains and backlinks summary
   *
   * PHASE 2 TODO: Replace backlink verification with internal crawler
   * - Verify backlinks by crawling referring domains
   * - Store verified backlinks in link graph
   *
   * PHASE 3 TODO: Replace entirely with internal discovery crawler
   * - Discover backlinks by crawling the web
   * - No external API dependency
   */
  async fetchDomainMetrics(domain: string): Promise<DataForSeoDomainMetrics> {
    try {
      // Fetch both metrics in parallel for efficiency
      const [referringDomains, backlinksSummary] = await Promise.all([
        this.fetchReferringDomainsCount(domain),
        this.fetchBacklinksSummary(domain),
      ]);

      return {
        referringDomains,
        backlinksTotal: backlinksSummary.total,
        backlinksDofollow: backlinksSummary.dofollow,
        backlinksNofollow: backlinksSummary.nofollow,
      };
    } catch (error) {
      logger.error(`Failed to fetch domain metrics from DataForSEO: ${error}`);
      throw error;
    }
  }
}

export const dataForSeoService = new DataForSeoService();
