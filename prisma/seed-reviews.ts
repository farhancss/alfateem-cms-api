/* eslint-disable no-console */
/**
 * Standalone testimonials seeder — replaces the `testimonials` table with the real
 * Google/Facebook reviews captured in prisma/review-data.json, without touching any
 * other collection. Run with:
 *
 *   npm run db:seed:reviews
 *
 * The full `npm run db:seed` also seeds these (same file, same logic); this script
 * exists so reviews can be refreshed after a re-capture without re-seeding content.
 * Reviews added by hand in the admin will be DELETED by this script — it replaces the
 * table as a set. Export/merge them into review-data.json first if you want to keep them.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

type ReviewSeed = {
  author: string;
  role: string | null;
  quote: string;
  rating: number;
  source: 'GOOGLE' | 'FACEBOOK' | 'MANUAL' | 'WEBSITE';
  sourceUrl: string | null;
  avatar: string | null;
  reviewedAt: string | null;
  featured: boolean;
};

async function main() {
  const { reviews } = JSON.parse(
    readFileSync(join(__dirname, 'review-data.json'), 'utf8'),
  ) as { reviews: ReviewSeed[] };

  await prisma.testimonial.deleteMany();
  await prisma.testimonial.createMany({
    data: reviews.map((t, i) => ({
      author: t.author,
      role: t.role,
      quote: t.quote,
      rating: t.rating,
      source: t.source,
      sourceUrl: t.sourceUrl,
      avatar: t.avatar,
      reviewedAt: t.reviewedAt ? new Date(t.reviewedAt) : null,
      featured: t.featured,
      approved: true,
      order: i,
    })),
  });

  const bySource = reviews.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `✓ ${reviews.length} testimonials seeded (${Object.entries(bySource)
      .map(([s, n]) => `${n} ${s}`)
      .join(', ')})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
