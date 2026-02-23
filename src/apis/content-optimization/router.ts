import express, { Router } from 'express';

import { authenticate } from '@/common/middleware/user';
import { validateRequest } from '@/common/utils/httpHandlers';

import { contentOptimize } from './controllers';
import { contentOptimizeRateLimiter } from './rateLimiter';
import { ContentOptimizeSchema } from './validationSchemas';

export const CONTENT_OPTIMIZATION_PATHS = {
  OPTIMIZE: '/',
};

export const contentOptimizationRouter: Router = (() => {
  const router = express.Router();

  router.post(
    CONTENT_OPTIMIZATION_PATHS.OPTIMIZE,
    contentOptimizeRateLimiter,
    authenticate,
    validateRequest(ContentOptimizeSchema),
    contentOptimize
  );

  return router;
})();
