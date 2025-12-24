import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { API_ROUTES } from '@/common/constants/common';

import { USER_PATHS } from './router';
import {
  ChangePasswordValidationSchema,
  DeleteUserValidationSchema,
  OTPValidationSchema,
  UpdatePasswordValidationSchema,
  UpdateUserValidationSchema,
  updateDescribedUserRoleValidateSchema,
  userSchema,
} from './validationSchemas';

export const userRegistry = new OpenAPIRegistry();

// Register get me path
userRegistry.registerPath({
  method: 'get',
  description: `
      This endpoint retrieves the authenticated user's profile information:
      - Authentication: Requires a valid JWT token.
      - Email Verification: Requires the user's email to be verified.
      - Phone Verification: Requires the user's phone number to be verified.
      `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.GET_ME}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
            users: userSchema,
          }),
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    403: {
      description: 'Not authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});
// update user profile

userRegistry.registerPath({
  method: 'put',
  description: `
    This endpoint updates the authenticated user's profile information:
      - Authentication: Requires a valid JWT token.
      - Email Verification: Requires the user's email to be verified.
      - Phone Verification: Requires the user's phone number to be verified.
  `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.UPDATE_ME}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'User profile update details',
      content: {
        'application/json': {
          schema: UpdateUserValidationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            data: userSchema,
            success: z.boolean().default(true),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

// Delete User

userRegistry.registerPath({
  method: 'delete',
  description: `
        This endpoint deletes the authenticated user's account:
          - Authentication: Requires a valid JWT token.
          - Email Verification: Requires the user's email to be verified.
          - Phone Verification: Requires the user's phone number to be verified.
      `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.DELETE_ME}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'User account deletion details',
      content: {
        'application/json': {
          schema: DeleteUserValidationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
            data: userSchema.nullable(),
          }),
        },
      },
    },
    400: {
      description: 'Invalid input',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

userRegistry.registerPath({
  method: 'post',
  description: `
    This endpoint allows authenticated users to request a password update:
      - Authentication: Requires a valid JWT token.
      - Email Verification: Requires the user's email to be verified.
      - Phone Verification: Requires the user's phone number to be verified.
  `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.REQUEST_UPDATE_PASSWORD}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Password update request sent successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

userRegistry.registerPath({
  method: 'put',
  description: `
        This endpoint allows authenticated users to Update their Password:
      - Authentication: Requires a valid JWT token.
      - Status Update: Updates the user's Password .
      `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.UPDATE_PASSWORD}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Update password details',
      content: {
        'application/json': {
          schema: UpdatePasswordValidationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

// Change Password Using Current Password

userRegistry.registerPath({
  method: 'put',
  description: `
        This endpoint allows authenticated users to Change their Password Using the Current Password:
      - Authentication: Requires a valid JWT token.
      - Status Update: Updates the user's Password.
      `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.CHANGE_PASSWORD_USING_CURRENT_PASSWORD}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Update password details',
      content: {
        'application/json': {
          schema: ChangePasswordValidationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

userRegistry.registerPath({
  method: 'post',
  description: `
        This endpoint allows authenticated users to upload a profile picture:
          - Authentication: Requires a valid JWT token.
          - File Upload: Accepts a single image file named 'profilePicture'.
          - User Status Checks: Ensures the user is not deleted or blocked.
          - Cloud Storage: Uploads the file to Cloudinary and updates the user's profile picture URL.
      `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.UPLOAD_PROFILE_PIC}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Profile picture upload',
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              profilePicture: {
                type: 'string',
                format: 'binary',
              },
            },
            required: ['profilePicture'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile picture uploaded successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            data: z.object({
              message: z.string(),
              success: z.boolean().default(true),
              profilePicture: z.string(),
            }),
          }),
        },
      },
    },
    400: {
      description: 'No file uploaded or invalid file format',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    401: {
      description: 'Not authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

userRegistry.registerPath({
  method: 'put',
  description: `
        This endpoint allows authenticated users to enable two-factor authentication (TFA):
          - Authentication: Requires a valid JWT token.
          - TFA Setup: Updates the user's record to indicate that TFA is enabled.
      `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.ENABLE_TWO_FACTOR_AUTHENTICATION}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Two-factor authentication enabled successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request ',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not authorized ',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    403: {
      description: 'Forbidden ',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean(),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

userRegistry.registerPath({
  method: 'put',
  description: `
        This endpoint allows authenticated users to disable two-factor authentication (TFA):
          - Authentication: Requires a valid JWT token.
          - TFA Setup: Updates the user's record to indicate that TFA is disabled.
      `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.DISABLE_TWO_FACTOR_AUTHENTICATION}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Two-factor authentication disabled successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request ',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not authorized ',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    403: {
      description: 'Forbidden ',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean(),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

// generate email verification otp
userRegistry.registerPath({
  method: 'put',
  description: `
    This endpoint generates an OTP for email verification:
      - Authentication: User must be authenticated.
      - OTP Generation: Generate and send OTP to the user's email.
  `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.REQUEST_EMAIL_VERIFICATION_OTP}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'OTP sent successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
          }),
        },
      },
    },
    400: {
      description: 'Invalid Input',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Invalid Token',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    403: {
      description: 'User is blocked',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    404: {
      description: 'Not Found',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

// verify email
userRegistry.registerPath({
  method: 'put',
  description: `
    This endpoint allows users to verify their email using an OTP:
      - Validation: Ensure the OTP is correct.
      - Database Interaction: Update the user's email verification status if the OTP is valid.
  `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.VERIFY_EMAIL}`,
  tags: ['User'],
  request: {
    query: OTPValidationSchema,
  },
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Email verified successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
          }),
        },
      },
    },
    400: {
      description: 'Invalid OTP',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not Authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    404: {
      description: 'Not found',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

// generate phone verification otp
userRegistry.registerPath({
  method: 'put',
  description: `
    This endpoint generates an OTP for phone verification:
      - Authentication: User must be authenticated.
      - OTP Generation: Generate and send OTP to the user's phone.
  `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.REQUEST_EMAIL_VERIFICATION_OTP}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'OTP generated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
          }),
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(false),
            message: z.string(),
            responseObject: z.object({}).nullable().optional(),
            statusCode: z.number().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Not Authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    404: {
      description: 'Not Found',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
          }),
        },
      },
    },
  },
});

// Request phone verification OTP
userRegistry.registerPath({
  method: 'put',
  description: `
    This endpoint generates an OTP for phone verification:
      - Authentication: User must be authenticated.
      - OTP Generation: Generate and send OTP to the user's phone.
  `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.REQUEST_PHONE_VERIFICATION_OTP}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'OTP sent successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
            data: z.null().optional(),
          }),
        },
      },
    },
    400: {
      description: 'Bad request',
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
      description: 'Not Authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            data: z.null(),
          }),
        },
      },
    },
    404: {
      description: 'Not Found',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
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
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
            data: z.null(),
          }),
        },
      },
    },
  },
});

// verify phone
userRegistry.registerPath({
  method: 'put',
  description: `
    This endpoint allows users to verify their phone number using an OTP:
      - Validation: Ensure the OTP is correct.
      - Database Interaction: Update the user's phone verification status if the OTP is valid.
  `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.VERIFY_PHONE}`,
  request: {
    query: OTPValidationSchema,
  },
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Phone verified successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
            data: z.null().optional(),
          }),
        },
      },
    },
    400: {
      description: 'Invalid OTP',
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
      description: 'Not Authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
            data: z.null(),
          }),
        },
      },
    },
    404: {
      description: 'Not found',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
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
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
            data: z.null(),
          }),
        },
      },
    },
  },
});

// Update described user role
userRegistry.registerPath({
  method: 'put',
  description: `
    This endpoint allows authenticated users to update their described roles:
      - Authentication: Requires a valid JWT token.
      - Updates: Updates the user's described roles array.
  `,
  path: `/api${API_ROUTES.USERS}${USER_PATHS.DESCRIBED_ROLES}`,
  tags: ['User'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      description: 'Described roles update',
      content: {
        'application/json': {
          schema: updateDescribedUserRoleValidateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Described roles updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(true),
            data: userSchema.nullable().optional(),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request',
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
      description: 'Not authorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            success: z.boolean().default(false),
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
            message: z.string(),
            success: z.boolean().default(false),
            error: z.object({}).nullable(),
            data: z.null(),
          }),
        },
      },
    },
  },
});
