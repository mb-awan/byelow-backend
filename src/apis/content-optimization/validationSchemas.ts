import { z } from 'zod';

export const ContentOptimizeSchema = z.object({
  url: z.string().url('URL must be valid (e.g. https://example.com)'),
  keywords: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (val == null) return undefined;
      if (typeof val === 'string') return [val];
      return val.filter(Boolean);
    }),
  country: z.string().max(10).optional(),
  language: z.string().max(10).optional(),
});
