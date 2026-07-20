/* eslint-disable no-console */
import { PrismaClient, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Idempotent seed — reproduces today's site exactly.
 *
 * The content snapshot (prisma/seed-data.json) is generated directly from the
 * frontend's own source of truth (alfateem-web/src/lib/{site,courses,content}.ts), so
 * the seeded data cannot drift from what the static site currently renders. Re-running
 * this seed converges to the same state: keyed collections (courses/posts/events by
 * slug, settings singleton, admin by email) are upserted; unkeyed collections
 * (graduates, nav, stats) and page sections are replaced as a set.
 */

const prisma = new PrismaClient();

type Snapshot = {
  site: any;
  media: Record<string, string>;
  nav: { label: string; href: string; hasMegaMenu?: boolean }[];
  stats: { value: number; suffix: string; label: string }[];
  courses: any[];
  graduates: { name: string; image: string; role?: string; year: number }[];
  posts: any[];
  events: { title: string; slug: string; date: string; blurb: string; cover: string; images: string[] }[];
  pillars: { title: string; body: string; metric?: string }[];
};

const snapshot: Snapshot = JSON.parse(
  readFileSync(join(__dirname, 'seed-data.json'), 'utf8'),
);

// The homepage tech marquee + FAQ live in components, not the lib snapshot, so they
// are declared here (the only content not machine-extracted).
const TECH = [
  'HTML5', 'CSS3', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Tailwind', 'Bootstrap',
  'Node.js', 'Express', 'PHP', 'Laravel', 'MySQL', 'MongoDB', 'WordPress', 'Git', 'GitHub',
  'Elementor', 'Zapier', 'Vercel',
];

const FAQ = [
  {
    q: 'Do I need any programming experience to join?',
    a: 'No. Our Web Development Foundations and JavaScript courses start from absolute zero. We teach HTML5 and CSS3 from first principles, and most of our graduates joined with no prior coding background.',
  },
  {
    q: 'Where is Al-Fateem Academy located?',
    a: 'We are at Office #91, Falak Corporate City, Near Pakistan Post Office, Karachi, Pakistan. You are welcome to visit for a one-to-one discussion about which course fits you.',
  },
  {
    q: 'What technologies will I learn?',
    a: 'Across our nine courses we cover HTML5, CSS3, Tailwind, Bootstrap, Git and GitHub, JavaScript, TypeScript, React, Next.js, PHP, Laravel, Node.js, Express, MySQL, MongoDB, WordPress, AI automation, and deployment.',
  },
  {
    q: 'How long does each course take?',
    a: 'Courses run from two weeks (Deployment) to three months (Web Development Foundations, Backend). Most students combine several courses into a full-stack path over six to nine months.',
  },
  {
    q: 'Do you help students find jobs?',
    a: 'Yes. We have placed over 3,500 graduates in the IT industry since 2008, and we work in coordination with local business houses on curriculum and hiring.',
  },
];

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@alfateemacademy.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe_Strong_Passw0rd!';
  const name = process.env.SEED_ADMIN_NAME ?? 'Site Administrator';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { email },
    update: { name, role: 'ADMIN', active: true },
    create: { email, name, role: 'ADMIN', active: true, passwordHash },
  });
  console.log(`✓ admin user  ${email}`);
}

async function seedSettings() {
  const s = snapshot.site;
  await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      name: s.name,
      legalName: s.legalName,
      tagline: s.tagline,
      url: s.url,
      founded: s.founded,
      description: s.description,
      twitterHandle: s.twitterHandle,
      contact: s.contact as Prisma.InputJsonValue,
      social: s.social as Prisma.InputJsonValue,
      media: snapshot.media as Prisma.InputJsonValue,
    },
  });

  await prisma.navItem.deleteMany();
  await prisma.navItem.createMany({
    data: snapshot.nav.map((n, i) => ({
      label: n.label,
      href: n.href,
      hasMegaMenu: !!n.hasMegaMenu,
      order: i,
    })),
  });

  await prisma.stat.deleteMany();
  await prisma.stat.createMany({
    data: snapshot.stats.map((st, i) => ({
      value: st.value,
      suffix: st.suffix ?? '',
      label: st.label,
      order: i,
    })),
  });
  console.log(`✓ settings + ${snapshot.nav.length} nav + ${snapshot.stats.length} stats`);
}

async function seedCourses() {
  for (const [i, c] of snapshot.courses.entries()) {
    await prisma.course.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        short: c.short,
        track: c.track,
        level: c.level,
        duration: c.duration,
        summary: c.summary,
        stack: c.stack as Prisma.InputJsonValue,
        seoTitle: c.seoTitle,
        seoDescription: c.seoDescription,
        order: i,
        published: true,
        lessons: {
          deleteMany: {},
          create: c.lessons.map((l: any, li: number) => ({
            title: l.title,
            slug: l.slug,
            blurb: l.blurb,
            order: li,
          })),
        },
      },
      create: {
        slug: c.slug,
        title: c.title,
        short: c.short,
        track: c.track,
        level: c.level,
        duration: c.duration,
        summary: c.summary,
        stack: c.stack as Prisma.InputJsonValue,
        seoTitle: c.seoTitle,
        seoDescription: c.seoDescription,
        order: i,
        published: true,
        lessons: {
          create: c.lessons.map((l: any, li: number) => ({
            title: l.title,
            slug: l.slug,
            blurb: l.blurb,
            order: li,
          })),
        },
      },
    });
  }
  console.log(`✓ ${snapshot.courses.length} courses (+lessons)`);
}

async function seedPosts() {
  // Categories derived from the posts themselves.
  const cats = new Map<string, string>();
  for (const p of snapshot.posts) cats.set(p.categorySlug, p.category);
  for (const [slug, name] of cats) {
    await prisma.category.upsert({ where: { slug }, update: { name }, create: { slug, name } });
  }

  for (const p of snapshot.posts) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.categorySlug } });
    await prisma.post.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        image: p.image,
        excerpt: p.excerpt,
        date: new Date(p.date),
        readingTime: p.readingTime,
        body: p.body as Prisma.InputJsonValue,
        categoryId: category.id,
        published: true,
      },
      create: {
        slug: p.slug,
        title: p.title,
        image: p.image,
        excerpt: p.excerpt,
        date: new Date(p.date),
        readingTime: p.readingTime,
        body: p.body as Prisma.InputJsonValue,
        categoryId: category.id,
        published: true,
      },
    });
  }
  console.log(`✓ ${cats.size} categories + ${snapshot.posts.length} posts`);
}

async function seedEvents() {
  for (const [i, e] of snapshot.events.entries()) {
    await prisma.event.upsert({
      where: { slug: e.slug },
      update: {
        title: e.title,
        date: new Date(e.date),
        blurb: e.blurb,
        cover: e.cover,
        images: e.images as Prisma.InputJsonValue,
        order: i,
        published: true,
      },
      create: {
        slug: e.slug,
        title: e.title,
        date: new Date(e.date),
        blurb: e.blurb,
        cover: e.cover,
        images: e.images as Prisma.InputJsonValue,
        order: i,
        published: true,
      },
    });
  }
  console.log(`✓ ${snapshot.events.length} events`);
}

async function seedGraduates() {
  await prisma.graduate.deleteMany();
  await prisma.graduate.createMany({
    data: snapshot.graduates.map((g, i) => ({
      name: g.name,
      image: g.image,
      role: g.role ?? null,
      year: g.year,
      order: i,
      featured: true,
    })),
  });
  console.log(`✓ ${snapshot.graduates.length} graduates`);
}

// Real reviews captured from Google & Facebook (prisma/review-data.json). Regenerate
// that file (or add new reviews from the admin) rather than editing inline; the
// standalone `npm run db:seed:reviews` runs just this step.
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

async function seedTestimonials() {
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
  console.log(`\u2713 ${reviews.length} testimonials (from review-data.json)`);
}

/** Replace a page and its sections atomically (idempotent). */
async function upsertPage(
  key: string,
  meta: { title: string; metaTitle?: string; metaDescription?: string; ogImage?: string },
  sections: { type: string; data: any; enabled?: boolean }[],
) {
  const page = await prisma.page.upsert({
    where: { key },
    update: { ...meta },
    create: { key, ...meta },
  });
  await prisma.section.deleteMany({ where: { pageId: page.id } });
  await prisma.section.createMany({
    data: sections.map((s, i) => ({
      pageId: page.id,
      type: s.type as any,
      order: i,
      enabled: s.enabled ?? true,
      data: s.data as Prisma.InputJsonValue,
    })),
  });
}

async function seedPages() {
  // HOME — mirrors the fold order of the live homepage.
  await upsertPage(
    'home',
    {
      title: 'Home',
      metaTitle: 'Al-Fateem Academy | Web Development Institute in Karachi',
      metaDescription: snapshot.site.description,
    },
    [
      {
        type: 'hero',
        data: {
          eyebrow: 'Training developers since 2008',
          titleLines: ['Learn Today.', 'Lead Tomorrow.'],
          body: "Karachi's web development institute for people who want the job, not just the certificate. Nine industry-aligned courses — from your first HTML tag to a deployed full-stack application in React, Next.js and Laravel.",
          primaryCta: { label: 'Register for a course', href: '/register/' },
          secondaryCta: { label: 'Explore all 9 courses', href: '/courses/' },
          stats: [
            { value: '3,500+', label: 'Graduates hired' },
            { value: '17 yrs', label: 'Since 2008' },
            { value: '9', label: 'Courses' },
          ],
        },
      },
      { type: 'techMarquee', data: { items: TECH } },
      {
        type: 'coursesGrid',
        data: {
          eyebrow: 'Courses',
          title: 'Find the right course for your needs',
          body: 'Whether you are a beginner in web development or already established in the industry, there is always something new to learn. Every outline is upgraded continuously by our trainers against current industry standards.',
          mode: 'all',
        },
      },
      {
        type: 'whyUs',
        data: {
          eyebrow: 'Why Al-Fateem',
          title: 'Tech up your knowledge. Re-explore your web expertise.',
          body: 'Want to kick-start your web development career or give it a boost but lack the right skills? Invest in yourself. We have been an IT talent development hub since 2008, building skilled people for real business requirements.',
          pillars: snapshot.pillars,
        },
      },
      {
        type: 'stats',
        data: {
          items: snapshot.stats.map((s) => ({ value: s.value, suffix: s.suffix ?? '', label: s.label })),
        },
      },
      {
        type: 'graduatesWall',
        data: {
          eyebrow: 'Our Graduates',
          title: '3,500+ developers who started exactly where you are',
          body: 'Most of them walked in with no coding background at all. These are some of the students who finished a course here and went straight into the industry.',
          featuredOnly: true,
        },
      },
      {
        type: 'blogPreview',
        data: {
          eyebrow: 'Journal',
          title: 'Latest news & articles',
          body: 'Practical write-ups from our trainers on the tools and problems our students actually meet.',
          limit: 3,
        },
      },
      {
        type: 'testimonials',
        data: {
          eyebrow: 'Reviews',
          title: 'What our graduates say',
          body: 'Real reviews from students on Google and Facebook. These are the people who trusted us with their start in web development.',
          featuredOnly: true,
          limit: 6,
        },
      },
      {
        type: 'faq',
        data: { eyebrow: 'FAQ', title: 'Questions we get asked most', items: FAQ },
      },
      {
        type: 'cta',
        data: {
          eyebrow: 'Admissions open',
          title: 'It is high time when real training matters.',
          body: 'Register now and start with the course that fits where you actually are. No prior experience required — most of our 3,500+ placed graduates started at zero.',
          primaryCta: { label: 'Register now', href: '/register/' },
        },
      },
    ],
  );

  // ABOUT
  await upsertPage(
    'about',
    {
      title: 'About',
      metaTitle: 'About the Academy — Training Developers Since 2008',
      metaDescription:
        'Al-Fateem Academy is a certified web development institute in the heart of Karachi, offering professional web development courses since 2008.',
    },
    [
      {
        type: 'stats',
        data: {
          items: snapshot.stats.map((s) => ({ value: s.value, suffix: s.suffix ?? '', label: s.label })),
        },
      },
      {
        type: 'richText',
        data: {
          title: 'A preferred destination for quality learning',
          blocks: [
            {
              type: 'p',
              text: 'Al-Fateem Academy is an authentic IT talent development axis, committed to building a skilled manpower resource for the requirements of sizable business houses.',
            },
            {
              type: 'p',
              text: 'Today, more and more students are opting to upgrade their skills, and Al-Fateem Academy has emerged as their preferred destination for quality learning.',
            },
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

  // CONTACT
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
            {
              type: 'p',
              text: 'Want to give your web development skills a boost this year, or simply curious about the courses we offer? Get in touch with our representatives, or email us. You are also more than welcome to have a one-to-one discussion — pay a visit to the academy.',
            },
          ],
        },
      },
    ],
  );

  console.log('✓ pages: home (10 folds), about (4), contact (1)');
}

async function main() {
  console.log('Seeding academy-cms…');
  await seedAdmin();
  await seedSettings();
  await seedCourses();
  await seedPosts();
  await seedEvents();
  await seedGraduates();
  await seedTestimonials();
  await seedPages();
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
