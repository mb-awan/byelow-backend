import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { domainAnalysisService } from '@/common/services/domainAnalysis.service';
import { normalizeDomain } from '@/common/utils/domainValidator';
import { handleError } from '@/common/utils/handleError';

/**
 * Public domain analysis for landing-page DA/PA checker (no auth).
 * Returns nested DomainAnalysisResult shape expected by byelow-frontend.
 */
export async function analyzeDomainPublic(req: Request, res: Response) {
  try {
    const { domain, forceRefresh } = req.body;
    const normalizedDomain = normalizeDomain(domain);
    const result = await domainAnalysisService.analyzeDomain(normalizedDomain, forceRefresh || false);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Domain analysis completed successfully',
      data: result,
    });
  } catch (error) {
    handleError(error, res);
  }
}
