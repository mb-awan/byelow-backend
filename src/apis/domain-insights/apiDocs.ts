import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { API_ROUTES } from '@/common/constants/common';

import { GetOverviewSchema } from './validationSchemas';

const OverviewDataSchema = z.object({
  domains: z.array(z.any()),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

const OverviewResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: OverviewDataSchema.nullable(),
});

export const domainInsightsRegistry = new OpenAPIRegistry();

domainInsightsRegistry.registerPath({
  method: 'get',
  path: `/api${API_ROUTES.DOMAIN_INSIGHTS}`,
  description: `
    Returns a summary of the latest DA/PA analysis data per domain for the authenticated user.
    - Authentication: Requires a valid JWT token.
    - Query: optional domain filter, section filter (comma-separated: seo, backlinks, content, audit), pagination.
  `,
  tags: ['Domain Insights'],
  security: [{ bearerAuth: [] }],
  request: {
    query: GetOverviewSchema,
  },
  responses: {
    200: {
      description: 'Overview retrieved successfully',
      content: {
        'application/json': {
          schema: OverviewResponseSchema,
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
