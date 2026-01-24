import mongoose, { Document, Schema } from 'mongoose';

import { DB_MODELS } from '../constants/common';

export interface IRoleDoc extends Document {
  name: string;
  permissions: mongoose.Types.ObjectId[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema<IRoleDoc>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: DB_MODELS.PERMISSION,
      },
    ],
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Role = mongoose.model<IRoleDoc>(DB_MODELS.ROLE, RoleSchema);
