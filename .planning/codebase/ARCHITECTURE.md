# Architecture

**Analysis Date:** 2026-04-27

## Pattern Overview

**Overall:** Next.js 16 App Router with Server Components (RSC) as the primary paradigm. Middleware-gated route access with role-based authorization. Three-tier Supabase client pattern (browser, server, admin) with strict separation of concerns. Server Actions for mutations, API routes for file operations and external-callable endpoints.

**Key Characteristics:**
- Server-first approach: Most data fetching and mutations run on the server; browser client used minimally
- Middleware-enforced auth: Single gatekeeper at `middleware.ts` validates session, role, and route access
- Supabase RLS (Row Level Security) + service-role admin client for operations that need to bypass RLS
- Zod validation on all inputs (client actions, API routes, form submissions)
- Streaming course player + certificate issuance on-demand with PDF generation

## Layers

**Middleware (Request Gatekeeper):**
- Purpose: Validate session, check role, enforce route protection
- Location: `middleware.ts`
- Contains: Route arrays (`PROTECTED_ROUTES`, `ADMIN_ROUTES`, `AUTH_ROUTES`), session fetching, role checks
- Depends on: Supabase SSR client, env vars
- Used by: All protected routes `/dashboard`, `/curso`, `/admin`

**Next.js App Router (Routes & Pages):**
- Purpose: Server Components rendering course UI, dashboards, and marketing landing page
- Location: `src/app/` with structure:
  - `(auth)/login/` — Login page
  - `auth/forgot-password/`, `auth/accept-invite/` — Auth flows
  - `dashboard/` — Student/admin dashboard (protected)
  - `admin/` — Admin CRUD interfaces (admin-only)
  - `curso/[slug]/` — Course player landing
  - `curso/[slug]/aula/[lessonId]/` — Lesson player
  - `api/` — HTTP endpoints for file operations
  - `health/` — Health check (no caching)
  - `page.tsx` — Marketing landing page
- Contains: Page templates, layouts, metadata
- Depends on: Query functions, server actions, components
- Used by: Browser requests, middleware redirects

**Server Actions:**
- Purpose: Handle form submissions and mutations with server-side validation
- Location: `src/app/actions/`
  - `create-lesson.ts` — Lesson + material creation (multipart form, file handling)
  - `create-module.ts` — Module creation
  - `upsert-course.ts` — Course create/update (with cover image)
  - `create-institutional-lead.ts` — Marketing lead capture (uses admin client)
  - `logout.ts` — Session termination
- Contains: Zod schema validation, role checks, RLS queries, error handling
- Depends on: Supabase server client, schemas, logger
- Used by: Form submissions from pages

**API Routes (HTTP Endpoints):**
- Purpose: File upload/download, signed URLs, external callbacks
- Location: `src/app/api/`
  - `/api/materials/upload/route.ts` — POST file upload for lesson materials
  - `/api/materials/signed-url/route.ts` — GET signed URL for material downloads
  - `/api/certificates/signed-url/route.ts` — POST signed URL for certificate PDFs
  - `/api/lesson-progress/complete/route.ts` — POST lesson completion marker
  - `/health/route.ts` — Health check endpoint
- Contains: Request/response handling, auth checks, file validation
- Depends on: Supabase clients, upload/issuer functions
- Used by: Frontend XHR, external systems

**Supabase Client Factories (3 Contexts):**
- Purpose: Isolate client creation for different execution contexts
- Location: `src/lib/supabase/`
  - `client.ts` — Browser client (singleton), no auth persistence
  - `server.ts` — RSC/server-action client, cookie-bound session
  - `admin.ts` — Service-role client, bypasses RLS, server-only
- Contains: Client initialization, type-binding to `Database`
- Depends on: env vars (public and secret)
- Used by: Pages, actions, API routes, migrations

**Domain Libraries (Knowledge Domain Modules):**
- Purpose: Encapsulate business logic for each domain
- Location: `src/lib/{domain}/`
  - **`courses/`** — Course queries, types, schema, cover image handling
    - `queries.ts` — Fetch course, modules, lessons, progress rollup
    - `schema.ts` — Zod validation for course creation/update
    - `types.ts` — TypeScript interfaces (CourseSummary, CourseWithContent, etc.)
    - `covers.ts` — Course cover image URL resolution
  - **`lessons/`** — Lesson creation, validation
    - `schema.ts` — Zod validation for lesson + material forms
  - **`materials/`** — File storage, signed URLs
    - `upload.ts` — Upload lesson material files to Supabase Storage
    - `storage.ts` — Storage utility functions
  - **`certificates/`** — Certificate issuance, PDF generation
    - `issuer.ts` — Core logic: check eligibility, generate PDF, store, return signed URL
    - `pdf.ts` — PDF template rendering with `pdf-lib`
  - **`auth/`** — User roles, profiles, display names
    - `roles.ts` — Fetch user role from profiles table
    - `profiles.ts` — Fetch/update user profile
    - `user-display-name.ts` — Resolve display name from auth user or profile
  - **`marketing/`** — Landing page content
    - `content.ts` — Static marketing copy and structure
    - `institutional-lead-schema.ts` — Zod schema for institutional lead form
  - **`admin/`** — Admin-only functions
    - `call-admin-user-function.ts` — RPC call to create users with initial role
  - **`modules/`** — Module validation
    - `schema.ts` — Zod schema for module creation
  - **`users/`** — User schema validation
    - `schema.ts` — User creation/update schema
- Contains: Queries, mutations, validation, business rules
- Depends on: Supabase clients, Zod, logger
- Used by: Actions, pages, API routes

**Components (React):**
- Purpose: Reusable UI pieces (client-side or server-side rendering)
- Location: `src/components/{category}/`
  - **`marketing/`** — Landing page sections (navbar, forms, cards, CTAs)
  - **`course/`** — Course player components (overview, module list, lesson player, materials)
  - **`auth/`** — Auth UI (login form, logout button, invite acceptance)
  - **`certificates/`** — Certificate display and download
- Contains: Tailwind styles, form handling, user interaction
- Depends on: React, hooks, lib utilities
- Used by: Pages

**Environment & Config:**
- Purpose: Validate and expose env vars safely
- Location: `src/lib/env.ts`
  - `getEnv()` — Returns all env (server-only, includes secrets)
  - `getClientEnv()` — Returns browser-safe public vars
  - Caching: `cachedEnv` to avoid repeated validation
  - Validation: Zod schemas for client and server
- Used by: Client factories, pages, API routes

**Observability & Utilities:**
- Location: `src/lib/logger.ts`
  - Minimal structured logging gated by `LOG_LEVEL` env var
  - Avoids console.* spam in server code
- Used by: All server code

**Database (Supabase):**
- Purpose: Centralized data store with RLS enforcement
- Location: `supabase/migrations/NNNN_*.sql` (manual SQL files)
  - 0001 — Initial schema (courses, modules, lessons, materials, lesson_progress)
  - 0002 — Roles (user_role enum), profiles table
  - 0003 — RLS policies (lessons, materials, lesson_progress)
  - 0004 — Institutional leads RLS
  - 0005 — Lesson progress RLS
  - 0006 — Course cover + material description
  - 0007 — Material storage bucket setup
  - 0008 — Profiles full_name, admin users
  - 0009-0010 — Auth trigger fixes (fail-safe profile creation)
  - 0011 — Courses table + certificates
- Type definitions: `src/lib/database.types.ts` (manually synchronized)
- Used by: All data operations via Supabase client

## Data Flow

**User Authentication & Route Access:**

1. User requests protected route → `middleware.ts` intercepts
2. Middleware extracts cookies, creates Supabase server client
3. Client calls `supabase.auth.getUser()` to validate session
4. If no session: redirect to `/login?redirectTo=...`
5. If session but not admin accessing admin route: redirect to `/dashboard`
6. If authenticated and authorized: continue to page

**Course & Lesson Retrieval:**

1. User accesses `/curso/[slug]` page
2. Page Server Component calls `getCourseWithContent(slug, supabase, userId)`
3. Query joins: courses → modules → lessons → materials + lesson_progress
4. Progress rolled up for completion percentage
5. `CourseWithContent` object returned to page
6. Page renders `CourseOverview` + `ModuleList` with progress indicators

**Lesson Completion Flow:**

1. Student views lesson at `/curso/[slug]/aula/[lessonId]`
2. `LessonPlayer` component (client-side) shows video + complete button
3. User clicks complete → browser XHR POST to `/api/lesson-progress/complete`
4. API route validates session + lesson ownership (RLS)
5. Inserts/updates `lesson_progress` row with status=`COMPLETED`
6. Response returns updated progress
7. Browser state updates; UI reflects completion

**Material Upload Flow:**

1. Admin creates lesson in form at `/dashboard/aulas/nova`
2. Form includes material file input (optional)
3. User selects file + clicks "Cadastrar aula"
4. Form submitted via Server Action `createLessonAction`
5. Action validates lesson data with Zod
6. If material with file upload selected:
   - POST FormData to `/api/materials/upload` with file + lessonId/moduleId
   - API route checks admin role, validates lesson/module
   - Calls `uploadLessonMaterialFile()` → uploads to Supabase Storage (`lesson-materials/{courseId}/{lessonId}/*`)
   - Returns metadata (bucket, path, MIME type, size)
7. Server Action receives metadata, inserts `materials` row with storage references
8. Lesson + material saved; user redirected to course page

**Certificate Issuance Flow:**

1. Student completes all lessons in course
2. Student visits `/dashboard`, sees certificate status "ELIGIBLE"
3. Clicks "Baixar certificado" button
4. Frontend calls `POST /api/certificates/signed-url` with `courseId`
5. API route:
   - Validates student session (rejects admin)
   - Calls `ensureCourseCertificateIssued(userId, courseId)`
   - Issuer logic:
     a. Check if certificate already issued (return it if so)
     b. Fetch course config (template URL, hours, signer info)
     c. Fetch student's lesson progress; verify 100% completion
     d. Generate PDF using `buildCourseCertificatePdf()` with template + learner name
     e. Upload PDF to Supabase Storage (`certificates/{courseId}/{userId}/*`)
     f. Insert `course_certificates` row with file metadata
     g. Return certificate object
6. Route creates signed URL (5min expiry) via admin client
7. Returns `{ url, certificateCode, issuedAt }`
8. Browser opens URL → user downloads PDF

**Marketing Lead Capture:**

1. User fills form on landing page (`/`)
2. Form submitted via Server Action `createInstitutionalLeadAction`
3. Action validates input with Zod schema
4. Creates admin Supabase client (`SUPABASE_SERVICE_ROLE_KEY` required)
5. Inserts row into `institutional_leads` table (bypasses student RLS)
6. Returns success/failure status
7. Form shows confirmation or error message

**State Management:**

- **Client State:** Form state (email, inputs) → managed via Next.js Form/useActionState
- **Server State:** Session (auth user), role, profile → fetched fresh on each request (no stale state)
- **Database State:** All persistent data (courses, lessons, progress, certificates) → RLS policies enforce visibility
- **Auth State:** Supabase manages session in HttpOnly cookies; middleware validates on every request

## Key Abstractions

**Supabase Database Client (Typed):**
- Purpose: Encapsulate all data access with type safety
- Examples: `createSupabaseServerClient()`, `createSupabaseAdminClient()`
- Pattern: Return `SupabaseClient<Database>` generic for full schema typing
- Used by: Every query, mutation

**Query Functions (Data Retrieval):**
- Purpose: Centralized, reusable database queries with progress rollup logic
- Examples: `getCourseWithContent()`, `getAvailableCourses()`, `getLessonWithCourseContext()`
- Pattern: Accept optional Supabase client (or create new), return typed objects
- Error handling: Log errors, return null or empty arrays on failure

**Schema Validation (Zod):**
- Purpose: Validate all external input (forms, API payloads) before database operations
- Examples: `createLessonSchema`, `createModuleSchema`, `institutionalLeadSchema`
- Pattern: Define in `src/lib/{domain}/schema.ts`; parse with `.safeParse()` to handle errors gracefully

**Server Actions (Form Mutations):**
- Purpose: Encapsulate form submission logic with validation, auth checks, and error handling
- Examples: `createLessonAction`, `createInstitutionalLeadAction`
- Pattern: "use server", accept formData or previous state, return typed `FormState` result with success/fieldErrors
- Benefit: No separate API route needed; form submission is direct function call

**Signed URL Pattern (Secure Downloads):**
- Purpose: Generate temporary, pre-authorized download links for files in Supabase Storage
- Examples: Material PDFs, certificates
- Pattern: Admin client creates signed URL (5-minute default expiry), return URL to browser
- Benefit: Avoids exposing storage paths; RLS still enforced at DB level

**Certificate Issuance (Complex Logic):**
- Purpose: Centralized, testable logic for determining eligibility and issuing certificates
- Location: `src/lib/certificates/issuer.ts`
- Pattern: Dependency injection (allow mock createAdminClient, buildPdf, now functions)
- Benefit: Decoupled from HTTP layer; reusable in tests and other contexts

## Entry Points

**Browser:**
- Location: `src/app/layout.tsx`
- Triggers: User navigates to any route
- Responsibilities: Root HTML structure, fonts, metadata, global styles

**Public Landing Page:**
- Location: `src/app/page.tsx`
- Triggers: User visits `/`
- Responsibilities: Render marketing sections (hero, features, curriculum, testimonials, plans, institutional form)

**Protected Pages:**
- Dashboard: `src/app/dashboard/page.tsx` — User's course list, progress, certificates, admin actions
- Course: `src/app/curso/[slug]/page.tsx` — Course overview, module list
- Lesson: `src/app/curso/[slug]/aula/[lessonId]/page.tsx` — Video player, materials, completion button

**Admin Pages:**
- Management: `src/app/admin/page.tsx` — Course CRUD
- User Management: `src/app/admin/usuarios/page.tsx` — User creation/invites
- Invite Resend: `src/app/admin/usuarios/reenviar-convite/page.tsx`

**Auth Pages:**
- Login: `src/app/(auth)/login/page.tsx`
- Forgot Password: `src/app/auth/forgot-password/page.tsx`
- Accept Invite: `src/app/auth/accept-invite/page.tsx`

**API Endpoints:**
- Material Upload: `POST /api/materials/upload`
- Material Signed URL: `GET /api/materials/signed-url`
- Certificate Signed URL: `POST /api/certificates/signed-url`
- Lesson Complete: `POST /api/lesson-progress/complete`
- Health: `GET /health`

## Error Handling

**Strategy:** Centralized logging with graceful degradation. Distinguish between client errors (4xx) and server errors (5xx).

**Patterns:**

**In Server Actions:**
- Validate input with Zod → return `{ success: false, fieldErrors, message }`
- Check auth/role → return error if unauthorized
- Database errors → log, return user-friendly message
- File upload failures → return partial success if lesson created but material failed

**In API Routes:**
- Validate session → return 401 if unauthorized
- Validate role → return 403 if forbidden
- Missing/invalid payload → return 400 with error code
- Database errors → return 500, log details
- File operations → return error with reason (upload_failed, signed_url_failed)

**In Pages:**
- Fetch user session → redirect to `/login` if missing
- Query course/lesson → `notFound()` if doesn't exist
- Logger.error() for unexpected failures (will appear in observability)

**In Middleware:**
- Session validation failure → log (won't break the request, just pass through)
- Role check failure → silent redirect (expected behavior)

## Cross-Cutting Concerns

**Logging:** 
- Framework: `src/lib/logger.ts` (minimal console wrapper)
- Usage: Call `logger.debug|info|warn|error(...)` in server code
- Level: Controlled by `LOG_LEVEL` env var (debug, info, warn, error)
- Benefit: Avoids console spam; structured timestamps

**Validation:**
- Framework: Zod
- Location: `src/lib/{domain}/schema.ts`
- Approach: Define schema once; reuse in actions, API routes, components
- Pattern: `.safeParse()` → check `.success` → return errors or proceed

**Authentication:**
- Framework: Supabase Auth (manages JWT in HttpOnly cookies)
- Middleware: Validates session on every request
- Pages: Call `supabase.auth.getUser()` to fetch current user

**Authorization (Role-Based Access Control):**
- Roles: "student" (default), "admin"
- Enforcement: Middleware checks `role === "admin"` for admin routes
- Secondary: Actions/API routes also check role (defense in depth)
- Storage: Supabase `profiles.role` column

**Database Access Control (RLS):**
- RLS Policies: Enforce at DB level so data is never exposed
- Example: Students can only read lessons/materials for courses they're enrolled in
- Admin Client: Bypasses RLS with `SUPABASE_SERVICE_ROLE_KEY` for admin-only operations
- Pattern: Use admin client only for tasks that require it (e.g., inserting institutional leads, issuing certificates)

---

*Architecture analysis: 2026-04-27*
