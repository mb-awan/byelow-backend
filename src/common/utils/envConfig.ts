import dotenv from 'dotenv';
import { bool, cleanEnv, host, num, port, str, url } from 'envalid';
import fs from 'fs';

// Determine the current environment
const nodeEnvironment = process.env.NODE_ENV || 'production';

// Load environment variables based on the current environment
if (nodeEnvironment === 'production') {
  if (fs.existsSync('.env.production')) {
    dotenv.config({ path: '.env.production' });
  } else if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
  } else {
    console.warn('No .env.production or .env file found. Using direct environment variables.');
  }
} else {
  const envPath = `.env.${nodeEnvironment}`;
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    console.warn(`Environment file ${envPath} not found. Default values may be used.`);
  }
}

// Validate and clean environment variables
export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    default: 'development',
    choices: ['development', 'production', 'test'],
  }),
  PORT: port({ default: 4000 }),
  HOST: host({ default: 'localhost' }),
  FRONTEND_URL: str({ default: 'http://localhost:3000' }),
  CORS_ORIGIN: str({
    default: 'http://localhost:3001;http://localhost:3000;http://127.0.0.1:3000;http://127.0.0.1:3001',
  }),
  COMMON_RATE_LIMIT_MAX_REQUESTS: num({ default: 1000 }),
  COMMON_RATE_LIMIT_WINDOW_MS: num({ default: 1000 }),
  MONGO_URL: url({ default: 'mongodb://0.0.0.0:27017/byelow' }),
  JWT_SECRET_KEY: str({ default: 'mySecret' }),
  JWT_EXPIRES_IN: str({ default: '1d' }),
  BCRYPT_SALT_ROUNDS: num({ default: 10 }),
  REDIS_HOST: str({ default: '127.0.0.1' }),
  REDIS_PORT: num({ default: 6380 }),
  REDIS_USERNAME: str({ default: 'default' }),
  REDIS_PASSWORD: str({ default: '' }),
  REDIS_DB: num({ default: 0 }),
  SMTP_SERVICE: str({ default: 'Gmail' }),
  SMTP_HOST: str({ default: 'smtp.gmail.com' }),
  SMTP_PORT: num(),
  SMTP_USERNAME: str({ default: '' }),
  SMTP_PASSWORD: str({ default: '' }),
  EMAIL_FROM: str({ default: '' }),
  GOOGLE_CLIENT_ID: str({ default: '' }),
  GOOGLE_CLIENT_SECRET: str({ default: '' }),
  GOOGLE_OAUTH_REDIRECT_URL: str({ default: '' }),
  REDIS_TLS: bool({ default: false }),
  // R2 Storage (Cloudflare)
  R2_BUCKET_URL: str({ default: '' }),
  R2_BUCKET_NAME: str({ default: '' }),
  R2_ACCESS_KEY_ID: str({ default: '' }),
  R2_SECRET_ACCESS_KEY: str({ default: '' }),
  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: str({ default: '' }),
  CLOUDINARY_API_KEY: str({ default: '' }),
  CLOUDINARY_API_SECRET: str({ default: '' }),
  // Backend base URL
  BACKEND_BASE_URL: str({ default: 'http://localhost:4000' }),

  //dateforseo credentials
  DATAFORSEO_LOGIN: str({ default: '' }),
  DATAFORSEO_PASSWORD: str({ default: '' }),

  // Domain analysis cache TTL (in days, default 30 days)
  DOMAIN_ANALYSIS_CACHE_TTL_DAYS: num({ default: 30 }),
});
