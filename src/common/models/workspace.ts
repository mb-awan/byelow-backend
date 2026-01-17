import mongoose, { Document, Schema } from 'mongoose';

import { DB_MODELS } from '../constants/common';

export interface IWorkspaceDoc extends Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema: Schema = new Schema<IWorkspaceDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: DB_MODELS.USER,
      required: true,
      index: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: DB_MODELS.USER,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
WorkspaceSchema.index({ ownerId: 1 });
WorkspaceSchema.index({ slug: 1 });

export const Workspace = mongoose.model<IWorkspaceDoc>(DB_MODELS.WORKSPACE, WorkspaceSchema);









