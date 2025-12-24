import express, { Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { generateOpenAPIDocument } from '@/api-docs/openAPIDocumentGenerator';

export const openAPIRouter: Router = (() => {
  const router = express.Router();
  const openAPIDocument = generateOpenAPIDocument();

  // Add CORS headers for Swagger JSON endpoint
  router.get('/swagger.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.send(openAPIDocument);
  });

  // Handle OPTIONS request for CORS preflight
  router.options('/swagger.json', (_req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(204);
  });

  // Swagger UI setup with custom options
  const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Byelow API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  };

  router.use('/docs', swaggerUi.serve, swaggerUi.setup(openAPIDocument, swaggerOptions));

  return router;
})();
