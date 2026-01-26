import '@/common/utils/db';
import '@/common/utils/redis';

import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import path from 'path';
import { pino } from 'pino';

import errorHandler from '@/common/middleware/errorHandler';
import requestLogger from '@/common/middleware/requestLogger';
import { env } from '@/common/utils/envConfig';

import setupRoutes from './routes';

const logger = pino({ name: 'server start' });

const app: Express = express();

// Set the application to trust the reverse proxy
app.set('trust proxy', true);

app.use(express.urlencoded({ extended: true }));

// Middlewares
app.use(express.json());

// CORS configuration - Enabled to fix Swagger UI connection issues
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, or Swagger UI from same origin)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      env.FRONTEND_URL,
      ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(';').filter((o) => o.trim()) : []),
    ];

    // In development, allow localhost on any port for Swagger UI and development tools
    if (env.NODE_ENV === 'development') {
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('https://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      // In development, be more permissive for Swagger UI
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization', 'X-Total-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Helmet configuration - allow Swagger UI to work
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Swagger UI needs unsafe-eval
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Swagger UI needs this disabled
  })
);

// Request logging
app.use(requestLogger);

// Static files
app.use(express.static('public'));

// static file
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
setupRoutes(app);

// Error handlers
app.use(errorHandler());

export { app, logger };
