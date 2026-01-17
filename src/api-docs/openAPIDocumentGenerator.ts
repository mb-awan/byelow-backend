import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { authRegistry } from '@/apis/auth/apiDocs';
import { daPaCheckerRegistry } from '@/apis/da-pa-checker/apiDocs';
import { healthCheckRegistry } from '@/apis/healthCheck/healthCheckRouter';
import { seoProjectsRegistry } from '@/apis/seo-projects/apiDocs';
import { userRegistry } from '@/apis/users/apiDocs';
import { env } from '@/common/utils/envConfig';

export function generateOpenAPIDocument() {
  const registry = new OpenAPIRegistry([
    healthCheckRegistry,
    authRegistry,
    userRegistry,
    seoProjectsRegistry,
    daPaCheckerRegistry,
  ]);

  // Register the security scheme
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);

  // Build server URL
  // Use BACKEND_BASE_URL if set, otherwise use HOST:PORT
  // Note: Server binds to 0.0.0.0 but Swagger should use the actual accessible URL (localhost or HOST)
  let serverUrl = env.BACKEND_BASE_URL || `http://${env.HOST}:${env.PORT}`;

  // Normalize localhost URLs to use HTTP instead of HTTPS to avoid CORS issues
  if (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1') || serverUrl.includes('0.0.0.0')) {
    serverUrl = serverUrl.replace(/^https:/i, 'http:');
    // Replace 0.0.0.0 with localhost for Swagger UI (0.0.0.0 is not accessible from browser)
    serverUrl = serverUrl.replace(/0\.0\.0\.0/g, 'localhost');
  }

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Byelow Backend API',
      description: 'API documentation for Byelow SEO Platform - serves both byelow-dashboard and byelow-frontend',
    },
    servers: [
      {
        url: serverUrl,
        description: 'Development Server',
      },
    ],
    externalDocs: {
      description: 'Find out more about Byelow Backend API',
      url: '/api/swagger.json',
    },
  });
}
