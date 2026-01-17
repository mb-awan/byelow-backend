import { Request } from 'express';
import { rateLimit } from 'express-rate-limit';

/**
 * Rate limiter for domain analysis endpoint
 *
 * Prevents abuse and controls API costs:
 * - Limits requests per IP
 * - Prevents multiple refresh calls
 * - Protects DataForSEO API usage
 */
export const analyzeDomainRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many domain analysis requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP address for rate limiting
    return (req.ip || req.socket.remoteAddress || 'unknown') as string;
  },
  // Skip rate limiting for certain conditions if needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  skip: (req: Request) => {
    // In development, you might want to skip rate limiting
    // Remove this in production
    return false;
  },
});
