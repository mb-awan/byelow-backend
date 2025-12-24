import { z } from 'zod';

import { commonValidations } from '@/common/utils/commonValidation';

export const AnalyzeDomainSchema = z.object({
  domain: commonValidations.domain,
  projectId: commonValidations.validaMongoId.optional(),
});

export const GetAnalysisHistorySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
});

export const GetAnalysisByIdSchema = z.object({
  id: commonValidations.validaMongoId,
});


