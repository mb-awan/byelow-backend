import dotenv from 'dotenv';
import { bool, cleanEnv, host, num, port, str, url } from 'envalid';
import fs from 'fs';

// Determine the current environment
const nodeEnvironment = process.env.NODE_ENV || 'production';

// Load environment variables based on the current environment
if (nodeEnvironment === 'production') {
  if (fs.existsSync('.env.production')) {
    console.log('Loading production environment variables from .env.production');
    dotenv.config({ path: '.env.production' });
  } else if (fs.existsSync('.env')) {
    console.log('Loading production environment variables from .env');
    dotenv.config({ path: '.env' });
  } else {
    console.warn('No .env.production or .env file found. Using direct environment variables.');
  }
} else {
  const envPath = `.env.${nodeEnvironment}`;
  if (fs.existsSync(envPath)) {
    console.log(`Loading ${nodeEnvironment} environment variables from ${envPath}`);
    dotenv.config({ path: envPath });
  } else {
    console.warn(`Environment file ${envPath} not found. Default values may be used.`);
  }
}

// Validate and clean environment variables
export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
  }),
  PORT: port({ default: 4000 }),
  HOST: host({ default: 'localhost' }),
  // APP URLs
  FRONTEND_URL: str({ default: 'https://byelow.net' }),
  BACKEND_BASE_URL: str({ default: 'https://api.byelow.net' }),
  DASHBOARD_BASE_URL: str({ default: 'https://app.byelow.net' }),
  ADMIN_BASE_URL: str({ default: 'https://admin.byelow.net' }),
  // CORS Settings
  CORS_ORIGIN: str({ default: '' }),
  // MongoDB Configuration
  MONGO_URL: url({ default: '' }),
  // JWT Configuration
  JWT_SECRET_KEY: str({ default: '' }),
  JWT_EXPIRES_IN: str({ default: '1d' }),
  // Bcrypt Configuration
  BCRYPT_SALT_ROUNDS: num({ default: 10 }),
  // Redis Configuration
  REDIS_HOST: str({ default: '127.0.0.1' }),
  REDIS_PORT: num({ default: 6380 }),
  REDIS_USERNAME: str({ default: 'default' }),
  REDIS_PASSWORD: str({ default: '' }),
  REDIS_DB: str({ default: '' }),
  REDIS_TLS: bool({ default: false }),
  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: str({ default: '' }),
  CLOUDINARY_API_KEY: str({ default: '' }),
  CLOUDINARY_API_SECRET: str({ default: '' }),
  // Brevo SMTP Configuration
  SMTP_SERVER: str({ default: 'smtp-relay.brevo.com' }),
  SMTP_PORT: num({ default: 587 }),
  SMTP_LOGIN: str({ default: '' }),
  SMTP_PASSWORD: str({ default: '' }),
  SMTP_FROM_EMAIL_NO_REPLY: str({ default: '' }),
  SMTP_FROM_NAME: str({ default: 'Byelow' }),
  // DataforSEO Configuration
  DATAFORSEO_LOGIN: str({ default: '' }),
  DATAFORSEO_PASSWORD: str({ default: '' }),

  // Google OAuth
  GOOGLE_CLIENT_ID: str({ default: '' }),
  GOOGLE_CLIENT_SECRET: str({ default: '' }),
  // Domain analysis cache TTL (in days, default 30 days)
  DOMAIN_ANALYSIS_CACHE_TTL_DAYS: num({ default: 30 }),
  // AI service (DA/PA checker) — when set, Express DA/PA endpoint uses this instead of DataForSEO
  AI_SERVICE_URL: str({ default: '' }),
});
