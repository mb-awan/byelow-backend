import mongoose, { Document, Schema } from 'mongoose';

import { DB_MODELS } from '../constants/common';

export interface IBacklink {
  domain: string;
  domainAuthority: number;
  linkType: 'dofollow' | 'nofollow';
  anchorText: string;
}

export interface IDAPAAnalysis extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  projectId?: mongoose.Schema.Types.ObjectId;
  domain: string;
  domainAuthority: number;
  pageAuthority: number;
  totalBacklinks: number;
  referringDomains: number;
  dofollowLinks: number;
  nofollowLinks: number;
  spamScore: number;
  organicTrafficEstimate: number;
  topBacklinks: IBacklink[];
  topAnchorTexts: Array<{ text: string; count: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const backlinkSchema = new Schema<IBacklink>(
  {
    domain: { type: String, required: true },
    domainAuthority: { type: Number, required: true, min: 0, max: 100 },
    linkType: { type: String, enum: ['dofollow', 'nofollow'], required: true },
    anchorText: { type: String, required: true },
  },
  { _id: false }
);

const dapaAnalysisSchema = new Schema<IDAPAAnalysis>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DB_MODELS.USER,
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: DB_MODELS.SEO_PROJECT,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    domainAuthority: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    pageAuthority: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    totalBacklinks: {
      type: Number,
      required: true,
      min: 0,
    },
    referringDomains: {
      type: Number,
      required: true,
      min: 0,
    },
    dofollowLinks: {
      type: Number,
      required: true,
      min: 0,
    },
    nofollowLinks: {
      type: Number,
      required: true,
      min: 0,
    },
    spamScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    organicTrafficEstimate: {
      type: Number,
      required: true,
      min: 0,
    },
    topBacklinks: [backlinkSchema],
    topAnchorTexts: [
      {
        text: { type: String, required: true },
        count: { type: Number, required: true, min: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
dapaAnalysisSchema.index({ userId: 1, createdAt: -1 });
dapaAnalysisSchema.index({ domain: 1, createdAt: -1 });

export const DAPAAnalysis = mongoose.model<IDAPAAnalysis>(DB_MODELS.DAPA_ANALYSIS, dapaAnalysisSchema);










