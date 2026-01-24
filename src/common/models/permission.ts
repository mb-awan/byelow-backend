import mongoose, { Document, Schema } from 'mongoose';

import { DB_MODELS } from '../constants/common';

export interface IPermissionDoc extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema: Schema = new Schema<IPermissionDoc>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Permission = mongoose.model<IPermissionDoc>(DB_MODELS.PERMISSION, PermissionSchema);
