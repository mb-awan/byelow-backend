import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { DAPAAnalysis, IDAPAAnalysis } from '@/common/models/dapaAnalysis';
import { handleError } from '@/common/utils/handleError';

// Helper to send dashboard-compatible response format
const sendResponse = (res: Response, success: boolean, message: string, data: any, statusCode: number) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

// Generate dummy DA/PA analysis data
function generateDummyAnalysis(domain: string): Omit<IDAPAAnalysis, keyof Document | 'userId' | 'projectId' | 'createdAt' | 'updatedAt'> {
  const domainAuthority = Math.floor(Math.random() * 50) + 30; // 30-80
  const pageAuthority = Math.floor(Math.random() * 10) + (domainAuthority - 10); // PA usually close to DA
  const totalBacklinks = Math.floor(Math.random() * 2000) + 500;
  const referringDomains = Math.floor(totalBacklinks * 0.3);
  const dofollowLinks = Math.floor(totalBacklinks * 0.7);
  const nofollowLinks = totalBacklinks - dofollowLinks;
  const spamScore = Math.floor(Math.random() * 10);
  const organicTrafficEstimate = Math.floor(Math.random() * 20000) + 5000;

  const topBacklinks = [
    { domain: 'techcrunch.com', domainAuthority: 93, linkType: 'dofollow' as const, anchor: 'innovation' },
    { domain: 'forbes.com', domainAuthority: 95, linkType: 'dofollow' as const, anchor: 'technology' },
    { domain: 'medium.com', domainAuthority: 86, linkType: 'nofollow' as const, anchor: 'startup' },
    { domain: 'reddit.com', domainAuthority: 91, linkType: 'nofollow' as const, anchor: 'discussion' },
    { domain: 'github.com', domainAuthority: 94, linkType: 'dofollow' as const, anchor: 'open source' },
  ].map((link) => ({
    domain: link.domain,
    domainAuthority: link.domainAuthority,
    linkType: link.linkType,
    anchorText: link.anchor,
  }));

  const topAnchorTexts = [
    { text: 'brand name', count: Math.floor(Math.random() * 100) + 50 },
    { text: 'click here', count: Math.floor(Math.random() * 80) + 30 },
    { text: 'homepage', count: Math.floor(Math.random() * 60) + 20 },
    { text: 'technology', count: Math.floor(Math.random() * 40) + 15 },
    { text: 'innovation', count: Math.floor(Math.random() * 30) + 10 },
  ];

  return {
    domain,
    domainAuthority,
    pageAuthority,
    totalBacklinks,
    referringDomains,
    dofollowLinks,
    nofollowLinks,
    spamScore,
    organicTrafficEstimate,
    topBacklinks,
    topAnchorTexts,
  };
}

export const analyzeDomain = async (req: Request, res: Response) => {
  try {
    const { domain, projectId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    // Check if user exists and has remaining checks
    // TODO: Add proper user validation and usage tracking

    const analysisData = generateDummyAnalysis(domain);

    const analysis = new DAPAAnalysis({
      ...analysisData,
      userId,
      projectId: projectId || undefined,
    });

    await analysis.save();

    return sendResponse(res, true, 'Domain analysis completed successfully', analysis, StatusCodes.CREATED);
  } catch (error) {
    handleError(error, res);
  }
};

export const getAnalysisHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt((req.query.limit as string) || '10');

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    const analyses = await DAPAAnalysis.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

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

