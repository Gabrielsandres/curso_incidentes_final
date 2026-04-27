# External Integrations

**Analysis Date:** 2026-04-27

## APIs & External Services

**Stripe (Payment Checkout):**
- Service: Stripe for subscription/course purchase
- What it's used for: Redirect URLs for three subscription tiers (Essencial, Pro, Institucional)
- SDK/Client: None (URLs only; external hosted checkout)
- Auth: Via `NEXT_PUBLIC_CHECKOUT_URL_*` environment variables (three separate URLs)
- Note: Checkout URLs are configured but not yet integrated into payment flow (placeholders in `src/lib/env.ts`)

**Sentry (Error Tracking & Observability):**
- Service: Sentry.io error monitoring
- What it's used for: Exception tracking, performance monitoring, replay sessions (opt-in)
- SDK/Client: `@sentry/nextjs` (10.22.0)
- Auth: `SENTRY_DSN` environment variable
- Config files:
  - `sentry.client.config.ts` - Browser client initialization
  - `sentry.server.config.ts` - Server-side initialization
  - `sentry.edge.config.ts` - (if exists) Edge runtime initialization
- Sampling:
  - Traces: 10% (`tracesSampleRate: 0.1`)
  - Replay sessions: 10% normal (`replaysSessionSampleRate: 0.1`)
  - Replay on error: 100% (`replaysOnErrorSampleRate: 1.0`)
- Enablement: Only enabled when `SENTRY_DSN` is provided
- Instrumentation: Wired through `instrumentation.ts` (register function)

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (public URL, RLS enforced)
  - Client SDK: `@supabase/supabase-js` (2.76.1)
  - Server client: `@supabase/ssr` (0.7.0) for cookie-bound requests
  - Type generation: `src/lib/database.types.ts` (auto-generated from Supabase schema)
  - RLS: Enabled on all tables; policies defined per table
  - Tables:
    - `courses` - Course metadata, cover images, certificate configuration
    - `modules` - Course modules (chapters)
    - `lessons` - Individual lessons with video URLs and materials
    - `lesson_progress` - User lesson completion tracking
    - `lesson_materials` - Supplementary files attached to lessons
    - `profiles` - User profiles with role and full name
    - `institutional_leads` - Marketing lead capture form
    - `course_certificates` - Issued certificates with storage references
  - Auth: Supabase Auth (built-in auth.users table)
  - Migrations: `supabase/migrations/NNNN_*.sql` (11 migrations as of 2026-04-27)

**File Storage:**
- Supabase Storage buckets:
  - `lesson-materials` - Supplementary course materials (max 20MB per file)
    - Allowed types: PDF, Office (doc/docx/xls/xlsx/ppt/pptx), ZIP, PNG, JPG, JPEG
    - Path structure: `courses/{courseId}/lessons/{lessonId}/{timestamp}-{sanitizedFileName}`
    - Signed URL generation: `src/app/api/materials/signed-url/route.ts`
  - `certificates` - Issued certificate PDFs
    - Path structure: Stored in `course_certificates.file_path`
    - Signed URL generation: `src/app/api/certificates/signed-url/route.ts`
  - `course-covers` - Course cover images (inferred from `courses.cover_image_url`)

**Caching:**
- Browser caching: Standard HTTP caching via Next.js (default behavior)
- Server-side: Supabase query caching via RLS and standard DB indexes
- No Redis or external cache layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: OAuth + email/password
  - Cookie-based sessions for RSC and server actions
  - Client-side: `src/lib/supabase/client.ts` (browser client)
  - Server-side: `src/lib/supabase/server.ts` (cookie-bound RSC client)
  - Admin operations: `src/lib/supabase/admin.ts` (service-role client)
  
**Authorization:**
- Role-based access control via `profiles.role` field
  - Roles: `student` (default), `admin`
  - Fetched at request time by `src/lib/auth/roles.ts`
  - Middleware (`middleware.ts`) enforces role checks for protected routes
  - RLS policies on tables restrict data by user

**Profile Management:**
- User profiles created automatically on auth signup via trigger
- Fail-safe trigger logic in migrations 0008–0010
- Full name capture: `profiles.full_name` (optional)
- User display name resolution: `src/lib/auth/user-display-name.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry.io (via `@sentry/nextjs`)
  - DSN configured via `SENTRY_DSN` env var
  - Opt-in (disabled if DSN is empty)
  - Client and server instrumentation

**Logs:**
- Custom logger: `src/lib/logger.ts`
  - Methods: `debug()`, `info()`, `warn()`, `error()`
  - Gated by `LOG_LEVEL` environment variable (default: `info`)
  - Output: console (no external log aggregation)
  - Format: `[ISO_TIMESTAMP] LEVEL ...messages`
- API request logging: Minimal (via logger in route handlers)
- Health check: `src/app/health/route.ts` (dynamic, returns status/uptime/timestamp)

## CI/CD & Deployment

**Hosting:**
- Next.js standard deployment (self-hosted or Vercel)
- Runtime: Node.js 20
- Entry point: `npm run start` (production server)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`)
- Triggers: Push to `main`, pull requests to `main`
- Steps:
  1. Checkout code
  2. Setup Node.js 20 with npm cache
  3. Install dependencies
  4. Run `npm run lint` (ESLint, zero-warning policy)
  5. Run `npm run test -- --run` (Vitest single-pass)
  6. Run `npm run build` (Next.js production build)
- All steps must pass for CI to succeed

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Recommended env vars:**
- `NEXT_PUBLIC_APP_URL` - App base URL (for links in emails, etc.)
- `SENTRY_DSN` - Enable error tracking
- `SUPABASE_SERVICE_ROLE_KEY` - Enable admin operations (institutional lead creation)
- `LOG_LEVEL` - Control logging verbosity

**Secrets location:**
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
- Supabase: `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)
- Supabase: `SUPABASE_JWT_SECRET` (server-only, optional)
- Sentry: `SENTRY_DSN` (can be public URL)
- Stripe: `NEXT_PUBLIC_CHECKOUT_URL_*` (public URLs)

All environment variables validated by Zod schema at `src/lib/env.ts` on server startup.

## Webhooks & Callbacks

**Incoming:**
- Lesson progress completion: `src/app/api/lesson-progress/complete/route.ts`
  - POST endpoint for marking lessons as complete
  - Authenticated via Supabase session
- Certificate signed-URL: `src/app/api/certificates/signed-url/route.ts`
  - POST endpoint to generate signed URLs for certificate PDFs
  - Authenticated, only for students (not admins)
- Material upload: `src/app/api/materials/upload/route.ts`
  - POST endpoint for lesson material file uploads (admin only)
- Material signed-URL: `src/app/api/materials/signed-url/route.ts`
  - POST endpoint to generate signed URLs for lesson materials

**Outgoing:**
- Email notifications: Supabase Auth email templates (confirm signup, password reset)
  - No custom webhook outbound traffic detected
- Sentry error reporting: Automatic when errors occur (if DSN is set)
- No third-party API calls beyond Supabase and Sentry

## Data Flow Overview

1. **User Authentication:**
   - Sign up/login via Supabase Auth
   - Cookie stored via `@supabase/ssr` on server
   - Profile auto-created via PostgreSQL trigger
   - Role cached per request

2. **Course Enrollment:**
   - User views course via `src/app/curso/[slug]/page.tsx`
   - Lessons fetched from `lessons` table with RLS filtering
   - Access controlled by middleware (authenticated users only)

3. **Lesson Progress:**
   - User watches video and completes lesson
   - POST to `src/app/api/lesson-progress/complete/route.ts`
   - Updates `lesson_progress` table
   - Progress tracked in `src/lib/courses/queries.ts`

4. **Material Upload (Admin):**
   - Admin uploads via `src/app/dashboard/aulas/nova/`
   - File POSTed to `src/app/api/materials/upload/route.ts`
   - Validated and sanitized in `src/lib/materials/storage.ts`
   - Stored in Supabase `lesson-materials` bucket
   - Metadata saved to `lesson_materials` table

5. **Certificate Generation:**
   - User completes all lessons (100% progress check)
   - POST to `src/app/api/certificates/signed-url/route.ts`
   - `src/lib/certificates/issuer.ts` checks eligibility and generates PDF
   - `pdf-lib` creates certificate using template and workload hours
   - Stored in `course_certificates` table + `certificates` bucket
   - Signed URL returned for download

6. **Marketing Lead Capture:**
   - Institutional contact form submitted
   - Server action `src/app/actions/create-institutional-lead.ts`
   - Validated via `src/lib/marketing/institutional-lead-schema.ts`
   - Inserted into `institutional_leads` table via admin client

---

*Integration audit: 2026-04-27*
