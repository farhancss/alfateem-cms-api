import { SectionType } from '@prisma/client';
import { z } from 'zod';
import { blocksSchema } from '../common/content/blocks.schema';

/**
 * THE SECTION REGISTRY — single source of truth for the "folds" model.
 *
 * Each SectionType maps to a Zod schema describing its `data` payload. This one file
 * keeps the API, the admin editor, and the frontend renderer in sync: the API rejects
 * malformed payloads on write, the admin can generate a correct editing form from the
 * same schemas (exported as JSON Schema via /pages/section-types), and the frontend
 * knows exactly what shape each fold will have.
 *
 * Adding a new section type = add one entry here + a renderer on the frontend. No
 * other backend change is required — matching the "each new section is self-contained"
 * requirement.
 *
 * `refs` lists collections a section pulls live data from. The Pages service resolves
 * these on GET so the frontend renders with zero client-side assembly.
 */

const cta = z.object({ label: z.string().min(1), href: z.string().min(1) });

export interface SectionDefinition {
  type: SectionType;
  /** Human label for the admin UI. */
  label: string;
  /** Zod schema for the `data` payload. */
  schema: z.ZodTypeAny;
  /** Collections this section resolves live (embedded content still allowed too). */
  refs: Array<'courses' | 'graduates' | 'posts' | 'testimonials'>;
}

export const SECTION_REGISTRY: Record<SectionType, SectionDefinition> = {
  hero: {
    type: SectionType.hero,
    label: 'Hero',
    refs: [],
    schema: z.object({
      eyebrow: z.string().default(''),
      titleLines: z.array(z.string()).min(1),
      body: z.string(),
      primaryCta: cta.optional(),
      secondaryCta: cta.optional(),
      stats: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .max(4)
        .optional(),
    }),
  },

  techMarquee: {
    type: SectionType.techMarquee,
    label: 'Technology marquee',
    refs: [],
    schema: z.object({
      items: z.array(z.string().min(1)).min(1),
    }),
  },

  whyUs: {
    type: SectionType.whyUs,
    label: 'Why us (pillars)',
    refs: [],
    schema: z.object({
      eyebrow: z.string().default(''),
      title: z.string(),
      body: z.string().optional(),
      pillars: z
        .array(
          z.object({
            title: z.string().min(1),
            body: z.string().min(1),
            metric: z.string().optional(),
          }),
        )
        .min(1),
    }),
  },

  coursesGrid: {
    type: SectionType.coursesGrid,
    label: 'Courses grid',
    refs: ['courses'],
    schema: z.object({
      eyebrow: z.string().default(''),
      title: z.string(),
      body: z.string().optional(),
      // Reference config, resolved against the Courses collection on read.
      mode: z.enum(['all', 'track']).default('all'),
      track: z.enum(['Frontend', 'Backend', 'Data', 'Platform', 'AI']).optional(),
      limit: z.number().int().positive().max(50).optional(),
    }),
  },

  graduatesWall: {
    type: SectionType.graduatesWall,
    label: 'Graduates wall',
    refs: ['graduates'],
    schema: z.object({
      eyebrow: z.string().default(''),
      title: z.string(),
      body: z.string().optional(),
      featuredOnly: z.boolean().default(true),
      limit: z.number().int().positive().max(100).optional(),
    }),
  },

  blogPreview: {
    type: SectionType.blogPreview,
    label: 'Blog preview',
    refs: ['posts'],
    schema: z.object({
      eyebrow: z.string().default(''),
      title: z.string(),
      body: z.string().optional(),
      limit: z.number().int().positive().max(12).default(3),
    }),
  },

  faq: {
    type: SectionType.faq,
    label: 'FAQ',
    refs: [],
    schema: z.object({
      eyebrow: z.string().default(''),
      title: z.string(),
      items: z
        .array(z.object({ q: z.string().min(1), a: z.string().min(1) }))
        .min(1),
    }),
  },

  cta: {
    type: SectionType.cta,
    label: 'Call to action',
    refs: [],
    schema: z.object({
      eyebrow: z.string().default(''),
      title: z.string(),
      body: z.string().optional(),
      primaryCta: cta.optional(),
    }),
  },

  richText: {
    type: SectionType.richText,
    label: 'Rich text',
    refs: [],
    schema: z.object({
      title: z.string().optional(),
      blocks: blocksSchema,
    }),
  },

  gallery: {
    type: SectionType.gallery,
    label: 'Gallery',
    refs: [],
    schema: z.object({
      title: z.string().optional(),
      images: z.array(z.string().min(1)).min(1),
    }),
  },

  stats: {
    type: SectionType.stats,
    label: 'Stats band',
    refs: [],
    schema: z.object({
      items: z
        .array(
          z.object({
            value: z.number().int(),
            suffix: z.string().default(''),
            label: z.string().min(1),
          }),
        )
        .min(1),
    }),
  },

  testimonials: {
    type: SectionType.testimonials,
    label: 'Testimonials / reviews',
    refs: ['testimonials'],
    schema: z.object({
      eyebrow: z.string().default(''),
      title: z.string(),
      body: z.string().optional(),
      // Reference config, resolved against the Testimonials collection on read.
      featuredOnly: z.boolean().default(false),
      source: z.enum(['GOOGLE', 'FACEBOOK', 'MANUAL', 'WEBSITE']).optional(),
      limit: z.number().int().positive().max(50).optional(),
    }),
  },
};

/** Validate a section payload against its type. Returns parsed data or throws ZodError. */
export function validateSectionData(type: SectionType, data: unknown) {
  const def = SECTION_REGISTRY[type];
  if (!def) throw new Error(`Unknown section type: ${type}`);
  return def.schema.parse(data);
}

export const SECTION_TYPES = Object.keys(SECTION_REGISTRY) as SectionType[];
