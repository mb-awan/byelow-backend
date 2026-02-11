import { Request } from 'express';
import { rateLimit } from 'express-rate-limit';

export const auditWebsiteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many audit requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.ip || req.socket.remoteAddress || 'unknown') as string,
});
