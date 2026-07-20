/* eslint-disable no-console */
/**
 * Targeted page seeder — populates ONLY the About and Contact pages with rich folds,
 * so those pages render fully from the CMS (like Home). It does NOT touch Home,
 * collections, settings, or users, so your existing edits are preserved.
 *
 * Run once:  npm run db:seed:pages
 * After that, edit About/Contact from the admin folds editor like any other page.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertPage(
  key: string,
  meta: { title: string; metaTitle?: string; metaDescription?: string },
  sections: { type: string; data: unknown }[],
) {
  const page = await prisma.page.upsert({ where: { key }, update: { ...meta }, create: { key, ...meta } });
  await prisma.section.deleteMany({ where: { pageId: page.id } });
  await prisma.section.createMany({
    data: sections.map((s, i) => ({
      pageId: page.id,
      type: s.type as never,
      order: i,
      enabled: true,
      data: s.data as Prisma.InputJsonValue,
    })),
  });
  console.log(`✓ ${key} (${sections.length} sections)`);
}

async function main() {
  // Pull current stats so the About stats band matches the site.
  const stats = await prisma.stat.findMany({ orderBy: { order: 'asc' } });
  const statItems = stats.map((s) => ({ value: s.value, suffix: s.suffix, label: s.label }));

  await upsertPage(
    'about',
    {
      title: 'About',
      metaTitle: 'About the Academy — Training Developers Since 2008',
      metaDescription:
        'Al-Fateem Academy is a certified web development institute in the heart of Karachi, offering professional web development courses since 2008.',
    },
    [
      { type: 'stats', data: { items: statItems } },
      {
        type: 'whyUs',
        data: {
          eyebrow: 'Why Al-Fateem',
          title: 'A preferred destination for quality learning',
          body: 'Al-Fateem Academy is an authentic IT talent development axis, committed to building a skilled manpower resource for the requirements of sizable business houses. Today, more and more students are opting to upgrade their skills, and Al-Fateem Academy has emerged as their preferred destination for quality learning.',
          pillars: [
            { title: 'Practical approach', body: 'An innovative way of learning, with a strong practical focus.', metric: 'Hands-on' },
            { title: 'Market-relevant', body: 'Courses that are absolutely relevant to the current market, revised continuously.', metric: 'Current' },
            { title: 'Industry-aligned', body: 'Built in coordination with business houses, with a strategic focus on hiring.', metric: 'Aligned' },
          ],
        },
      },
      {
        type: 'richText',
        data: {
          title: 'Message from the CEO',
          blocks: [
            { type: 'p', text: "Today's world requires professionals with the courage, intelligence, initiative and interpersonal skills not only to survive, but to stand head and shoulders above the challenges that come across them. Al-Fateem Academy offers an unmatched level of training to those who seek to meet these high expectations." },
            { type: 'p', text: 'As an established IT professional, I bring a wealth of experience — not only in my IT skills, but in communication design and development that can benefit our young students.' },
            { type: 'p', text: 'It is the mission of my team at Al-Fateem Academy to help each individual reach their utmost potential by exercising the strengths they have inside — strengths they may not yet have realised or used to the max.' },
            { type: 'p', text: 'Remember, it is high time when real training matters. Wish you all the best. — Syed Mohammad Ayaz Ahmed Mast, Chief Executive Officer' },
          ],
        },
      },
      {
        type: 'testimonials',
        data: {
          eyebrow: 'Reviews',
          title: 'Trusted by our students',
          body: 'What people say about learning at the academy.',
          limit: 6,
        },
      },
      {
        type: 'cta',
        data: {
          eyebrow: 'Admissions open',
          title: 'It is high time when real training matters.',
          primaryCta: { label: 'Register now', href: '/register/' },
        },
      },
    ],
  );

  await upsertPage(
    'contact',
    {
      title: 'Contact',
      metaTitle: 'Contact Us — Visit the Academy in Karachi',
      metaDescription:
        'Get in touch with Al-Fateem Academy by phone or email, or visit us at Falak Corporate City, Karachi.',
    },
    [
      {
        type: 'richText',
        data: {
          title: 'Come and talk to us',
          blocks: [
            { type: 'p', text: 'Want to give your web development skills a boost this year, or simply curious about the courses we offer? Get in touch with our representatives, or email us — you are also more than welcome to visit the academy for a one-to-one discussion.' },
          ],
        },
      },
    ],
  );

  console.log('About + Contact pages seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
