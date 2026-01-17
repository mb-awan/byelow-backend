import { z } from 'zod';

const validaMongoIdSchema = z.string().regex(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i, 'Invalid MongoDB ObjectId');

export const UsernameValidationShcema = z
  .string({ required_error: 'username is required' })
  .regex(/^[^\sA-Z]*$/, "Username can't contain spaces or uppercase letters")
  .min(3)
  .max(50);

const UserUniqueSearchKeys = z
  .object({
    id: validaMongoIdSchema.optional(),

    username: UsernameValidationShcema.optional(),

    email: z.string().email().optional(),

    phone: z.string().min(2).optional(),
  })
  .strict()
  .refine((data) => data.email || data.id || data.username || data.phone, {
    path: ['id', 'username', 'email', 'phone'],
    message: 'At least one of userId, email, username, or phone must be provided',
  });

export const AddressValidateSchema = z
  .object({
    street: z.string({ required_error: 'Street is required' }),
    city: z.string({ required_error: 'City is required' }),
    state: z.string({ required_error: 'State is required' }),
    zip: z.string({ required_error: 'ZIP code is required' }),
    country: z.string({ required_error: 'Country is required' }),
  })
  .strict();

const isPhoneNumber = (value: string) => /^(\+?[0-9]{1,3})?([0-9]{10})$/.test(value);

// Function to check if a string is a valid username (alphanumeric only in this example)
const isUsername = (value: string) => /^[a-zA-Z0-9_]+$/.test(value);

export const commonValidations = {
  id: z
    .string()
    .refine((data) => !isNaN(Number(data)), 'ID must be a numeric value')
    .transform(Number)
    .refine((num) => num > 0, 'ID must be a positive number'),

  email: z.string().email('Invalid email address'),

  identifier: z.string().refine(
    (value) => {
      // If it's a phone number or email or username, we return true
      return isPhoneNumber(value) || isUsername(value) || z.string().email().safeParse(value).success;
    },
    {
      message: 'Invalid input',
    }
  ),

  userUniqueSearchKeys: UserUniqueSearchKeys,

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),

  username: UsernameValidationShcema,

  validaMongoId: validaMongoIdSchema,

  address: AddressValidateSchema,

  domain: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/, 'Invalid domain format'),
};
