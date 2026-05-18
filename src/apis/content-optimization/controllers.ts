import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { callAIServiceContentOptimize } from '@/common/services/aiService.client';
import { handleError } from '@/common/utils/handleError';

import { toContentOptimizeDashboardResponse } from './mappers';

const sendResponse = (res: Response, success: boolean, message: string, data: unknown, statusCode: number) =>
  res.status(statusCode).json({ success, message, data });

/**
 * Analyze and optimize webpage content for SEO.
 * Calls AI service POST /api/v1/content-optimize.
 * Requires AI_SERVICE_URL to be set.
 */
export async function contentOptimize(req: Request, res: Response) {
  try {
    const { url, keywords, country, language } = req.body;
    const result = await callAIServiceContentOptimize({ url, keywords, country, language });

    if (result == null) {
      return sendResponse(
        res,
        false,
        'Content optimization service unavailable. Set AI_SERVICE_URL to enable this feature.',
        null,
        StatusCodes.SERVICE_UNAVAILABLE
      );
    }

    const responseData = toContentOptimizeDashboardResponse(result);
    return sendResponse(
      res,
      true,
      'Content optimization analysis completed successfully',
      responseData,
      StatusCodes.OK
    );
  } catch (error) {
    handleError(error, res);
  }
}
