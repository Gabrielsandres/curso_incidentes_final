# Codebase Structure

**Analysis Date:** 2026-04-27

## Directory Layout

```
curso_incidentes_final/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI pipeline (lint, test, build)
├── .next/                            # Build output (generated)
├── node_modules/                     # Dependencies (generated)
├── public/                           # Static assets (images, logos)
├── src/
│   ├── app/                          # Next.js App Router pages & routes
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── auth/
│   │   │   ├── accept-invite/
│   │   │   │   ├── page.tsx
│   │   │   │   └── accept-invite-form.tsx
│   │   │   └── forgot-password/
│   │   │       ├── page.tsx
│   │   │       └── forgot-password-form.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── course-manager.tsx
│   │   │   └── usuarios/
│   │   │       ├── page.tsx
│   │   │       ├── user-manager.tsx
│   │   │       └── reenviar-convite/
│   │   │           ├── page.tsx
│   │   │           └── resend-invite-manager.tsx
│   │   ├── api/
│   │   │   ├── certificates/
│   │   │   │   └── signed-url/
│   │   │   │       ├── route.ts
│   │   │   │       └── route.test.ts
│   │   │   ├── lesson-progress/
│   │   │   │   └── complete/
│   │   │   │       └── route.ts
│   │   │   ├── materials/
│   │   │   │   ├── upload/
│   │   │   │   │   └── route.ts
│   │   │   │   └── signed-url/
│   │   │   │       └── route.ts
│   │   │   └── health/
│   │   │       └── route.ts
│   │   ├── actions/
│   │   │   ├── create-lesson.ts
│   │   │   ├── create-lesson.test.ts
│   │   │   ├── create-module.ts
│   │   │   ├── upsert-course.ts
│   │   │   ├── create-institutional-lead.ts
│   │   │   ├── logout.ts
│   │   │   └── course-form-state.ts
│   │   ├── curso/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx
│   │   │       └── aula/
│   │   │           └── [lessonId]/
│   │   │               └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── aulas/
│   │   │       └── nova/
│   │   │           ├── page.tsx
│   │   │           └── lesson-form.tsx
│   │   ├── health/
│   │   │   └── route.ts
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Marketing landing page
│   │   ├── globals.css               # Global styles (Tailwind)
│   │   └── global-error.tsx
│   ├── components/
│   │   ├── auth/
│   │   │   ├── logout-button.tsx
│   │   │   └── (other auth components)
│   │   ├── certificates/
│   │   │   ├── my-certificates.tsx
│   │   │   └── (other certificate UI)
│   │   ├── course/
│   │   │   ├── course-overview.tsx
│   │   │   ├── module-list.tsx
│   │   │   ├── lesson-player.tsx
│   │   │   ├── lesson-materials.tsx
│   │   │   └── (other course components)
│   │   └── marketing/
│   │       ├── navbar.tsx
│   │       ├── institutional-lead-form.tsx
│   │       ├── faq-item.tsx
│   │       ├── plan-card.tsx
│   │       ├── section.tsx
│   │       ├── icon.tsx
│   │       └── (other marketing sections)
│   ├── hooks/
│   │   └── (React hooks)
│   └── lib/
│       ├── admin/
│       │   └── call-admin-user-function.ts
│       ├── auth/
│       │   ├── profiles.ts
│       │   ├── roles.ts
│       │   └── user-display-name.ts
│       ├── certificates/
│       │   ├── issuer.ts             # Core certificate logic
│       │   └── pdf.ts                # PDF generation with pdf-lib
│       ├── courses/
│       │   ├── queries.ts            # Course data retrieval functions
│       │   ├── schema.ts             # Zod validation schemas
│       │   ├── types.ts              # TypeScript interfaces
│       │   └── covers.ts             # Course cover image URL handling
│       ├── lessons/
│       │   └── schema.ts             # Lesson validation schema
│       ├── marketing/
│       │   ├── content.ts            # Landing page copy & structure
│       │   └── institutional-lead-schema.ts
│       ├── materials/
│       │   ├── upload.ts             # File upload logic
│       │   └── storage.ts            # Storage utilities
│       ├── modules/
│       │   └── schema.ts             # Module validation schema
│       ├── supabase/
│       │   ├── client.ts             # Browser client factory
│       │   ├── server.ts             # RSC/action server client factory
│       │   └── admin.ts              # Service-role admin client factory
│       ├── users/
│       │   └── schema.ts             # User validation schema
│       ├── database.types.ts          # Generated Supabase types (keep in sync)
│       ├── env.ts                    # Environment validation & caching
│       └── logger.ts                 # Structured logging utility
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql
│       ├── 0002_roles_and_profiles.sql
│       ├── 0003_lessons_materials_admin_policies.sql
│       ├── 0004_institutional_leads_rls.sql
│       ├── 0005_lesson_progress_rls.sql
│       ├── 0006_course_cover_and_material_description.sql
│       ├── 0007_materials_storage_uploads.sql
│       ├── 0008_profiles_full_name_and_admin_users.sql
│       ├── 0009_fix_auth_profile_trigger.sql
│       ├── 0010_make_auth_profile_trigger_fail_safe.sql
│       └── 0011_courses_and_certificates.sql
├── .eslintrc.json                   # ESLint config (strict, zero-warning policy)
├── .prettierrc                      # Prettier config
├── CLAUDE.md                        # Architectural guidance for Claude
├── eslint.config.mjs                # ESLint flat config (v9+)
├── instrumentation.ts               # Sentry initialization
├── middleware.ts                    # Auth middleware (route protection)
├── next.config.ts                   # Next.js config (Webpack, env validation)
├── package.json                     # Dependencies & scripts
├── package-lock.json                # Lock file
├── README.md                        # Project readme & migration list
├── sentry.*.config.ts               # Sentry configuration files
├── tsconfig.json                    # TypeScript config (strict, path aliases)
└── vitest.config.ts                 # Vitest config (node environment, alias mapping)
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: Page templates, layouts, route handlers
- Key files: `page.tsx` (routes), `layout.tsx` (nesting), `route.ts` (API endpoints)
- Auth: Protected via `middleware.ts`; pages call `supabase.auth.getUser()` and redirect if needed

**`src/app/(auth)/` and `src/app/auth/`:**
- Purpose: Authentication flow pages
- Contains: Login, password recovery, invite acceptance
- Pattern: Form submission → server action → validation → Supabase Auth or DB update

**`src/app/admin/`:**
- Purpose: Admin-only interface for course/user management
- Contains: Course CRUD (`course-manager.tsx`), user management, invite resending
- Protection: Middleware enforces `role === "admin"`; pages re-check for safety

**`src/app/api/`:**
- Purpose: HTTP endpoints for file operations, signed URLs, external callbacks
- Contains: Material upload, certificate signed URLs, lesson progress completion
- Auth: API routes verify session + role before processing
- Pattern: Validate input → business logic → return JSON response

**`src/app/actions/`:**
- Purpose: Server Actions for form mutations
- Contains: Lesson/module/course creation, institutional lead capture, logout
- Pattern: Zod validation → auth/role check → DB mutation → redirect or return state
- Benefit: No separate API route; form submission is direct function call

**`src/app/curso/`:**
- Purpose: Course player (learner-facing)
- Contains: Course overview, lesson list, lesson player with video + materials
- Params: `[slug]` (course identifier), `[lessonId]` (lesson identifier)
- Data: Fetched server-side; progress loaded for completion tracking

**`src/app/dashboard/`:**
- Purpose: Student/admin dashboard
- Contains: Course list with progress, certificates, admin actions (conditionally for admins)
- Data: Courses rolled up with lesson progress; certificates fetched for students only

**`src/components/`:**
- Purpose: Reusable React components
- Organization: By feature (`auth/`, `course/`, `marketing/`, `certificates/`)
- Pattern: Mix of Server Components (default) and Client Components ("use client")
- Styling: Tailwind CSS (no CSS-in-JS)

**`src/lib/`:**
- Purpose: Business logic, queries, utilities, type definitions
- Organization: By domain (`auth/`, `courses/`, `materials/`, `certificates/`, etc.)
- Pattern: Pure functions, Zod schemas, typed Supabase queries
- Exports: Query functions, schema validators, utility functions

**`src/lib/supabase/`:**
- Purpose: Supabase client factories (context-aware initialization)
- Files:
  - `client.ts` — Browser client (singleton)
  - `server.ts` — RSC/action client (cookie-bound)
  - `admin.ts` — Service-role client (bypasses RLS, server-only)
- Rule: **Never mix contexts.** Use correct client for your layer.

**`src/lib/certificates/`:**
- Purpose: Certificate generation and issuance
- `issuer.ts` — Core logic: eligibility check, PDF generation, storage, metadata persistence
- `pdf.ts` — PDF rendering using `pdf-lib` library
- Pattern: Dependency injection for testability

**`src/lib/courses/`:**
- Purpose: Course data access and validation
- `queries.ts` — Data retrieval functions (course, modules, lessons, progress)
- `schema.ts` — Zod validation for course creation/update
- `types.ts` — TypeScript interfaces (CourseSummary, CourseWithContent, etc.)
- `covers.ts` — Course cover image URL resolution (CDN vs uploaded)

**`supabase/migrations/`:**
- Purpose: SQL schema evolution
- Pattern: Numeric prefix (0001, 0002, ...) applied in order
- Application: Manual via Supabase SQL Editor or `supabase` CLI (not automated)
- Sync: After migrations, regenerate/hand-edit `src/lib/database.types.ts`

**`supabase/migrations/0008-0010`:**
- Special: Fail-safe auth trigger (preserve this pattern when modifying auth flows)
- Creates profile row when user signs up; catches errors gracefully

**`supabase/migrations/0011`:**
- Adds: Courses table (with certificate config), certificates table, course_certificates table
- RLS: Students see only their enrolled courses; admins can manage all

**Root-level Config Files:**
- `middleware.ts` — Route protection gatekeeper
- `instrumentation.ts` — Sentry initialization
- `next.config.ts` — Next.js configuration (Webpack, env validation)
- `tsconfig.json` — TypeScript config (path aliases: `@/*` → `src/*`)
- `vitest.config.ts` — Vitest setup (node environment, alias mapping)
- `eslint.config.mjs` — ESLint flat config (strict rules)
- `.prettierrc` — Prettier formatting rules
- `CLAUDE.md` — Architectural guidance (read first!)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` — Root layout (HTML structure, fonts, metadata)
- `src/app/page.tsx` — Marketing landing page
- `middleware.ts` — Auth middleware (invoked on every request matching `/dashboard/:path*`, `/curso/:path*`, `/admin/:path*`, `/login`)

**Configuration:**
- `src/lib/env.ts` — Environment variable validation and caching
- `next.config.ts` — Next.js behavior configuration
- `tsconfig.json` — TypeScript compiler options and path aliases

**Core Logic:**
- `src/lib/certificates/issuer.ts` — Certificate eligibility + issuance
- `src/lib/courses/queries.ts` — Course/lesson/progress data retrieval
- `src/app/actions/create-lesson.ts` — Lesson creation (with material handling)
- `src/app/api/materials/upload/route.ts` — Material file upload
- `src/app/api/certificates/signed-url/route.ts` — Certificate download URL generation

**Testing:**
- `src/lib/lessons/schema.test.ts` — Lesson schema validation tests
- `src/app/actions/create-lesson.test.ts` — Create lesson server action tests
- `src/app/api/certificates/signed-url/route.test.ts` — Certificate API route tests

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Server Actions: `*.ts` files with `"use server"` directive
- Components: PascalCase (e.g., `CourseManager.tsx`)
- Tests: `*.test.ts` or `*.spec.ts` colocated with source
- Utilities: lowercase-kebab-case (e.g., `user-display-name.ts`)

**Directories:**
- Routes: lowercase with brackets for dynamic segments (e.g., `[slug]/`)
- Domain modules: lowercase plural (e.g., `courses/`, `lessons/`, `materials/`)
- Components: lowercase plurals grouped by feature (e.g., `marketing/`, `auth/`)
- API routes: path matches HTTP route (e.g., `api/materials/upload/route.ts` → `POST /api/materials/upload`)

**Variables & Functions:**
- Camel case: `userId`, `courseSlug`, `isEligible`
- Constants: UPPER_SNAKE_CASE (e.g., `PROTECTED_ROUTES`, `UUID_REGEX`)
- React components: PascalCase (e.g., `CourseOverview`, `LessonPlayer`)
- Query functions: verb-noun (e.g., `getCourseWithContent`, `getUserCertificatesByCourseId`)
- Schema validators: singular noun (e.g., `createLessonSchema`, `institutionalLeadSchema`)

**Types & Interfaces:**
- Suffixes: `Row` (table row), `Summary` (summarized data), `WithContent` (nested), `Result` (function return)
- Examples: `CourseRow`, `CourseSummary`, `CourseWithContent`, `CertificateRow`
- Union types: status-based (e.g., `{ status: "issued"; certificate: ... } | { status: "not_eligible"; ... }`)

## Where to Add New Code

**New Feature (Lesson, Course, etc.):**
- Primary code: `src/lib/{domain}/` (queries, schema, types)
- Server Action: `src/app/actions/{feature-name}.ts` (mutation entry point)
- Page/Component: `src/app/{route}/` or `src/components/{feature}/`
- Tests: Colocated (e.g., `src/lib/{domain}/queries.test.ts`)

**New Component/Module:**
- Implementation: `src/components/{category}/{component-name}.tsx`
- If feature-specific: Nest in appropriate subdirectory (e.g., `src/components/course/new-component.tsx`)
- If shared: Place at `src/components/shared/` or top-level if universally used

**New Utilities:**
- Shared helpers: `src/lib/utils.ts` or new file in `src/lib/{domain}/`
- Hooks: `src/hooks/{hook-name}.ts` (keep minimal; prefer server functions)

**New API Route:**
- HTTP endpoint: `src/app/api/{resource}/{action}/route.ts`
- Pattern: GET/POST/PUT/DELETE handler with request validation
- Auth: Check session + role at top; return 401/403 if unauthorized
- Validation: Use Zod schema from `src/lib/{domain}/schema.ts`

**New Database Table/Column:**
- Migration: Create new file `supabase/migrations/NNNN_{description}.sql`
- Numbering: Increment from latest (e.g., 0012_...)
- Sync: After applying, regenerate `src/lib/database.types.ts`
- RLS: Define policies for student/admin visibility if needed

**New Page (Route):**
- File: `src/app/{path}/page.tsx`
- Protection: If protected, add to `PROTECTED_ROUTES` or `ADMIN_ROUTES` in `middleware.ts`
- Update matcher: Add to `config.matcher` in `middleware.ts` if not already matched
- Redirect logic: Call `supabase.auth.getUser()` and redirect to `/login` if needed
- Data: Fetch server-side in Server Component; pass to client components as props

## Special Directories

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (created by `npm run build`)
- Committed: No (in `.gitignore`)
- Content: Compiled pages, routes, optimized assets

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (created by `npm install`)
- Committed: No (in `.gitignore`)
- Updated: `npm install` or `npm ci` in CI

**`supabase/migrations/`:**
- Purpose: Database schema evolution
- Generated: No (manually authored SQL)
- Committed: Yes (version control for schema)
- Application: Manual via Supabase UI or CLI

**`.github/workflows/`:**
- Purpose: CI/CD pipeline configuration
- Generated: No (manually authored)
- Committed: Yes (version control for CI)
- Triggers: `ci.yml` runs on push/PR (lint → test → build)

**`.planning/codebase/`:**
- Purpose: Codebase documentation (generated by GSD mapper)
- Generated: Yes (by `/gsd-map-codebase` command)
- Committed: Yes (reference for developers)
- Files: `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `CONCERNS.md`, `STACK.md`, `INTEGRATIONS.md`

---

*Structure analysis: 2026-04-27*
