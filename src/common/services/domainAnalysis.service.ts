import { logger } from '@/server';

import { AnalyzeDomainResult, IAnalyzeDomainResult } from '../models/analyzeDomainResult';
import { env } from '../utils/envConfig';
import redisClient from '../utils/redis';
import { DataForSeoDomainMetrics, dataForSeoService } from './dataForSeo.service';
import { calculateDA, calculatePA, calculateSpamScore } from './seo.calculations';

/**
 * Domain analysis result DTO
 */
export interface DomainAnalysisResult {
  domain: string;
  metrics: {
    da: number;
    pa: number;
    spamScore: number;
  };
  backlinks: {
    total: number;
    dofollow: number;
    nofollow: number;
  };
  referringDomains: number;
  cached: boolean;
  fetchedAt: string;
  expiresAt: string;
}

/**
 * Domain Analysis Service
 *
 * Handles:
 * - MongoDB caching with TTL
 * - Redis caching (optional optimization)
 * - DataForSEO integration (PHASE 1)
 * - Internal metric calculations
 *
 * PHASE 2 TODO: Replace DataForSEO backlink verification with internal crawler
 * PHASE 3 TODO: Replace DataForSEO entirely with internal backlink discovery crawler
 */
class DomainAnalysisService {
  private readonly cacheTtlDays: number;
  private readonly redisCachePrefix = 'domain_analysis:';

  constructor() {
    this.cacheTtlDays = env.DOMAIN_ANALYSIS_CACHE_TTL_DAYS || 30;
  }

  /**
   * Get cache TTL in milliseconds
   */
  private getCacheTtlMs(): number {
    return this.cacheTtlDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Check Redis cache (optional optimization layer)
   */
  private async getFromRedisCache(domain: string): Promise<DomainAnalysisResult | null> {
    try {
      const cached = await redisClient.get(`${this.redisCachePrefix}${domain}`);
      if (cached) {
        return JSON.parse(cached) as DomainAnalysisResult;
      }
    } catch (error) {
      logger.warn(`Redis cache read error for domain ${domain}: ${error}`);
    }
    return null;
  }

  /**
   * Set Redis cache (optional optimization layer)
   */
  private async setRedisCache(domain: string, result: DomainAnalysisResult): Promise<void> {
    try {
      const ttlSeconds = Math.floor(this.getCacheTtlMs() / 1000);
      await redisClient.setEx(`${this.redisCachePrefix}${domain}`, ttlSeconds, JSON.stringify(result));
    } catch (error) {
      logger.warn(`Redis cache write error for domain ${domain}: ${error}`);
      // Don't throw - Redis cache is optional
    }
  }

  /**
   * Check MongoDB cache
   */
  private async getFromDbCache(domain: string): Promise<IAnalyzeDomainResult | null> {
    try {
      const cached = await AnalyzeDomainResult.findOne({ domain }).exec();

      if (cached && cached.expiresAt > new Date()) {
        return cached;
      }

      // If expired, delete it
      if (cached && cached.expiresAt <= new Date()) {
        await AnalyzeDomainResult.deleteOne({ domain }).exec();
      }
    } catch (error) {
      logger.error(`MongoDB cache read error for domain ${domain}: ${error}`);
    }
    return null;
  }

  /**
   * Save to MongoDB cache
   */
  private async saveToDbCache(
    domain: string,
    metrics: DataForSeoDomainMetrics,
    calculatedMetrics: { da: number; pa: number; spamScore: number },
    linkMetricsSummary: {
      dofollowRatio: number;
      nofollowRatio: number;
      backlinkToDomainRatio: number;
    }
  ): Promise<IAnalyzeDomainResult> {
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + this.getCacheTtlMs());

    const result = new AnalyzeDomainResult({
      domain,
      da: calculatedMetrics.da,
      pa: calculatedMetrics.pa,
      spamScore: calculatedMetrics.spamScore,
      backlinks: {
        total: metrics.backlinksTotal,
        dofollow: metrics.backlinksDofollow,
        nofollow: metrics.backlinksNofollow,
      },
      referringDomains: metrics.referringDomains,
      source: 'dataforseo+internal',
      fetchedAt,
      expiresAt,
      rawSnapshot: {
        dataforseo: {
          referringDomains: metrics.referringDomains,
          backlinksTotal: metrics.backlinksTotal,
          backlinksDofollow: metrics.backlinksDofollow,
          backlinksNofollow: metrics.backlinksNofollow,
        },
        internal: {
          linkMetricsSummary,
        },
      },
    });

    await result.save();
    return result;
  }

  /**
   * Convert DB model to DTO
   */
  private dbModelToDto(model: IAnalyzeDomainResult, cached: boolean): DomainAnalysisResult {
    return {
      domain: model.domain,
      metrics: {
        da: model.da,
        pa: model.pa,
        spamScore: model.spamScore,
      },
      backlinks: {
        total: model.backlinks.total,
        dofollow: model.backlinks.dofollow,
        nofollow: model.backlinks.nofollow,
      },
      referringDomains: model.referringDomains,
      cached,
      fetchedAt: model.fetchedAt.toISOString(),
      expiresAt: model.expiresAt.toISOString(),
    };
  }

  /**
   * Fetch fresh data from DataForSEO and calculate metrics
   * PHASE 2 TODO: Replace DataForSEO with internal crawler for backlink verification
   * PHASE 3 TODO: Replace DataForSEO entirely with internal backlink discovery crawler
   */
  private async fetchAndCalculate(domain: string): Promise<{
    result: DomainAnalysisResult;
    linkMetricsSummary: {
      dofollowRatio: number;
      nofollowRatio: number;
      backlinkToDomainRatio: number;
    };
  }> {
    // Fetch from DataForSEO (PHASE 1: discovery only)
    const dataForSeoMetrics = await dataForSeoService.fetchDomainMetrics(domain);

    // Calculate link metrics summary
    const dofollowRatio =
      dataForSeoMetrics.backlinksTotal > 0 ? dataForSeoMetrics.backlinksDofollow / dataForSeoMetrics.backlinksTotal : 0;
    const nofollowRatio =
      dataForSeoMetrics.backlinksTotal > 0 ? dataForSeoMetrics.backlinksNofollow / dataForSeoMetrics.backlinksTotal : 0;
    const backlinkToDomainRatio =
      dataForSeoMetrics.referringDomains > 0
        ? dataForSeoMetrics.backlinksTotal / dataForSeoMetrics.referringDomains
        : 0;

    const linkMetricsSummary = {
      dofollowRatio,
      nofollowRatio,
      backlinkToDomainRatio,
    };

    // Calculate metrics internally
    const da = calculateDA({
      referringDomains: dataForSeoMetrics.referringDomains,
      backlinksTotal: dataForSeoMetrics.backlinksTotal,
      backlinksDofollow: dataForSeoMetrics.backlinksDofollow,
      backlinksNofollow: dataForSeoMetrics.backlinksNofollow,
    });

    const pa = calculatePA({
      referringDomains: dataForSeoMetrics.referringDomains,
      backlinksTotal: dataForSeoMetrics.backlinksTotal,
    });

    const spamScore = calculateSpamScore({
      backlinksTotal: dataForSeoMetrics.backlinksTotal,
      referringDomains: dataForSeoMetrics.referringDomains,
      backlinksDofollow: dataForSeoMetrics.backlinksDofollow,
      backlinksNofollow: dataForSeoMetrics.backlinksNofollow,
    });

    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + this.getCacheTtlMs());

    const result: DomainAnalysisResult = {
      domain,
      metrics: {
        da,
        pa,
        spamScore,
      },
      backlinks: {
        total: dataForSeoMetrics.backlinksTotal,
        dofollow: dataForSeoMetrics.backlinksDofollow,
        nofollow: dataForSeoMetrics.backlinksNofollow,
      },
      referringDomains: dataForSeoMetrics.referringDomains,
      cached: false,
      fetchedAt: fetchedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    return { result, linkMetricsSummary };
  }

  /**
   * Analyze a domain
   *
   * Flow:
   * 1. Check Redis cache (optional optimization)
   * 2. Check MongoDB cache
   * 3. If cache hit and not expired and forceRefresh=false → return cached
   * 4. Else → fetch fresh data, save to DB, save to Redis, return
   *
   * @param domain - Normalized domain string
   * @param forceRefresh - Force refresh even if cache exists
   * @returns Domain analysis result
   */
  async analyzeDomain(domain: string, forceRefresh = false): Promise<DomainAnalysisResult> {
    try {
      // 1. Check Redis cache (optional optimization)
      if (!forceRefresh) {
        const redisCached = await this.getFromRedisCache(domain);
        if (redisCached) {
          logger.info(`Domain analysis cache hit (Redis): ${domain}`);
          return redisCached;
        }
      }

      // 2. Check MongoDB cache
      if (!forceRefresh) {
        const dbCached = await this.getFromDbCache(domain);
        if (dbCached) {
          logger.info(`Domain analysis cache hit (MongoDB): ${domain}`);
          const result = this.dbModelToDto(dbCached, true);

          // Update Redis cache
          await this.setRedisCache(domain, result);

          return result;
        }
      }

      // 3. Fetch fresh data and calculate
      logger.info(`Fetching fresh domain analysis data: ${domain}`);
      const { result, linkMetricsSummary } = await this.fetchAndCalculate(domain);

      // 4. Save to MongoDB
      const dataForSeoMetrics = {
        referringDomains: result.referringDomains,
        backlinksTotal: result.backlinks.total,
        backlinksDofollow: result.backlinks.dofollow,
        backlinksNofollow: result.backlinks.nofollow,
      };

      await this.saveToDbCache(domain, dataForSeoMetrics, result.metrics, linkMetricsSummary);

      // 5. Save to Redis
      await this.setRedisCache(domain, result);

      return result;
    } catch (error) {
      logger.error(`Domain analysis error for ${domain}: ${error}`);
      throw error;
    }
  }
}

export const domainAnalysisService = new DomainAnalysisService();
