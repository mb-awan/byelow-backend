import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { callAIServiceAudit } from '@/common/services/aiService.client';
import { handleError } from '@/common/utils/handleError';

const sendResponse = (res: Response, success: boolean, message: string, data: unknown, statusCode: number) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

/**
 * Audit website — calls AI service POST /api/v1/audit.
 * Requires AI_SERVICE_URL to be set.
 */
export async function auditWebsite(req: Request, res: Response) {
  try {
    const { url } = req.body;
    const result = await callAIServiceAudit(url);
    if (result == null) {
      return sendResponse(
        res,
        false,
        'Audit service unavailable. Set AI_SERVICE_URL to use the website auditor.',
        null,
        StatusCodes.SERVICE_UNAVAILABLE
      );
    }
    return sendResponse(res, true, 'Website audit completed successfully', result, StatusCodes.OK);
  } catch (error) {
    handleError(error, res);
  }
}
