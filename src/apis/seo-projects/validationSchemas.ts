import { z } from 'zod';

import { commonValidations } from '@/common/utils/commonValidation';

export const CreateSEOProjectSchema = z.object({
  name: z.string().min(1).max(255),
  domain: commonValidations.domain,
});

export const UpdateSEOProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: commonValidations.domain.optional(),
  healthScore: z.number().min(0).max(100).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const GetSEOProjectByIdSchema = z.object({
  id: commonValidations.validaMongoId,
});

export const DeleteSEOProjectSchema = z.object({
  id: commonValidations.validaMongoId,
});










