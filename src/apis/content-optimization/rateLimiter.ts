import { Request } from 'express';
import { rateLimit } from 'express-rate-limit';

export const contentOptimizeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many content optimization requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.ip || req.socket.remoteAddress || 'unknown') as string,
});
