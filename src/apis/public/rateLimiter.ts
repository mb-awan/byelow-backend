import { Request } from 'express';
import { rateLimit } from 'express-rate-limit';

/**
 * Stricter rate limiter for unauthenticated landing-page DA/PA checks.
 */
export const publicAnalyzeDomainRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many domain analysis requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.ip || req.socket.remoteAddress || 'unknown') as string,
});
