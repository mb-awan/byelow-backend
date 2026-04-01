import { z } from 'zod';

import { isValidDomain } from '@/common/utils/domainValidator';

const VALID_SECTIONS = ['seo', 'backlinks', 'content', 'audit'] as const;
export type OverviewSection = (typeof VALID_SECTIONS)[number];

const sectionsSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return VALID_SECTIONS as unknown as OverviewSection[];
    return val
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is OverviewSection => VALID_SECTIONS.includes(s as OverviewSection));
  });

const domainSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      try {
        return isValidDomain(val);
      } catch {
        return false;
      }
    },
    { message: 'Invalid domain format' }
  );

export const GetOverviewSchema = z.object({
  domain: domainSchema,
  section: sectionsSchema,
  limit: z.coerce.number().int().positive().max(50).default(10).optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
});
