import express, { Router } from 'express';

import { validateRequest } from '@/common/utils/httpHandlers';

import { AnalyzeDomainSchema } from '../da-pa-checker/validationSchemas';
import { analyzeDomainPublic } from './controllers';
import { publicAnalyzeDomainRateLimiter } from './rateLimiter';

export const PUBLIC_PATHS = {
  ANALYZE_DOMAIN: '/analyze/domain',
};

export const publicRouter: Router = (() => {
  const router = express.Router();

  router.post(
    PUBLIC_PATHS.ANALYZE_DOMAIN,
    publicAnalyzeDomainRateLimiter,
    validateRequest(AnalyzeDomainSchema),
    analyzeDomainPublic
  );

  return router;
})();
