import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { API_ROUTES } from '@/common/constants/common';

import { CONTENT_OPTIMIZATION_PATHS } from './router';
import { ContentOptimizeSchema } from './validationSchemas';

const ContentOptimizeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().nullable(),
});

export const contentOptimizationRegistry = new OpenAPIRegistry();

// Content optimization
contentOptimizationRegistry.registerPath({
  method: 'post',
  path: `/api${API_ROUTES.CONTENT_OPTIMIZATION}${CONTENT_OPTIMIZATION_PATHS.OPTIMIZE}`,
  description: `
    Optimize webpage content for SEO by calling the AI service.
    - Authentication: Requires a valid JWT token.
    - When \`AI_SERVICE_URL\` is not configured, returns 503.
  `,
  tags: ['Content Optimization'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Content optimization request',
      content: {
        'application/json': {
          schema: ContentOptimizeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Content optimization completed successfully',
      content: {
        'application/json': {
          schema: ContentOptimizeResponseSchema,
        },
      },
    },
    503: {
      description: 'AI service unavailable (missing `AI_SERVICE_URL`)',
      content: {
        'application/json': {
          schema: ContentOptimizeResponseSchema,
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
