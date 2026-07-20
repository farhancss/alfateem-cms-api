import { z } from 'zod';

/**
 * Structured article/rich-text body: an ordered array of typed blocks.
 *
 * Mirrors the frontend `Block` union in alfateem-web/src/lib/content.ts exactly.
 * Stored as JSON and validated on every write — the API never accepts or stores raw
 * HTML, so there is no stored-XSS surface. The frontend renders each block as data.
 */
export const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('p'), text: z.string().min(1) }),
  z.object({ type: z.literal('h2'), text: z.string().min(1) }),
  z.object({ type: z.literal('h3'), text: z.string().min(1) }),
  z.object({ type: z.literal('ul'), items: z.array(z.string().min(1)).min(1) }),
  z.object({ type: z.literal('ol'), items: z.array(z.string().min(1)).min(1) }),
  z.object({ type: z.literal('code'), lang: z.string().min(1), code: z.string().min(1) }),
]);

export const blocksSchema = z.array(blockSchema).min(1);

export type Block = z.infer<typeof blockSchema>;
