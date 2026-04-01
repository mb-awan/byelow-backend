import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { analyzeRegistry } from '@/apis/analyze/apiDocs';
import { authRegistry } from '@/apis/auth/apiDocs';
import { backlinkIndexerRegistry } from '@/apis/backlink-indexer/apiDocs';
import { contentOptimizationRegistry } from '@/apis/content-optimization/apiDocs';
import { daPaCheckerRegistry } from '@/apis/da-pa-checker/apiDocs';
import { healthCheckRegistry } from '@/apis/healthCheck/healthCheckRouter';
import { seoProjectsRegistry } from '@/apis/seo-projects/apiDocs';
import { userRegistry } from '@/apis/users/apiDocs';
import { websiteAuditorRegistry } from '@/apis/website-auditor/apiDocs';
import { env } from '@/common/utils/envConfig';

export function generateOpenAPIDocument() {
  const registry = new OpenAPIRegistry([
    healthCheckRegistry,
    authRegistry,
    userRegistry,
    seoProjectsRegistry,
    daPaCheckerRegistry,
    analyzeRegistry,
    websiteAuditorRegistry,
    contentOptimizationRegistry,
    backlinkIndexerRegistry,
  ]);

  // Register the security scheme
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);

  // Local dev URL always uses HTTP + localhost
  const localUrl = `http://localhost:${env.PORT}`;

  // Production URL from env (used only in non-development environments)
  let productionUrl = env.BACKEND_BASE_URL || localUrl;
  // Normalize 0.0.0.0 → localhost in case it slips through
  productionUrl = productionUrl.replace(/0\.0\.0\.0/g, 'localhost');

  // In development, only expose localhost so Swagger "Try it Out" hits the local server.
  // In production, expose the production URL first and localhost as a fallback for
  // engineers who run the production build locally.
  const servers =
    env.NODE_ENV === 'development'
      ? [{ url: localUrl, description: 'Local Development' }]
      : [
          { url: productionUrl, description: 'Production' },
          { url: localUrl, description: 'Local (run npm start locally)' },
        ];

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Byelow Backend API',
      description: 'API documentation for Byelow SEO Platform - serves both byelow-dashboard and byelow-frontend',
    },
    servers,
    externalDocs: {
      description: 'Find out more about Byelow Backend API',
      url: '/api/swagger.json',
    },
  });
}
