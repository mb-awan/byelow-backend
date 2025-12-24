import mongoose, { Document, Schema } from 'mongoose';

import { DB_MODELS } from '../constants/common';

export interface ISEOProject extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  name: string;
  domain: string;
  healthScore: number;
  status: 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const seoProjectSchema: Schema = new Schema<ISEOProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DB_MODELS.USER,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    healthScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
seoProjectSchema.index({ userId: 1, status: 1 });
seoProjectSchema.index({ domain: 1 });

export const SEOProject = mongoose.model<ISEOProject>(DB_MODELS.SEO_PROJECT, seoProjectSchema);


