import { Request } from 'express';
import { rateLimit } from 'express-rate-limit';

export const backlinkIndexRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window (backlink analysis is resource-intensive)
  message: 'Too many backlink index requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.ip || req.socket.remoteAddress || 'unknown') as string,
});
