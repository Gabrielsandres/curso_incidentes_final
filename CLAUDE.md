# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Gestao de Incidentes" — Next.js 16 (App Router) platform with a marketing landing page, Supabase-backed auth/DB/storage, a course player (curso/aulas), an admin area, and a certificates module. UI text and content are Portuguese (pt-BR).

## Commands

- `npm run dev` — dev server at http://localhost:3000 (Next.js with `--webpack`)
- `npm run build` — production build (`next build --webpack`)
- `npm run start` — serve the production build
- `npm run lint` — `eslint . --max-warnings=0` (zero-warning policy)
- `npm run typecheck` — `tsc --noEmit`
- `npm run test` — Vitest in watch mode
- `npm run test:ci` — `vitest run --reporter=verbose` (single pass, used in CI)
- Run a single test file: `npx vitest run src/lib/courses/schema.test.ts`
- Filter by name: `npx vitest run -t "<test name>"`

CI (`.github/workflows/ci.yml`) runs install → lint → test → build on push/PR. Treat lint/typecheck/test failures as build-breaking.

## Architecture

### Stack
Next.js 16 App Router + React 19 + TypeScript (strict). Tailwind v4 (via `@tailwindcss/postcss`). Supabase (`@supabase/ssr` + `@supabase/supabase-js`). Sentry (`@sentry/nextjs`, configs in `sentry.{client,server,edge}.config.ts`, wired through `instrumentation.ts`). Zod for all validation. `pdf-lib` for certificate PDFs. Path alias: `@/*` → `src/*`.

### Auth & route protection (read together)
Three Supabase client factories, each for a specific context — do not mix:
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — RSC/server-action client (cookie-bound via `next/headers`)
- `src/lib/supabase/admin.ts` — service-role client; **server-only**, requires `SUPABASE_SERVICE_ROLE_KEY`. Use only when bypassing RLS is required (e.g. inserting `institutional_leads`, admin user functions).

`middleware.ts` is the single gatekeeper:
- `PROTECTED_ROUTES = ["/dashboard", "/curso", "/admin"]` → redirects unauthenticated users to `/login?redirectTo=...`
- `ADMIN_ROUTES = ["/admin", "/dashboard/aulas"]` → requires `role === "admin"` via `fetchUserRole` (reads `profiles.role`); non-admins bounce to `/dashboard`
- `AUTH_ROUTES = ["/login"]` → already-authenticated users are sent to `/dashboard`

When adding a new protected or admin-only route, update the arrays in `middleware.ts` AND the `matcher` config at the bottom — the matcher must include the path or middleware never runs.

Roles enum (`user_role`) lives in the DB; `DEFAULT_ROLE = "student"`. Profile rows are created via an auth trigger (see migrations 0008–0010, which include fail-safe fixes — preserve that fail-safe behavior).

### Env validation
`src/lib/env.ts` validates env with Zod and **caches** the result (`cachedEnv`). Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SENTRY_DSN`, `LOG_LEVEL`) live in `serverSchema`; client-safe vars in `clientSchema` (called from the browser via `getClientEnv`). Add new vars to the matching schema; never read `process.env` directly in feature code. `resetEnvCache()` exists for tests.

### Database & migrations
SQL files in `supabase/migrations/NNNN_*.sql`, applied in numeric order via Supabase SQL Editor or `supabase` CLI (no automated runner in this repo). When schema changes:
1. Add the next-numbered migration file.
2. Update the migration list in `README.md`.
3. Regenerate / hand-edit `src/lib/database.types.ts` to match (this is the typed surface used by `SupabaseClient<Database>`).
RLS policies are enforced — features that need to bypass RLS must use the admin client and document why.

### Domain modules
- `src/lib/courses/` — schemas, queries, types, cover handling. `src/app/curso/[slug]/...` is the learner-facing player.
- `src/lib/lessons/` — lesson schema/validation; lesson creation flows through `src/app/actions/create-lesson.ts` and `src/app/dashboard/aulas/nova/`.
- `src/lib/materials/` — file upload + signed URLs. Upload route: `src/app/api/materials/upload/route.ts`; signed-url route: `src/app/api/materials/signed-url/route.ts`.
- `src/lib/certificates/` — issuer + PDF generation; signed-URL route at `src/app/api/certificates/signed-url/route.ts`. `my-certificates.tsx` renders the user view.
- `src/lib/marketing/` — content + lead schema; `src/app/actions/create-institutional-lead.ts` writes `institutional_leads` using the admin client.
- `src/app/admin/` — admin dashboard (course manager, user manager, invite resend).

Server Actions live under `src/app/actions/` and are the preferred mutation path; API routes (`src/app/api/...`) are reserved for things that need to be HTTP-callable (uploads, signed URLs, lesson-progress completion, health).

### Observability
- `/health` (`src/app/health/route.ts`) — `dynamic` route returning `{status, uptime, timestamp, version}`; do not let it become cacheable.
- `src/lib/logger.ts` — minimal logger gated by `LOG_LEVEL`. Prefer it over `console.*` in server code.
- Sentry is opt-in via `SENTRY_DSN`; leaving it empty disables it.

### Testing
Vitest, `environment: "node"`, includes `src/**/*.test.{ts,tsx}`. Tests sit alongside source (`schema.test.ts`, `queries.test.ts`, etc.). The `@/*` alias is configured in `vitest.config.ts` mirroring `tsconfig.json`. There is no jsdom setup — write tests against pure functions / server logic, not React DOM.

## Conventions worth preserving

- **Lint policy is strict** (`--max-warnings=0`); a new warning fails CI.
- All user input is validated with Zod schemas in `src/lib/**/schema.ts`; reuse/extend these instead of inlining validation in actions or routes.
- Use the typed `Database` generic on every Supabase client call so RLS-shaped responses stay type-safe.
- UI copy is Portuguese — match the existing tone when adding strings.
