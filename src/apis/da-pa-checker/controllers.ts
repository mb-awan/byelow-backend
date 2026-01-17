import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { DAPAAnalysis } from '@/common/models/dapaAnalysis';
import { domainAnalysisService } from '@/common/services/domainAnalysis.service';
import { normalizeDomain } from '@/common/utils/domainValidator';
import { handleError } from '@/common/utils/handleError';

// import { getBacklinkStats } from './services/backlink.service';
// import { calculateDA, calculatePA, calculateSpamScore } from './services/scoring.service';
// import { scrapePage } from './services/scraper.service';
// import { AuthorityResponse } from './types/authority.types';

// Helper to send dashboard-compatible response format
const sendResponse = (res: Response, success: boolean, message: string, data: any, statusCode: number) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

// export const analyzeDomain = async (req: Request, res: Response) => {
//   try {
//     const { domain, url, projectId } = req.body;
//     const userId = req.user?.id;

//     if (!userId) {
//       return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
//     }

//     // Validate input
//     if (!domain) {
//       return sendResponse(res, false, 'Domain is required', null, StatusCodes.BAD_REQUEST);
//     }

//     // // Get backlink stats (API now, crawler later)
//     // const backlinks = await getBacklinkStats(domain);

//     // // Get on-page signals (scraper) if URL is provided
//     // let pageSignals;
//     // if (url) {
//     //   pageSignals = await scrapePage(url);
//     // }

//     // // Normalize metrics
//     // const dofollowRatio = backlinks.backlinksDofollow / backlinks.backlinksTotal;

//     // // Calculate DA / PA / Spam
//     // const da = calculateDA({
//     //   referringDomains: backlinks.referringDomains,
//     //   backlinksTotal: backlinks.backlinksTotal,
//     //   backlinksDofollow: backlinks.backlinksDofollow,
//     //   linkQualityScore: backlinks.linkQualityScore,
//     //   domainAgeYears: 6, // TODO: Get from domain lookup service
//     //   anchorNaturalRatio: pageSignals?.anchorNaturalRatio,
//     // });

//     // const pa = url
//     //   ? calculatePA(
//     //       backlinks.referringDomains * 0.1, // Estimate page-level referring domains
//     //       backlinks.linkQualityScore,
//     //       pageSignals?.internalLinks || 0
//     //     )
//     //   : undefined;

//     // const spam = calculateSpamScore(dofollowRatio, pageSignals?.anchorNaturalRatio || 0.6);

//     // // Build AuthorityResponse
//     // const authorityResponse: AuthorityResponse = {
//     //   domain,
//     //   url,
//     //   domainAuthority: da,
//     //   pageAuthority: pa,
//     //   spamScore: spam,
//     //   backlinks: {
//     //     total: backlinks.backlinksTotal,
//     //     dofollow: backlinks.backlinksDofollow,
//     //     nofollow: backlinks.backlinksNofollow,
//     //   },
//     //   referringDomains: backlinks.referringDomains,
//     //   signals: {
//     //     domainAgeYears: 6, // TODO: Get from domain lookup service
//     //     dofollowRatio,
//     //     linkQualityScore: backlinks.linkQualityScore,
//     //     anchorNaturalRatio: pageSignals?.anchorNaturalRatio,
//     //   },
//     //   meta: {
//     //     calculatedAt: new Date().toISOString(),
//     //     dataSource: 'api',
//     //     cached: false,
//     //   },

//     const { target } = req.body;

//     const backlinks = await fetchBacklinks(target);
//     const refDomains = await fetchRefDomains(target);
//     const anchors = await fetchAnchors(target);
//     const domainRank = await fetchDomainRank(target);

//     return res.json({
//       success: true,
//       data: {
//         target,
//         da,
//         pa,
//         spamScore,
//         backlinks: {
//           total: backlinks.backlinks,
//           dofollow: backlinks.dofollow,
//           nofollow: backlinks.nofollow,
//         },
//         referringDomains: refDomains.referring_domains,
//         generatedAt: new Date().toISOString(),
//       },
//     });

//     // // Save to database (optional, for history tracking)
//     // const analysis = new DAPAAnalysis({
//     //   domain,
//     //   domainAuthority: da,
//     //   pageAuthority: pa || da, // Use DA if PA not calculated
//     //   totalBacklinks: backlinks.backlinksTotal,
//     //   referringDomains: backlinks.referringDomains,
//     //   dofollowLinks: backlinks.backlinksDofollow,
//     //   nofollowLinks: backlinks.backlinksNofollow,
//     //   spamScore: spam,
//     //   organicTrafficEstimate: 0, // TODO: Calculate from actual data
//     //   topBacklinks: [], // TODO: Get from backlink service
//     //   topAnchorTexts: [], // TODO: Get from scraper service
//     //   userId,
//     //   projectId: projectId || undefined,
//     // });

//     // await analysis.save();

//     // Cache + Respond
//     return sendResponse(res, true, 'Domain analysis completed successfully', authorityResponse, StatusCodes.CREATED);
//   } catch (error) {
//     handleError(error, res);
//   }
// };

/**
 * Analyze domain endpoint
 *
 * Routes:
 * - POST /api/analyze/domain (primary route as specified)
 * - POST /api/da-pa-checker/analyze (backward compatibility)
 *
 * This endpoint:
 * - Validates and normalizes the domain (rejects IPs, localhost, invalid formats)
 * - Checks cache (Redis + MongoDB) - respects 30-day TTL
 * - Fetches fresh data from DataForSEO if needed (only referring domains + backlinks summary)
 * - Calculates DA, PA, and SpamScore internally (all intelligence is internal)
 * - Stores results in MongoDB with TTL
 * - Returns formatted response with proper HTTP status codes
 *
 * Security & Cost Controls:
 * - Rate limited (50 requests per 15 minutes per IP)
 * - Prevents multiple refresh calls via rate limiting
 * - Fails gracefully if DataForSEO is unavailable
 *
 * PHASE 2 TODO:
 * - Replace DataForSEO backlink verification with internal crawler
 * - Store link graph in MongoDB
 * - Implement homepage crawl + internal link analysis for better PA calculation
 *
 * PHASE 3 TODO:
 * - Replace DataForSEO entirely with internal backlink discovery crawler
 * - Implement full backlink discovery crawler
 * - Add historical link tracking
 * - Implement learning-based spam detection
 */
export async function analyzeDomain(req: Request, res: Response) {
  try {
    const { domain, forceRefresh } = req.body;

    // Normalize domain (validation already done by schema)
    const normalizedDomain = normalizeDomain(domain);

    // Log API usage for monitoring
    // TODO: Add proper API usage logging/metrics collection
    // logger.info(`Domain analysis request: ${normalizedDomain}, forceRefresh: ${forceRefresh}`);

    // Analyze domain using the service
    const result = await domainAnalysisService.analyzeDomain(normalizedDomain, forceRefresh || false);

    // Return success response with proper HTTP status code
    return sendResponse(res, true, 'Domain analysis completed successfully', result, StatusCodes.OK);
  } catch (error) {
    // Error handling is done by handleError middleware
    // It will return appropriate HTTP status codes and error messages
    handleError(error, res);
  }
}

export const getAnalysisHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt((req.query.limit as string) || '10');

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    const analyses = await DAPAAnalysis.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();

    return sendResponse(res, true, 'Analysis history retrieved successfully', analyses, StatusCodes.OK);
  } catch (error) {
    handleError(error, res);
  }
};

export const getAnalysisById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    const analysis = await DAPAAnalysis.findOne({
      _id: id,
      userId,
    }).exec();

    if (!analysis) {
      return sendResponse(res, false, 'Analysis not found', null, StatusCodes.NOT_FOUND);
    }

    return sendResponse(res, true, 'Analysis retrieved successfully', analysis, StatusCodes.OK);
  } catch (error) {
    handleError(error, res);
  }
};
