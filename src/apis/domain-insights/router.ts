import express, { Router } from 'express';

import { authenticate } from '@/common/middleware/user';
import { validateRequest } from '@/common/utils/httpHandlers';

import { getOverview } from './controllers';
import { GetOverviewSchema } from './validationSchemas';

export const domainInsightsRouter: Router = (() => {
  const router = express.Router();

  // GET /api/domain-insights — returns latest analysis data per domain for the authenticated user
  router.get('/', authenticate, validateRequest(GetOverviewSchema), getOverview);

  return router;
})();
