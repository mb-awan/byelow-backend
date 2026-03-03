import { z } from 'zod';

export const BacklinkIndexSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .transform((val) => {
      // Accept bare domains like "example.com"
      const trimmed = val.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return `https://${trimmed}`;
      }
      return trimmed;
    })
    .pipe(z.string().url('URL must be valid (e.g. https://example.com or example.com)')),

  max_backlinks: z.number().int('max_backlinks must be an integer').min(1).max(100).optional().default(50),

  verify: z.boolean().optional().default(true),
});
