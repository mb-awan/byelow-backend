import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { DAPAAnalysis } from '@/common/models/dapaAnalysis';
import { normalizeDomain } from '@/common/utils/domainValidator';
import { handleError } from '@/common/utils/handleError';

import { OverviewSection } from './validationSchemas';

const sendResponse = (res: Response, success: boolean, message: string, data: unknown, statusCode: number) => {
  return res.status(statusCode).json({ success, message, data });
};

/**
 * GET /api/overview
 *
 * Returns a summary of the latest analysis data per domain for the authenticated user.
 *
 * Query params:
 *   - domain   (optional) Filter to a specific domain
 *   - section  (optional) Comma-separated list of sections: seo, backlinks, content, audit (default: all)
 *   - limit    (optional, default 10, max 50) Number of domains per page
 *   - page     (optional, default 1) Page number
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    const VALID_SECTIONS: OverviewSection[] = ['seo', 'backlinks', 'content', 'audit'];
    const rawSection = req.query.section as string | undefined;
    const sections: OverviewSection[] = rawSection
      ? (rawSection
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter((s): s is OverviewSection => VALID_SECTIONS.includes(s as OverviewSection)) as OverviewSection[])
      : VALID_SECTIONS;
    const limit = parseInt((req.query.limit as string) || '10');
    const page = parseInt((req.query.page as string) || '1');
    const skip = (page - 1) * limit;
    const rawDomain = req.query.domain as string | undefined;

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const matchStage: mongoose.PipelineStage.Match['$match'] = { userId: userObjectId };
    if (rawDomain) {
      matchStage['domain'] = normalizeDomain(rawDomain);
    }

    // Get total count of unique domains for this user (with optional domain filter)
    const countPipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      { $group: { _id: '$domain' } },
      { $count: 'total' },
    ];
    const countResult = await DAPAAnalysis.aggregate(countPipeline).exec();
    const total = countResult[0]?.total ?? 0;

    // Get latest record per domain (paginated)
    const dataPipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$domain',
          latest: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latest' } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const analyses = await DAPAAnalysis.aggregate(dataPipeline).exec();

    const domains = analyses.map((analysis) => {
      const entry: Record<string, unknown> = {
        domain: analysis.domain,
        lastAnalyzed: analysis.createdAt,
      };

      if (sections.includes('seo')) {
        entry['seo'] = {
          da: analysis.domainAuthority,
          pa: analysis.pageAuthority,
          spamScore: analysis.spamScore,
          referringDomains: analysis.referringDomains,
          organicTrafficEstimate: analysis.organicTrafficEstimate,
        };
      }

      if (sections.includes('backlinks')) {
        entry['backlinks'] = {
          total: analysis.totalBacklinks,
          dofollow: analysis.dofollowLinks,
          nofollow: analysis.nofollowLinks,
          topBacklinks: analysis.topBacklinks ?? [],
          topAnchorTexts: analysis.topAnchorTexts ?? [],
        };
      }

      // Placeholders for sections not yet stored server-side
      if (sections.includes('content')) {
        entry['content'] = null;
      }

      if (sections.includes('audit')) {
        entry['audit'] = null;
      }

      return entry;
    });

    return sendResponse(res, true, 'Overview retrieved successfully', { domains, total, page, limit }, StatusCodes.OK);
  } catch (error) {
    handleError(error, res);
  }
};
