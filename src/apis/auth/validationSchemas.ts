import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { commonValidations } from '@/common/utils/commonValidation';

extendZodWithOpenApi(z);

export const RegisterUserValidationSchema = z
  .object({
    firstName: z.string().optional(),

    lastName: z.string().optional(),

    email: z.string().email('Invalid email address'),

    password: commonValidations.password,

    confirmPassword: commonValidations.password,
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  });

export const LoginUserValidationSchema = z
  .object({
    identifier: commonValidations.identifier,
    password: commonValidations.password,

    fromAdminPanel: z.boolean().optional().default(false).describe('to test that the login request is from admin'),
  })
  .strict();

export const UsernameValidationShema = z
  .object({
    username: commonValidations.username,
  })
  .strict();

export const EmailValidationShema = z
  .object({
    email: commonValidations.email,
  })
  .strict();

export const RequestForgotPasswordValidationSchema = z.object({
  identifier: commonValidations.identifier,
});

const OtpWithIdentifierValidationSchema = z
  .object({
    otp: z.string({ required_error: 'please provide the OTP' }).min(6).max(6),

    identifier: commonValidations.identifier,
  })
  .strict();

export const VerifyForgotPasswordValidationSchema = OtpWithIdentifierValidationSchema;

export const VerifyTwoFactorAuthenticationValidationSchema = OtpWithIdentifierValidationSchema;

export const ResendTFAOTPValidationSchema = z.object({
  identifier: commonValidations.identifier,
});
