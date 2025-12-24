import { z } from 'zod';

import { UserRoles, UserStatus } from '@/common/constants/enums';
import { commonValidations, UsernameValidationShcema } from '@/common/utils/commonValidation';

// Address update schema
const updateAddressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  })
  .strict();

export const UpdateUserValidationSchema = z
  .object({
    firstName: z.string().optional(),

    lastName: z.string().optional(),

    username: UsernameValidationShcema.optional(),

    phone: z.string().optional(),

    currentAddress: updateAddressSchema.optional(),

    postalAddress: updateAddressSchema.optional(),
  })
  .strict();

export const DeleteUserValidationSchema = commonValidations.userUniqueSearchKeys;

export const userSchema = z.object({
  id: commonValidations.validaMongoId,

  firstName: z.string().optional(),

  lastName: z.string().optional(),

  username: commonValidations.username,

  email: z.string(),

  role: z.object({
    id: commonValidations.validaMongoId,
    name: z.nativeEnum(UserRoles),
  }),

  status: z.nativeEnum(UserStatus),

  phone: z.string(),

  address: commonValidations.address,

  emailVerified: z.boolean(),

  phoneVerified: z.boolean(),

  createdAt: z.string(),

  updatedAt: z.string(),

  profilePicture: z.string().url().optional(),
});

export const OTPValidationSchema = z
  .object({
    otp: z.string({ required_error: 'OTP Required' }).min(6).max(6),
  })
  .strict();

export const UpdatePasswordValidationSchema = z
  .object({
    password: commonValidations.password,

    confirmPassword: commonValidations.password,
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'], // path of error
    message: 'Passwords must match',
  });

export const ChangePasswordValidationSchema = z
  .object({
    currentPassword: commonValidations.password.optional(),
    password: commonValidations.password,
    confirmPassword: commonValidations.password,
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'], // path of error
    message: 'Passwords must match',
  });

export const updateDescribedUserRoleValidateSchema = z.object({
  roles: z.array(z.string().min(1).max(255)),
});
