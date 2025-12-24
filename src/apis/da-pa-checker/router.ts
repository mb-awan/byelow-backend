import express, { Router } from 'express';

import { authenticate } from '@/common/middleware/user';
import { validateRequest } from '@/common/utils/httpHandlers';

import { analyzeDomain, getAnalysisById, getAnalysisHistory } from './controllers';
import { AnalyzeDomainSchema, GetAnalysisByIdSchema, GetAnalysisHistorySchema } from './validationSchemas';

export const DA_PA_CHECKER_PATHS = {
  ANALYZE: '/analyze',
  HISTORY: '/history',
  GET_BY_ID: '/:id',
};

export const daPaCheckerRouter: Router = (() => {
  const router = express.Router();

  // Analyze a domain
  router.post(DA_PA_CHECKER_PATHS.ANALYZE, authenticate, validateRequest(AnalyzeDomainSchema), analyzeDomain);

  // Get analysis history
  router.get(DA_PA_CHECKER_PATHS.HISTORY, authenticate, validateRequest(GetAnalysisHistorySchema), getAnalysisHistory);

  // Get analysis by ID
  router.get(DA_PA_CHECKER_PATHS.GET_BY_ID, authenticate, validateRequest(GetAnalysisByIdSchema), getAnalysisById);

  return router;
})();


