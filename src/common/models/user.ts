import mongoose, { Document, Schema } from 'mongoose';

import { DB_MODELS } from '../constants/common';
import { UserRoles, UserStatus } from '../constants/enums';

// Address Sub-schema
const AddressSchema = new Schema(
  {
    street: {
      type: String,

      trim: true,
    },
    city: {
      type: String,

      trim: true,
    },
    state: {
      type: String,

      trim: true,
    },
    zip: {
      type: String,

      trim: true,
    },
    country: {
      type: String,

      trim: true,
    },
  },
  { _id: false }
);

// User Schema
const UserSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: DB_MODELS.ROLE,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    currentAddress: {
      type: AddressSchema,
      default: null,
    },
    postalAddress: {
      type: AddressSchema,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
      trim: true,
      default: null,
    },
    emailVerificationOTP: {
      type: String,
      trim: true,
      default: null,
    },
    emailVerificationOtpExpiresAt: {
      type: Date,
      required: false,
    },
    phoneVerificationOTP: {
      type: String,
      trim: true,
      default: null,
    },
    forgotPasswordOTP: {
      type: String,
      trim: true,
      default: null,
    },
    passwordUpdateRequested: {
      type: Boolean,
      default: false,
    },
    forgotPasswordOTPExpiresAt: {
      type: Date,
      required: false,
    },
    googleOAuth: {
      type: Boolean,
      default: false,
    },
    notificationType: {
      type: [String],
      enum: ['email', 'inApp'],
      default: ['inApp'],
    },
    TFAEnabled: {
      type: Boolean,
      default: false,
    },
    TFAOTP: {
      type: String,
      trim: true,
      default: null,
    },
    workspaces: [
      {
        type: Schema.Types.ObjectId,
        ref: DB_MODELS.WORKSPACE,
      },
    ],

    describedRole: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt`
    versionKey: false, // Removes `__v` field
  }
);

export interface IUserDoc extends Document {
  username: string;
  firstName: string;
  lastName: string | '';
  email: string;
  password: string | '';
  role: mongoose.Types.ObjectId;
  status: UserStatus;
  phone: string | null;
  currentAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | null;
  postalAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  googleOAuth: boolean;
  passwordUpdateRequested: boolean;
  profilePicture: string | null;
  emailVerificationOTP: string | null;
  emailVerificationOtpExpiresAt: Date | null;
  phoneVerificationOTP: string | null;
  forgotPasswordOTP: string | null;
  forgotPasswordOTPExpiresAt: Date | null;
  TFAEnabled: boolean;
  TFAOTP: string | null;
  notificationType?: ('email' | 'inapp')[];
  workspaces: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserPayload {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  describedRole: string[];
  firstName: string;
  lastName: string;
  role: UserRoles;
  workspace?: string;
  currentAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  postalAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export const User = mongoose.model<IUserDoc>(DB_MODELS.USER, UserSchema);
