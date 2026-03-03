import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { callAIServiceBacklinkIndex } from '@/common/services/aiService.client';
import { handleError } from '@/common/utils/handleError';

const sendResponse = (res: Response, success: boolean, message: string, data: unknown, statusCode: number) =>
  res.status(statusCode).json({ success, message, data });

/**
 * Discover and verify backlinks for a target domain or URL.
 * Calls AI service POST /api/v1/backlink-index.
 * Requires AI_SERVICE_URL to be set.
 */
export async function backlinkIndex(req: Request, res: Response) {
  try {
    const { url, max_backlinks, verify } = req.body;
    const result = await callAIServiceBacklinkIndex({ url, max_backlinks, verify });

    if (result == null) {
      return sendResponse(
        res,
        false,
        'Backlink indexer service unavailable. Set AI_SERVICE_URL to enable this feature.',
        null,
        StatusCodes.SERVICE_UNAVAILABLE
      );
    }

    return sendResponse(res, true, 'Backlink index analysis completed successfully', result, StatusCodes.OK);
  } catch (error) {
    handleError(error, res);
  }
}
