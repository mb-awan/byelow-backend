import { Express } from 'express';

import { apisRouter } from '@/apis/router';

export default function setupRoutes(app: Express): void {
  // API Routes
  app.use('/api', apisRouter);

  // Health Check and Redirects
  app.get('/healthcheck', (_req, res) => {
    res.redirect('/api/health-check');
  });

  app.get('/healthCheck', (_req, res) => {
    res.redirect('/api/health-check');
  });

  app.get('/health-check', (_req, res) => {
    res.redirect('/api/health-check');
  });

  app.get('/health-Check', (_req, res) => {
    res.redirect('/api/health-check');
  });

  app.get('/Health-check', (_req, res) => {
    res.redirect('/api/health-check');
  });

  app.get('/Health-Check', (_req, res) => {
    res.redirect('/api/health-check');
  });

  app.get('/', (_req, res) => {
    res.redirect('/api/docs');
  });

  app.get('/*', (_req, res) => {
    res.redirect('/api/docs');
  });
}
