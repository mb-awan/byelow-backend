import express, { Router } from 'express';

import { authenticate } from '@/common/middleware/user';
import { validateRequest } from '@/common/utils/httpHandlers';

import { auditWebsite } from './controllers';
import { auditWebsiteRateLimiter } from './rateLimiter';
import { AuditWebsiteSchema } from './validationSchemas';

export const WEBSITE_AUDIT_PATHS = {
  AUDIT: '/',
};

export const websiteAuditRouter: Router = (() => {
  const router = express.Router();

  router.post(
    WEBSITE_AUDIT_PATHS.AUDIT,
    auditWebsiteRateLimiter,
    authenticate,
    validateRequest(AuditWebsiteSchema),
    auditWebsite
  );

  return router;
})();
