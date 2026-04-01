import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { API_ROUTES } from '@/common/constants/common';

import { AnalyzeDomainSchema } from '../da-pa-checker/validationSchemas';

const AnalyzeDomainAliasResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().nullable(),
});

export const analyzeRegistry = new OpenAPIRegistry();

// POST /api/analyze/domain
analyzeRegistry.registerPath({
  method: 'post',
  path: `/api${API_ROUTES.ANALYZE}/domain`,
  description: `
    Alias endpoint for DA/PA analysis.
    - Authentication: Requires a valid JWT token.
    - This route forwards to the DA/PA checker analysis logic.
  `,
  tags: ['DA/PA Checker'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Domain analysis request',
      content: {
        'application/json': {
          schema: AnalyzeDomainSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Domain analysis completed successfully',
      content: {
        'application/json': {
          schema: AnalyzeDomainAliasResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing token',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            data: z.null(),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            data: z.null(),
          }),
        },
      },
    },
  },
});
