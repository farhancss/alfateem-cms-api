# Al-Fateem Academy — Headless CMS API

A production-grade headless CMS for the Al-Fateem Academy website. NestJS + MySQL +
Prisma, documented with Swagger, secured with JWT/RBAC. It serves all site content and
the per-section **"folds"** page model, and accepts the public form submissions.

> **Delivery status.** All three phases are delivered and running:
>
> | Phase | Where | Status |
> |------|-----------|--------|
> | 1. Backend API | this repo | **Delivered — runs locally, migrated + seeded** |
> | 2. Admin dashboard | `alfateem-web` at **`/academy-admin`** (folded into the site app) | **Delivered** |
> | 3. Frontend integration (Option A / SSR-ISR) | [`alfateem-web`](https://github.com/farhancss/afa-v2) | **Delivered** |
>
> The originally planned standalone `academy-cms-admin` project was superseded: the
> admin now lives inside `alfateem-web` under `/academy-admin` and talks to this API.
> Committed migrations live in `prisma/migrations/` — use `npm run db:migrate`
> (deploy) on new environments, then `npm run db:seed`.

---

## Decisions & assumptions

Confirmed with the owner up front:

- **Rendering model: Option A (SSR/ISR).** The frontend will drop `output: 'export'`
  and run on a Node server, fetching from this API with ISR + an on-demand revalidate
  webhook. (Implemented in Phase 3.) This repo already exposes `FRONTEND_REVALIDATE_URL`
  / `REVALIDATE_SECRET` config for that webhook.
- **Admin: a custom Next.js UI** (not AdminJS), shipped inside `alfateem-web` at
  `/academy-admin`. All admin actions go through this versioned API + Swagger contract.
- **Media: editable external URLs.** Image fields are URL strings; the existing
  WordPress URLs keep working. No upload/storage service runs. `MediaModule` validates
  URLs and documents the seam for adding local-disk/S3 uploads later.
- **Notifications: log-only.** New submissions are stored and shown in the admin inbox;
  no email is sent. A `Notifier` interface is bound to a `LogNotifier` so SMTP/Resend
  drops in later with no refactor (`src/leads/notifier.service.ts`).
- **ORM: Prisma** (as recommended), MySQL 8.

Other assumptions: cuid string ids; the settings singleton is a single row keyed
`"singleton"`; post/section structured content is validated JSON, never raw HTML.

---

## Prerequisites

- Node.js 20+
- MySQL 8 (or use the bundled `docker-compose`)
- npm 10+

## Quick start (local, without Docker)

```bash
cp .env.example .env          # then edit secrets (see Env vars below)
npm install
npm run prisma:generate
npm run db:migrate            # applies the committed migrations (prisma/migrations/)
npm run db:seed               # site content + admin user + real reviews + page folds
npm run start:dev             # http://localhost:4000/api/v1  ·  docs at /docs
```

Then start the frontend (`alfateem-web`: `npm run dev`) and log into the admin at
`http://localhost:3000/academy-admin/login` with `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`.

## Quick start (Docker — API + MySQL)

```bash
cp .env.example .env          # set JWT_* secrets and MYSQL_* passwords
docker compose up --build
# API starts, applies migrations automatically, then:
docker compose exec api npm run db:seed
```

`docker-compose.yml` provisions MySQL and the API. The admin app and public site are
separate projects; add them to the compose file if you want the whole stack together.

---

## Environment variables

Every variable is validated at boot (`src/config/env.validation.ts`); the app refuses
to start on anything missing or malformed.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `4000` | HTTP port |
| `APP_URL` | no | `http://localhost:4000` | Public origin (docs/links) |
| `DATABASE_URL` | **yes** | — | MySQL connection string. Use a least-privilege user in prod. |
| `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD` | Docker only | — | Provision the compose MySQL container; keep in sync with `DATABASE_URL`. |
| `JWT_ACCESS_SECRET` | **yes** | — | ≥32 chars. `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | **yes** | — | ≥32 chars, **different** from the access secret |
| `JWT_ACCESS_TTL` | no | `900` | Access token lifetime (s) |
| `JWT_REFRESH_TTL` | no | `1209600` | Refresh token lifetime (s) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | no | see example | Initial ADMIN created by the seed. **Change the password.** |
| `CORS_ORIGINS` | no | localhost:3000,3001 | Comma-separated allowed origins (site + admin) |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | no | `60` / `120` | Global rate limit (auth + forms are stricter in code) |
| `FRONTEND_REVALIDATE_URL` | no | — | ISR webhook the API calls on publish (Phase 3) |
| `REVALIDATE_SECRET` | no | — | Shared secret for that webhook |
| `SWAGGER_ENABLED` | no | `true` | Serve `/docs` |

No secrets are committed; `.env` is gitignored and `.env.example` is the template.

---

## Scripts

| Script | Does |
|---|---|
| `npm run start:dev` | Watch-mode dev server |
| `npm run build` / `start:prod` | Compile to `dist/` / run compiled |
| `npm run db:migrate:dev` | Create + apply a dev migration |
| `npm run db:migrate` | `prisma migrate deploy` (prod) |
| `npm run db:seed` | Idempotent full seed from `prisma/seed-data.json` + `review-data.json` |
| `npm run db:seed:pages` | Targeted upsert of the About + Contact page folds only |
| `npm run db:seed:reviews` | Replace testimonials with the captured Google/Facebook reviews |
| `npm run db:studio` | Prisma Studio |
| `npm test` / `test:cov` | Unit tests (Jest) |
| `npm run test:e2e` | e2e (needs a test DB — see Testing) |
| `npm run lint` / `format` | ESLint / Prettier |

---

## API shape

- Base path: **`/api/v1`** (URI versioned).
- Lists return `{ data: [...], meta: { total, page, limit, pageCount } }`; single
  resources return the object directly.
- Errors are problem-details: `{ statusCode, error, message, path, timestamp, requestId }`.
  `X-Request-Id` is echoed on every response and appears in the logs.
- Auth: `POST /api/v1/auth/login` → Bearer access token (+ rotating refresh token).
- **Swagger UI: `/docs`** documents every endpoint, grouped by tag, with the Bearer
  scheme and schemas.

### Modules / tags

`Auth`, `Users` (ADMIN), `Pages` (folds), `Courses` (+lessons), `Posts` (+categories),
`Events`, `Graduates`, `Settings` (site/nav/stats), `Leads` (registration + contact),
`Media`, `Health`.

### The folds model (§5)

- `GET /api/v1/pages/:key` (public) returns the page with **ordered, enabled sections
  and all references resolved** — e.g. a `coursesGrid` section arrives with its
  `resolved.courses` already attached, so the frontend renders with zero assembly.
- `GET /api/v1/pages/meta/section-types` lists the section registry for the admin.
- Section payloads are validated per-type by `src/pages/section-registry.ts` — the
  single source of truth shared by API, admin, and frontend. Adding a section type is
  one entry there plus a frontend renderer; nothing else changes.

### RBAC

- Secure by default: every route needs a valid token unless marked `@Public()`.
- `@Roles(ADMIN)` guards user management, settings, nav, and destructive deletes.
- `EDITOR` can create/update content (courses, posts, events, graduates, pages,
  sections, stats) and read the submissions inbox.

---

## Security checklist (§9) — how each item is met

- **Passwords**: argon2id (`UsersService.hashPassword`).
- **JWT**: short-lived access + rotating refresh; refresh tokens stored only as a hash;
  reuse of a rotated token hard-revokes the session. `logout` clears it.
- **Validation**: global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`,
  `transform`); structured content validated by Zod and stored as JSON — never raw HTML.
- **Headers / CORS / limits**: `helmet`; CORS locked to `CORS_ORIGINS`; `@nestjs/throttler`
  global + tighter on `/auth/*` (5/min) and `/leads/*` (5/min); 1 MB body cap.
- **Injection**: all queries via Prisma (parameterised). Use a least-privilege DB user.
- **Errors**: global filter → problem details; stack traces never leak; 5xx logged with
  the request id.
- **Ops**: `/health/live` + `/health/ready` (DB ping); `enableShutdownHooks()` for
  graceful shutdown; Prisma pooling.
- **Config**: validated at boot, fails fast.
- **Spam**: public forms have a honeypot (`company`) + rate limit.

---

## Testing

Pure unit tests (no DB) run anywhere:

```bash
npm test        # includes the folds registry + block-schema specs
```

e2e (`test/auth.e2e-spec.ts`) covers login, auth-failure, RBAC, and refresh rotation.
It needs a disposable database:

```bash
DATABASE_URL="mysql://cms:cms_password@localhost:3306/academy_cms_test" \
  npm run db:migrate:dev && npm run db:seed
npm run test:e2e
```

---

## Frontend integration (Phase 3 — Option A, DONE)

Applied in `alfateem-web` (no markup/design changes — only the data source):

1. `output: 'export'` removed; the site runs on a Node runtime (`next start`).
2. Typed client in `src/lib/api/` wrapping these endpoints, mirroring the DTO types,
   with static fallback when the API is unreachable.
3. Pages fetch server-side with ISR (`revalidate: 300`) + `generateStaticParams`.
4. Secured `POST /api/revalidate` route; this API calls it (`FRONTEND_REVALIDATE_URL`
   + `REVALIDATE_SECRET`) on publish so edits appear within seconds.
5. `RegisterForm` + `ContactForm` POST to `/api/v1/leads/registrations` and
   `/leads/contact` (honeypot field `company`).

Frontend env: `NEXT_PUBLIC_API_URL`, `REVALIDATE_SECRET`.

---

## Testimonials / reviews

Student reviews are a moderated collection (`Testimonial` model; `approved` gates public
visibility, `featured` surfaces highlights). Public `GET /testimonials` returns approved
reviews (filter by `source`/`featured`); admin CRUD lives under `/testimonials/admin`.

The real Google/Facebook reviews captured from the academy's listings live in
`prisma/review-data.json`; `npm run db:seed:reviews` replaces the table with that file
(it also runs as part of the full `db:seed`). There is **no live scraper** — both
platforms bot-protect their review pages — so re-capture periodically or add new
reviews from the admin at `/academy-admin/testimonials`. Note the seeder replaces the
table as a set: merge admin-entered reviews into the JSON before re-running it.

---

## Deployment notes

- Run `prisma migrate deploy` on release (the Docker image does this on start).
  Migrations are the only way schema ships.
- Set strong `JWT_*` secrets and a least-privilege `DATABASE_URL`. Consider
  `SWAGGER_ENABLED=false` in prod if you don't want public docs.
- Put the API behind TLS; set `CORS_ORIGINS` to the real site + admin origins.
- The seed is idempotent and safe to re-run; it converges to the snapshot in
  `prisma/seed-data.json`.
