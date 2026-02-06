import mongoose, { Document, Schema } from 'mongoose';

import { DB_MODELS } from '../constants/common';

export interface IAnalyzeDomainResult extends Document {
  domain: string;
  da: number;
  pa: number;
  spamScore: number;
  backlinks: {
    total: number;
    dofollow: number;
    nofollow: number;
  };
  referringDomains: number;
  source: 'dataforseo+internal' | 'ai-service';
  fetchedAt: Date;
  expiresAt: Date;
  rawSnapshot: {
    dataforseo?: {
      referringDomains: number;
      backlinksTotal: number;
      backlinksDofollow: number;
      backlinksNofollow: number;
    };
    internal?: {
      linkMetricsSummary: {
        dofollowRatio: number;
        nofollowRatio: number;
        backlinkToDomainRatio: number;
      };
    };
    ai?: {
      domain_authority: number;
      page_authority: number;
      url: string;
    };
  };
}

const analyzeDomainResultSchema = new Schema<IAnalyzeDomainResult>(
  {
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    da: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    pa: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    spamScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    backlinks: {
      total: {
        type: Number,
        required: true,
        min: 0,
      },
      dofollow: {
        type: Number,
        required: true,
        min: 0,
      },
      nofollow: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    referringDomains: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      type: String,
      required: true,
      enum: ['dataforseo+internal', 'ai-service'],
      default: 'dataforseo+internal',
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index - MongoDB will auto-delete expired documents
    },
    rawSnapshot: {
      dataforseo: {
        referringDomains: { type: Number, required: false },
        backlinksTotal: { type: Number, required: false },
        backlinksDofollow: { type: Number, required: false },
        backlinksNofollow: { type: Number, required: false },
      },
      internal: {
        linkMetricsSummary: {
          dofollowRatio: { type: Number, required: false },
          nofollowRatio: { type: Number, required: false },
          backlinkToDomainRatio: { type: Number, required: false },
        },
      },
      ai: {
        domain_authority: { type: Number, required: false },
        page_authority: { type: Number, required: false },
        url: { type: String, required: false },
      },
    },
  },
  {
    timestamps: false, // We use fetchedAt and expiresAt instead
  }
);

// TTL index on expiresAt - MongoDB will automatically delete documents after expiresAt
// Note: MongoDB TTL indexes work by checking if the date field is older than expireAfterSeconds
// Since we're storing expiresAt (future date), we need to use a different approach
// We'll rely on application-level cleanup or use a background job to delete expired documents
// For now, we'll create a regular index and handle expiration in the application logic
analyzeDomainResultSchema.index({ expiresAt: 1 });

// Index for faster lookups
analyzeDomainResultSchema.index({ domain: 1, expiresAt: 1 });

export const AnalyzeDomainResult = mongoose.model<IAnalyzeDomainResult>(
  DB_MODELS.ANALYZE_DOMAIN_RESULT,
  analyzeDomainResultSchema
);
