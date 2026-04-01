import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { API_ROUTES } from '@/common/constants/common';

import { BACKLINK_INDEXER_PATHS } from './router';
import { BacklinkIndexSchema } from './validationSchemas';

const BacklinkIndexResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().nullable(),
});

export const backlinkIndexerRegistry = new OpenAPIRegistry();

// Backlink indexer
backlinkIndexerRegistry.registerPath({
  method: 'post',
  path: `/api${API_ROUTES.BACKLINK_INDEXER}${BACKLINK_INDEXER_PATHS.INDEX}`,
  description: `
    Discover and verify backlinks for a domain or URL by calling the AI service.
    - Authentication: Requires a valid JWT token.
    - When \`AI_SERVICE_URL\` is not configured, returns 503.
  `,
  tags: ['Backlink Indexer'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Backlink index request',
      content: {
        'application/json': {
          schema: BacklinkIndexSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Backlink index completed successfully',
      content: {
        'application/json': {
          schema: BacklinkIndexResponseSchema,
        },
      },
    },
    503: {
      description: 'AI service unavailable (missing `AI_SERVICE_URL`)',
      content: {
        'application/json': {
          schema: BacklinkIndexResponseSchema,
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
