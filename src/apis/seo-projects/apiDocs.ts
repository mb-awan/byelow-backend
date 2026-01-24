import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { API_ROUTES } from '@/common/constants/common';

import { SEO_PROJECTS_PATHS } from './router';
import {
  CreateSEOProjectSchema,
  DeleteSEOProjectSchema,
  GetSEOProjectByIdSchema,
  UpdateSEOProjectSchema,
} from './validationSchemas';

// SEO Project schemas for API docs
const SEOProjectSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  name: z.string(),
  domain: z.string(),
  healthScore: z.number().min(0).max(100),
  status: z.enum(['active', 'inactive', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const SEOProjectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: SEOProjectSchema.nullable(),
});

const SEOProjectsListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(SEOProjectSchema),
});

export const seoProjectsRegistry = new OpenAPIRegistry();

// Get all SEO projects
seoProjectsRegistry.registerPath({
  method: 'get',
  path: `/api${API_ROUTES.PROJECTS}${SEO_PROJECTS_PATHS.GET_PROJECTS}`,
  description: `
    Get all SEO projects for the authenticated user.
    - Authentication: Requires a valid JWT token.
    - Returns: List of active SEO projects belonging to the user.
  `,
  tags: ['SEO Projects'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Projects retrieved successfully',
      content: {
        'application/json': {
          schema: SEOProjectsListResponseSchema,
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

// Create SEO project
seoProjectsRegistry.registerPath({
  method: 'post',
  path: `/api${API_ROUTES.PROJECTS}${SEO_PROJECTS_PATHS.CREATE_PROJECT}`,
  description: `
    Create a new SEO project.
    - Authentication: Requires a valid JWT token.
    - Validation: Name and domain are required. Domain must be valid format.
    - Returns: Created project with default healthScore (0) and status (active).
  `,
  tags: ['SEO Projects'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Project creation details',
      content: {
        'application/json': {
          schema: CreateSEOProjectSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Project created successfully',
      content: {
        'application/json': {
          schema: SEOProjectResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid input or duplicate domain',
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

// Get SEO project by ID
seoProjectsRegistry.registerPath({
  method: 'get',
  path: `/api${API_ROUTES.PROJECTS}${SEO_PROJECTS_PATHS.GET_PROJECT_BY_ID}`,
  description: `
    Get a specific SEO project by ID.
    - Authentication: Requires a valid JWT token.
    - Returns: Project details if found and belongs to the user.
  `,
  tags: ['SEO Projects'],
  security: [{ bearerAuth: [] }],
  request: {
    params: GetSEOProjectByIdSchema,
  },
  responses: {
    200: {
      description: 'Project retrieved successfully',
      content: {
        'application/json': {
          schema: SEOProjectResponseSchema,
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
      description: 'Project not found',
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

// Update SEO project
seoProjectsRegistry.registerPath({
  method: 'patch',
  path: `/api${API_ROUTES.PROJECTS}${SEO_PROJECTS_PATHS.UPDATE_PROJECT}`,
  description: `
    Update an existing SEO project.
    - Authentication: Requires a valid JWT token.
    - Validation: All fields are optional. Only provided fields will be updated.
    - Returns: Updated project details.
  `,
  tags: ['SEO Projects'],
  security: [{ bearerAuth: [] }],
  request: {
    params: GetSEOProjectByIdSchema,
    body: {
      description: 'Project update details',
      content: {
        'application/json': {
          schema: UpdateSEOProjectSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Project updated successfully',
      content: {
        'application/json': {
          schema: SEOProjectResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid input',
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
    404: {
      description: 'Project not found',
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

// Delete SEO project
seoProjectsRegistry.registerPath({
  method: 'delete',
  path: `/api${API_ROUTES.PROJECTS}${SEO_PROJECTS_PATHS.DELETE_PROJECT}`,
  description: `
    Delete (archive) an SEO project.
    - Authentication: Requires a valid JWT token.
    - Soft Delete: Project status is set to 'archived' instead of being permanently deleted.
    - Returns: Success message.
  `,
  tags: ['SEO Projects'],
  security: [{ bearerAuth: [] }],
  request: {
    params: DeleteSEOProjectSchema,
  },
  responses: {
    200: {
      description: 'Project deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
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
    404: {
      description: 'Project not found',
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
