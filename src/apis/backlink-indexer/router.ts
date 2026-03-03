import express, { Router } from 'express';

import { authenticate } from '@/common/middleware/user';
import { validateRequest } from '@/common/utils/httpHandlers';

import { backlinkIndex } from './controllers';
import { backlinkIndexRateLimiter } from './rateLimiter';
import { BacklinkIndexSchema } from './validationSchemas';

export const BACKLINK_INDEXER_PATHS = {
  INDEX: '/',
};

export const backlinkIndexerRouter: Router = (() => {
  const router = express.Router();

  router.post(
    BACKLINK_INDEXER_PATHS.INDEX,
    backlinkIndexRateLimiter,
    authenticate,
    validateRequest(BacklinkIndexSchema),
    backlinkIndex
  );

  return router;
})();
