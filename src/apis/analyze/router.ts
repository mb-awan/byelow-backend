import express, { Router } from 'express';

import { authenticate } from '@/common/middleware/user';
import { validateRequest } from '@/common/utils/httpHandlers';

import { analyzeDomain } from '../da-pa-checker/controllers';
import { analyzeDomainRateLimiter } from '../da-pa-checker/rateLimiter';
import { AnalyzeDomainSchema } from '../da-pa-checker/validationSchemas';

/**
 * Analyze router
 *
 * Provides the /api/analyze/domain endpoint as specified in requirements
 * This is an alias to the da-pa-checker analyze endpoint for backward compatibility
 */
export const analyzeRouter: Router = (() => {
  const router = express.Router();

  // Analyze domain endpoint: POST /api/analyze/domain
  router.post('/domain', analyzeDomainRateLimiter, authenticate, validateRequest(AnalyzeDomainSchema), analyzeDomain);

  return router;
})();
