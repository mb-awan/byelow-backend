import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { API_ROUTES } from '@/common/constants/common';

import { DA_PA_CHECKER_PATHS } from './router';
import { AnalyzeDomainSchema, GetAnalysisByIdSchema, GetAnalysisHistorySchema } from './validationSchemas';

// DA/PA Analysis schemas for API docs
const BacklinkSchema = z.object({
  domain: z.string(),
  domainAuthority: z.number().min(0).max(100),
  linkType: z.enum(['dofollow', 'nofollow']),
  anchorText: z.string(),
});

const AnchorTextSchema = z.object({
  text: z.string(),
  count: z.number().min(0),
});

const DAPAAnalysisSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  projectId: z.string().nullable().optional(),
  domain: z.string(),
  domainAuthority: z.number().min(0).max(100),
  pageAuthority: z.number().min(0).max(100),
  totalBacklinks: z.number().min(0),
  referringDomains: z.number().min(0),
  dofollowLinks: z.number().min(0),
  nofollowLinks: z.number().min(0),
  spamScore: z.number().min(0).max(100),
  organicTrafficEstimate: z.number().min(0),
  topBacklinks: z.array(BacklinkSchema),
  topAnchorTexts: z.array(AnchorTextSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const DAPAAnalysisResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: DAPAAnalysisSchema.nullable(),
});

const DAPAAnalysisListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(DAPAAnalysisSchema),
});

export const daPaCheckerRegistry = new OpenAPIRegistry();

// Analyze domain
daPaCheckerRegistry.registerPath({
  method: 'post',
  path: `/api${API_ROUTES.DA_PA_CHECKER}${DA_PA_CHECKER_PATHS.ANALYZE}`,
  description: `
    Analyze a domain's Domain Authority (DA) and Page Authority (PA).
    - Authentication: Requires a valid JWT token.
    - Validation: Domain must be in valid format.
    - Optional: Can associate analysis with a project by providing projectId.
    - Returns: Complete DA/PA analysis with backlinks, anchor texts, and metrics.
    - Note: Currently returns dummy data. Real API integration (Moz, Ahrefs) pending.
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
    201: {
      description: 'Domain analysis completed successfully',
      content: {
        'application/json': {
          schema: DAPAAnalysisResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid domain format',
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

// Get analysis history
daPaCheckerRegistry.registerPath({
  method: 'get',
  path: `/api${API_ROUTES.DA_PA_CHECKER}${DA_PA_CHECKER_PATHS.HISTORY}`,
  description: `
    Get analysis history for the authenticated user.
    - Authentication: Requires a valid JWT token.
    - Query Parameters: Optional limit (default: 10, max: 100) to limit results.
    - Returns: List of recent analyses sorted by creation date (newest first).
  `,
  tags: ['DA/PA Checker'],
  security: [{ bearerAuth: [] }],
  request: {
    query: GetAnalysisHistorySchema,
  },
  responses: {
    200: {
      description: 'Analysis history retrieved successfully',
      content: {
        'application/json': {
          schema: DAPAAnalysisListResponseSchema,
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

// Get analysis by ID
daPaCheckerRegistry.registerPath({
  method: 'get',
  path: `/api${API_ROUTES.DA_PA_CHECKER}${DA_PA_CHECKER_PATHS.GET_BY_ID}`,
  description: `
    Get a specific DA/PA analysis by ID.
    - Authentication: Requires a valid JWT token.
    - Returns: Complete analysis details if found and belongs to the user.
  `,
  tags: ['DA/PA Checker'],
  security: [{ bearerAuth: [] }],
  request: {
    params: GetAnalysisByIdSchema,
  },
  responses: {
    200: {
      description: 'Analysis retrieved successfully',
      content: {
        'application/json': {
          schema: DAPAAnalysisResponseSchema,
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
    404: {
      description: 'Analysis not found',
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

