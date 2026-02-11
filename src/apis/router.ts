import express, { Router } from 'express';

import { openAPIRouter } from '@/api-docs/openAPIRouter';
import { API_ROUTES } from '@/common/constants/common';

import { analyzeRouter } from './analyze/router';
import { authRouter } from './auth/router';
import { daPaCheckerRouter } from './da-pa-checker/router';
import { healthCheckRouter } from './healthCheck/healthCheckRouter';
import { seoProjectsRouter } from './seo-projects/router';
import { usersRouter } from './users/router';
import { websiteAuditRouter } from './website-auditor/router';

export const apisRouter: Router = (() => {
  const router = express.Router();

  // Health check
  router.use(API_ROUTES.HEALTH_CHECK, healthCheckRouter);

  // Authentication
  router.use(API_ROUTES.AUTH, authRouter);

  // Users
  router.use(API_ROUTES.USERS, usersRouter);

  // SEO Projects - available at /api/projects and /api/seo-projects
  router.use(API_ROUTES.PROJECTS, seoProjectsRouter);
  router.use(API_ROUTES.SEO_PROJECTS, seoProjectsRouter);

  // DA/PA Checker
  router.use(API_ROUTES.DA_PA_CHECKER, daPaCheckerRouter);

  // Website Auditor (SEO)
  router.use(API_ROUTES.WEBSITE_AUDIT, websiteAuditRouter);

  // Analyze domain endpoint (POST /api/analyze/domain)
  router.use(API_ROUTES.ANALYZE, analyzeRouter);

  // Swagger UI
  router.use(openAPIRouter);

  // redirects to swagger
  router.use('/', (_req: express.Request, res: express.Response) => {
    return res.redirect('/api/docs');
  });

  return router;
})();
