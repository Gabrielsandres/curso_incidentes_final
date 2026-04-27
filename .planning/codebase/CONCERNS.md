# Codebase Concerns

**Analysis Date:** 2026-04-27

## Tech Debt

**Auth Trigger Fragility:**
- Issue: The `handle_auth_user_profile()` trigger in the database has required two emergency fixes (migrations 0009 and 0010) due to transaction failures causing user profile creation to fail silently
- Files: `supabase/migrations/0008_profiles_full_name_and_admin_users.sql`, `supabase/migrations/0009_fix_auth_profile_trigger.sql`, `supabase/migrations/0010_make_auth_profile_trigger_fail_safe.sql`
- Impact: Users could sign up and have valid auth.users records but no profile entry (breaking profile lookups). Migration 0010 added exception handling with warnings, but failures are only logged to Postgres, not captured in application monitoring
- Fix approach: Monitor trigger execution logs in Supabase for failures. Add application-level verification that profile exists after signup. Consider moving profile creation logic to a post-login hook rather than database trigger

**Environment Variable Direct Access Anti-Pattern:**
- Issue: Multiple locations read `process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.NEXT_PUBLIC_APP_URL`, and `process.env.LOG_LEVEL` directly instead of using the centralized `getEnv()` cache from `src/lib/env.ts`
- Files: 
  - `src/lib/admin/call-admin-user-function.ts:38-49` — reads `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` directly
  - `src/app/layout.tsx:19` — reads `process.env.NEXT_PUBLIC_APP_URL` directly
  - `src/lib/logger.ts:10` — reads `process.env.LOG_LEVEL` directly
  - `src/app/health/route.ts:10` — reads `process.env.APP_VERSION` directly
  - `src/app/auth/forgot-password/forgot-password-form.tsx:14-15` — reads `process.env.NEXT_PUBLIC_APP_URL` directly
- Impact: Bypasses validation and caching layer defined in `env.ts`. Changes to env validation logic won't affect these callsites. Inconsistent error handling and lack of guarantee about env presence
- Fix approach: Replace all direct `process.env.*` reads with imports from `src/lib/env.ts` (getEnv() for server, getClientEnv() for client). Update functions to expose env vars as needed

**Large Component File:**
- Issue: `src/app/dashboard/aulas/nova/lesson-form.tsx` is 764 lines and handles complex state management for lesson creation with material upload, module creation modal, form state, and file validation
- Files: `src/app/dashboard/aulas/nova/lesson-form.tsx`
- Impact: Difficult to test, reason about, and maintain. Multiple responsibilities: form rendering, file upload UI, module creation orchestration, state management
- Fix approach: Extract file upload logic to a separate hook (useFileUpload or similar), extract module selection logic to a subcomponent, reduce to ~400 lines

**Manual SQL Migration Workflow:**
- Issue: No automated migration runner; migrations must be manually applied via Supabase CLI or dashboard
- Files: `supabase/migrations/` (all files)
- Impact: Risk of migrations not being applied consistently across dev/staging/prod. No way to enforce migration order or rollback on failure. New team members may forget to apply pending migrations
- Fix approach: Integrate Supabase migrations into CI/CD pipeline with pre-deployment migration check. Add migration status verification to healthcheck endpoint

**Incomplete Feature: Certificates Module (In-Flight):**
- Issue: New certificate issuing, storage, and retrieval functionality is still in development with untracked files and incomplete integration
- Files: 
  - New: `src/app/api/certificates/` (signed-url endpoint with tests)
  - New: `src/components/certificates/my-certificates.tsx`
  - New: `src/lib/certificates/` (issuer.ts, issuer.test.ts, pdf.ts)
  - New: `supabase/migrations/0011_courses_and_certificates.sql`
- Impact: Course upsert action includes certificate fields (template_url, workload_hours, signer_name, signer_role) with validation, but feature is not yet fully exposed in UI forms. Certificate eligibility logic (requires all lessons completed) may not match user expectations
- Fix approach: Complete course manager UI to include certificate fields. Add integration tests for full certificate issuance flow (lesson completion -> certificate generation -> download). Document certificate eligibility rules

## Known Issues

**Lesson Progress Fallback with Admin Client (Justified but Risky):**
- Problem: `src/app/api/lesson-progress/complete/route.ts:99-131` attempts to update lesson_progress with user client first. If RLS denies permission (403/42501), it falls back to admin client without user intervention
- Files: `src/app/api/lesson-progress/complete/route.ts`
- Trigger: RLS policy on lesson_progress table denies authenticated user INSERT/UPDATE for their own row
- Workaround: Uses admin bypass—logs warning and updates as service role. This is intentional but hard to diagnose if RLS is misconfigured
- Recommendation: This pattern is acceptable for critical paths (lesson completion should always succeed) but should be audited. Add metrics/alerts if fallback is triggered more than expected

**Charset/Encoding Issue in Error Messages:**
- Problem: Multiple error messages in `src/app/actions/create-lesson.ts` have mojibake (garbled characters): lines 85, 106, 112, 148, 151
- Files: `src/app/actions/create-lesson.ts:85`, line 106, 112, 148, 151
- Symptoms: User sees "VocÃª nÃ£o tem permissÃ£o" instead of "Você não tem permissão"
- Cause: Likely a UTF-8 encoding issue during file write or copy
- Fix approach: Re-encode affected strings or use consistent UTF-8 BOM on file. Run linter to catch encoding issues

**Admin Client Without Service Role Key Check:**
- Problem: `src/lib/supabase/admin.ts` throws error only if `SUPABASE_SERVICE_ROLE_KEY` is empty, but doesn't validate it's a valid key format
- Files: `src/lib/supabase/admin.ts:9-11`
- Impact: If key is wrong length or format, error will only surface at first Supabase call, not initialization
- Fix approach: Add basic format validation (min length, should not contain spaces, should start with "eyJ" for JWT)

**RLS Bypass Justification Not Documented:**
- Problem: Admin client is used in multiple places but lack of inline documentation explaining *why* RLS bypass is necessary
- Files:
  - `src/lib/certificates/issuer.ts:56` — Certificate storage/database operations
  - `src/app/actions/create-institutional-lead.ts:45` — User creation (requires service role)
  - `src/app/api/lesson-progress/complete/route.ts:101` — Fallback for lesson progress
  - `src/lib/materials/upload.ts:27` — Material file storage
- Impact: Hard to audit security; unclear if RLS bypass is intentional or a workaround for misconfigured policies
- Fix approach: Add JSDoc comments explaining RLS bypass reason for each usage. Consider centralizing into documented helper functions

## Security Considerations

**Sentry Integration Opt-In but Not Configured:**
- Risk: Error reporting uses Sentry SDK (`@sentry/nextjs`) but SENTRY_DSN is optional and likely empty in development. Global error handler calls `Sentry.captureException()` unconditionally
- Files: `src/app/global-error.tsx:14`, `src/lib/env.ts:34`, `src/app/actions/create-institutional-lead.ts` (imports)
- Current mitigation: SENTRY_DSN is optional; empty DSN will silently disable Sentry. No errors are leaked if DSN not set
- Recommendations: Explicitly check if Sentry is initialized before calling captureException. Add warning log if SENTRY_DSN not configured in production. Use a wrapper function to toggle Sentry based on environment

**Edge Function Credentials Exposed in Function Endpoint:**
- Risk: `src/lib/admin/call-admin-user-function.ts:44` hardcodes function endpoint URL as `${supabaseUrl}/functions/v1/Criar-usuario`. If function name changes, this will break silently
- Files: `src/lib/admin/call-admin-user-function.ts:44`
- Current mitigation: None beyond environment variable caching
- Recommendations: Move function endpoint to env.ts as `NEXT_PUBLIC_EDGE_FUNCTION_CREATE_USUARIO_URL` or similar. Add validation that function is reachable in healthcheck

**Admin User Function Relies on Browser Authorization Header:**
- Risk: `src/lib/admin/call-admin-user-function.ts:108-116` calls Edge Function with user's access token. If token is compromised or token refresh fails, function call will be unauthenticated
- Files: `src/lib/admin/call-admin-user-function.ts`
- Current mitigation: Explicit 401 check on line 100; returns error if no access_token. Edge Function should validate token
- Recommendations: Add token refresh logic before calling function. Log failed auth attempts. Ensure Edge Function uses strict token validation

## Performance Bottlenecks

**Large Marketing Content Bundle:**
- Problem: `src/lib/marketing/content.ts` is 332 lines of hardcoded content (FAQ, pricing, etc.)
- Files: `src/lib/marketing/content.ts`
- Impact: Bundled with every client page load, increases JS bundle size unnecessarily
- Improvement path: Move to CDN-hosted JSON or CMS. Lazy-load on client if not needed for initial render

**Certificate PDF Building on Every Request:**
- Problem: `src/lib/certificates/pdf.ts` calls `PDFDocument.create()`, loads template image, embeds fonts, and generates PDF for every certificate download request
- Files: `src/lib/certificates/pdf.ts:36-80`
- Impact: CPU-intensive operation on each download; no caching. If template asset loading is slow (remote URL), request latency increases
- Improvement path: Cache generated PDFs in Supabase Storage with a 30-day TTL. Generate certificate asynchronously and return signed URL immediately

**Course Queries Without Pagination:**
- Problem: `src/lib/courses/queries.ts` (432 lines) likely fetches all courses and modules on pages like admin and dashboard
- Files: `src/lib/courses/queries.ts`
- Impact: As course count grows, queries become slow. No cursor-based pagination implemented
- Improvement path: Add limit/offset pagination. Create indexed queries for frequently accessed filters (by slug, by admin, by student enrollment)

## Fragile Areas

**Course Certificate Configuration Validation:**
- Files: `src/lib/courses/schema.ts:145-155`, `supabase/migrations/0011_courses_and_certificates.sql:26-39`
- Why fragile: Certificate is enabled only if all 5 config fields are set (template_url, workload_hours, signer_name, signer_role). Validation happens at both Zod schema level and database constraint level. If one constraint fails silently, form accepts data but database rejects it
- Safe modification: Ensure both Zod and database constraints are kept in sync when adding new certificate fields. Add explicit error message for each constraint violation
- Test coverage: Schema tests in `src/lib/courses/schema.test.ts` but no integration tests verifying database constraint error handling

**Lesson Material Type Enum:**
- Files: `src/lib/lessons/schema.ts:35-36`
- Why fragile: Material types are hardcoded as `["PDF", "LINK", "ARQUIVO", "OUTRO"]` but schema doesn't validate consistency with form UI or storage handling
- Safe modification: Before adding new material types, audit all callsites (upload.ts, create-lesson.ts, lesson-materials.tsx). Consider moving to database table for centralized management
- Test coverage: Zod schema tests exist but no E2E test for material lifecycle (upload -> save -> display)

**Auth Trigger with Coalesce Logic:**
- Files: `supabase/migrations/0008_profiles_full_name_and_admin_users.sql:50-56`
- Why fragile: Profile full_name is determined by coalesce(raw_user_meta_data->'full_name', raw_user_meta_data->'name', email prefix, 'Aluno'). Relies on auth.users metadata being set correctly by signup flow or external auth provider
- Safe modification: Validate that signup forms populate full_name or name in metadata. Add fallback lookup (e.g., email domain) if name extraction fails
- Test coverage: No tests for profile creation trigger; failures are silent until profile lookup fails downstream

## Scaling Limits

**Single Lesson Materials Bucket:**
- Current capacity: Supabase Storage bucket can hold millions of objects; no explicit limit set
- Limit: Path structure `lesson-materials/${courseId}/${lessonId}/${filename}` could become hard to manage at 100K+ lessons. No cleanup policy for deleted lessons
- Scaling path: Implement lifecycle policy to delete orphaned materials after lesson deletion. Consider sharding into multiple buckets by course year

**Certificates Storage Bucket:**
- Current capacity: `certificates/${courseId}/${userId}/${timestamp}-${code}.pdf` structure could handle millions of certs
- Limit: No TTL or cleanup for old certificates. Unique constraint on (user_id, course_id) means re-issuance will fail
- Scaling path: Add expiration logic (e.g., certificates valid for 5 years). Implement archival to cold storage. Remove unique constraint if re-issuance should be allowed

**Profile Trigger on Every Auth.users INSERT:**
- Current capacity: Trigger fires for every signup
- Limit: No rate limiting on signup flow. If signup volume spikes, trigger could bottleneck auth system
- Scaling path: Profile creation could be moved to a background job triggered by webhook rather than synchronous trigger

## Dependencies at Risk

**pdf-lib ^1.17.1:**
- Risk: Version 1.17.1 is relatively old. No TypeScript types included; relying on DefinitelyTyped or bundled types
- Impact: PDF generation could fail if template image is invalid format or corrupt. No error recovery
- Migration plan: Consider migrating to `@react-pdf/renderer` or backend PDF service (e.g., Puppeteer, wkhtmltopdf) for more reliable rendering

**@supabase/ssr ^0.7.0 and @supabase/supabase-js ^2.76.1:**
- Risk: May have breaking changes in next major version. SSR middleware is critical for auth flow
- Impact: Dependency updates could break server component auth
- Migration plan: Pin to minor version. Monitor Supabase releases monthly. Test major version upgrades in isolated branch before deployment

## Missing Critical Features

**No Email Verification Workflow:**
- Problem: Auth flow includes password recovery (`src/app/auth/forgot-password/`) but no email verification for new signups
- Blocks: Confident that user email is valid before issuing certificates or course completion

**No Course Enrollment Limits:**
- Problem: Database schema doesn't prevent unlimited course copies or simultaneous enrollments
- Blocks: Enforcing licensing limits or capacity constraints for institutional courses

**No Audit Log for Admin Actions:**
- Problem: Course creation, user invites, and certificate issuance have no audit trail
- Blocks: Compliance with regulatory requirements (LGPD, GDPR)

## Test Coverage Gaps

**Untested: Full Lesson Creation with Material Upload:**
- What's not tested: End-to-end flow from form submission to material stored and metadata saved. File size validation, mime type validation, storage path handling
- Files: `src/app/actions/create-lesson.test.ts`, `src/app/dashboard/aulas/nova/lesson-form.tsx`, `src/lib/materials/upload.ts`
- Risk: Material upload could fail silently if storage policy changes. Form validation could be bypassed by direct API call
- Priority: **High** — Materials are key content; broken uploads degrade user experience

**Untested: Certificate Issuance Eligibility:**
- What's not tested: Logic that certificate only issues when all lessons completed. Edge cases: course with 0 lessons, lesson deletion during completion checks, concurrent issuance attempts
- Files: `src/lib/certificates/issuer.ts`, `src/lib/certificates/issuer.test.ts` (has tests but incomplete)
- Risk: Users could issue certificates without completing course, or race condition during concurrent requests
- Priority: **High** — Certificates are official documents; incorrect issuance is a compliance risk

**Untested: Course Upsert with Certificate Validation:**
- What's not tested: Creating course with incomplete certificate config, updating course to enable certificates mid-way through, disabling certificates after issuance
- Files: `src/app/actions/upsert-course.ts`, `src/lib/courses/schema.ts` (no integration tests)
- Risk: Invalid certificate states could allow orphaned configurations or confused admin workflows
- Priority: **Medium** — Validation at form level is good but database constraints should be verified by tests

**Untested: Lesson Progress Fallback with Admin Client:**
- What's not tested: RLS denial triggering admin fallback, concurrent completion attempts, fallback behavior under high load
- Files: `src/app/api/lesson-progress/complete/route.ts`
- Risk: If admin client initialization fails, users cannot mark lessons complete. Silent fallback could mask RLS misconfigurations
- Priority: **Medium** — Critical path but not heavily tested

**Untested: File Upload Validation (Mime Type, Size):**
- What's not tested: Large files (>max size), invalid mime types, zero-byte files, corrupted file headers
- Files: `src/lib/materials/storage.ts`, `src/app/dashboard/aulas/nova/lesson-form.tsx`
- Risk: Malicious uploads could bypass validation and bloat storage
- Priority: **Medium** — Security risk but mitigated by file size limits and storage quotas

---

*Concerns audit: 2026-04-27*
