import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { API_ROUTES } from '@/common/constants/common';

import { WEBSITE_AUDIT_PATHS } from './router';
import { AuditWebsiteSchema } from './validationSchemas';

const AuditResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().nullable(),
});

export const websiteAuditorRegistry = new OpenAPIRegistry();

// Audit website
websiteAuditorRegistry.registerPath({
  method: 'post',
  path: `/api${API_ROUTES.WEBSITE_AUDIT}${WEBSITE_AUDIT_PATHS.AUDIT}`,
  description:
    `
    Audit a website by calling the AI service.
    - Authentication: Requires a valid JWT token.
    - When ` +
    '`AI_SERVICE_URL`' +
    ` is not configured, returns 503.
  `,
  tags: ['Website Auditor'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Website to audit',
      content: {
        'application/json': {
          schema: AuditWebsiteSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Website audit completed successfully',
      content: {
        'application/json': {
          schema: AuditResponseSchema,
        },
      },
    },
    503: {
      description: 'AI service unavailable (missing `AI_SERVICE_URL`)',
      content: {
        'application/json': {
          schema: AuditResponseSchema,
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
