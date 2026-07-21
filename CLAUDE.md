# CLAUDE.md — academy-cms-api

Guidance for Claude Code (and developers) working in this repo. Read this first.

## What this is

Headless CMS backend for the Al-Fateem Academy website. **NestJS 10 + Prisma + MySQL 8**,
JWT/RBAC auth, Swagger at `/docs`, the per-section **"folds"** page model, and public
form endpoints. Base path `/api/v1`.

Sibling projects (same parent folder `~/sites/`):
- `alfateem-web` — the public Next.js site this API feeds (Phase 3 wires them together).
- `academy-cms-admin` — the admin dashboard (Phase 2, not built yet).

## Delivery status — 3 phases

| Phase | What | State |
|------|------|-------|
| 1 | This backend API | **Code-complete, never executed** |
| 2 | `academy-cms-admin` Next.js dashboard | Not started |
| 3 | Wire `alfateem-web` to this API (SSR/ISR, Option A) | Not started |

**Important:** this code was authored in an environment with **no npm registry access**,
so `npm install`, `prisma generate/migrate`, and the tests have **never run**. Your
first job is to make it build and run for real. Treat the first install/migrate/seed as
the compile gate.

## First run — do this, in order

```bash
cp .env.example .env
# Edit .env: set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to distinct 32+ char strings
#   openssl rand -base64 48
# Point DATABASE_URL at a MySQL 8 you can reach (or use docker compose below).

npm install
npx prisma generate
npm run db:migrate:dev      # creates the initial migration + tables
npm run db:seed             # imports today's site content + the admin user
npm run start:dev           # http://localhost:4000/api/v1 · docs at /docs
npm test                    # unit tests (folds registry + block schema) — run without a DB
```

Docker path (API + MySQL, no local Node/MySQL needed):

```bash
cp .env.example .env        # set JWT_* + MYSQL_* values
docker compose up --build
docker compose exec api npm run db:seed
```

## Expected issues to fix on first build (be ready for these)

1. **`prisma migrate` needs a reachable MySQL.** If `DATABASE_URL` is wrong the migrate
   step fails first — fix the connection before anything else.
2. **argon2 is a native module.** On Alpine/Docker it needs `python3 make g++` (the
   Dockerfile already installs these). On a bare `npm install` it compiles against the
   local toolchain; if it fails, install build-essential / Xcode CLT.
3. **Type errors are possible** — the tree was never compiled here. Run
   `npx tsc --noEmit` and fix anything. Static checks that already passed: all Prisma
   model usages resolve, all relative imports resolve, all 11 modules wire up, the
   section registry covers every `SectionType`, env schema validates, seed enums match.
4. **`prisma migrate dev` will create `prisma/migrations/`** — that folder does not exist
   yet (only `schema.prisma` + `seed.ts` + `seed-data.json` are committed). This is
   expected; the first migrate generates it.

## Architecture map

```
src/
  main.ts               bootstrap: helmet, CORS, throttler, pino, Swagger, ValidationPipe
  app.module.ts         wires modules + global guards (Throttler → JwtAuth → Roles)
  config/               env.validation.ts (Zod, fails fast) + configuration.ts
  prisma/               PrismaService (global)
  common/               guards, filters (problem-details), decorators (@Public/@Roles/
                        @CurrentUser), pagination, request-id interceptor, blocks schema
  auth/                 login/refresh(rotating)/logout/me, argon2, JwtStrategy
  users/                ADMIN-only user CRUD
  pages/                THE FOLDS ENGINE — section-registry.ts is the source of truth
  courses/ posts/ events/ graduates/ settings/ leads/ media/ health/
prisma/
  schema.prisma         14 models, 6 enums
  seed.ts               idempotent; consumes seed-data.json
  seed-data.json        generated from alfateem-web/src/lib/* — do not hand-edit
```

### The folds model (the thing to understand first)

`src/pages/section-registry.ts` maps each `SectionType` to a Zod schema for its `data`
payload. It is the single source of truth shared by API, admin, and frontend. The API
validates section payloads against it on write; `GET /pages/:key` returns a page with
ordered, enabled sections and reference-type sections (coursesGrid/graduatesWall/
blogPreview) **resolved** against their collections. To add a section type: add one
entry to the registry (+ a frontend renderer). Nothing else changes.

### Regenerating the seed snapshot

`seed-data.json` is extracted from the frontend's own `lib` files so it can't drift. If
frontend content changes, regenerate it (Node 20+):

```bash
# from a scratch dir with site.ts, courses.ts, content.ts copied in and content.ts's
# "./site" import left intact:
node --experimental-strip-types extract.ts prisma/seed-data.json
# (extract.ts imports {site,media,nav,stats} from site, {courses} from courses,
#  {graduates,posts,events,pillars} from content, and writes them as one JSON object)
```

## Conventions

- Strict TS. ESLint + Prettier (`npm run lint`, `npm run format`).
- Lists return `{ data, meta }`; single resources return the object.
- Secure by default: routes need a token unless `@Public()`. `@Roles(ADMIN)` guards
  users/settings/nav/deletes. EDITOR edits content.
- Migrations are the only way schema ships. Seed is idempotent.
- Never commit `.env`. Structured content is validated JSON, never raw HTML.

## When continuing to Phase 2 / 3

- Phase 3 (frontend) should come before or with Phase 2 — it proves the API against real
  pages. See `alfateem-web/CLAUDE.md` for the integration plan; this API already exposes
  `FRONTEND_REVALIDATE_URL` / `REVALIDATE_SECRET` config for the ISR webhook.
- Phase 2 admin is a separate Next.js app at `~/sites/academy-cms-admin` that talks to
  this API. Build its editing forms from `GET /pages/meta/section-types` + the registry.
