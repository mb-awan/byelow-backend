import { z } from 'zod';

export const AuditWebsiteSchema = z.object({
  url: z.string().url('URL must be valid (e.g. https://example.com)'),
});
