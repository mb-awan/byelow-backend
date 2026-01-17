import { z } from 'zod';

import { commonValidations } from '@/common/utils/commonValidation';
import { isValidDomain } from '@/common/utils/domainValidator';

// Custom domain validation
const domainSchema = z.string().refine(
  (val) => {
    try {
      return isValidDomain(val);
    } catch {
      return false;
    }
  },
  {
    message: 'Invalid domain format. Domain must be a valid domain name (no protocol, no path, no IPs, no localhost)',
  }
);

export const AnalyzeDomainSchema = z.object({
  domain: domainSchema,
  forceRefresh: z.boolean().optional().default(false),
});

export const GetAnalysisHistorySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
});

export const GetAnalysisByIdSchema = z.object({
  id: commonValidations.validaMongoId,
});
