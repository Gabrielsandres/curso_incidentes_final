# Domain Pitfalls

**Domain:** Online course platform with anti-piracy video, B2B institution scoping, certificate-on-100%, admin CRUD — Next.js 16 + Supabase brownfield
**Researched:** 2026-04-27
**Overall Confidence:** HIGH (sourced from existing codebase, Supabase RLS documentation, Bunny Stream docs, and established patterns)

---

## Critical Pitfalls

Mistakes that trigger rewrites, data corruption, or legal/trust failures.

---

### Pitfall 1: Certificate Regeneration Storm on Each Page Visit

**What goes wrong:** `ensureCourseCertificateIssued` is already correctly idempotent — it checks for an existing record before issuing. The dangerous scenario is when the unique DB constraint on `(user_id, course_id)` is NOT in place (or is silently not applied because migration 0011 was only partially applied), and the certificate page calls the issuer on every render. Without the constraint, each visit from the same student generates a new PDF, uploads it to storage, and inserts a new row. Storage fills with orphaned PDFs; the student sees different certificate codes on repeat visits.

**Why it happens:** The `certificates` storage bucket creation and the `unique (user_id, course_id)` constraint are both in migration 0011. If that migration is run partially — e.g., the `ALTER TABLE courses` lines succeed but the `CREATE TABLE course_certificates` block fails — the constraint never exists, but the app code has no way to know.

**Consequences:** Certificate codes differ between downloads (undermines the certificate's official identity); storage grows unboundedly; if Supabase Storage egress billing kicks in, costs spike; on a Supabase free tier (500 MB storage), this fills the quota.

**Prevention:**
- The existing `issuer.ts` correctly checks `getExistingCertificate` first — preserve this unconditionally; never refactor it away.
- The `isUniqueViolation` fallback in `issuer.ts` (lines 145–153) handles the race correctly; do not simplify it.
- Add an integration test that calls `ensureCourseCertificateIssued` twice sequentially for the same `(userId, courseId)` and asserts the second call returns `{ status: "already_issued" }` without inserting a new storage object.
- In the certificate download page, never call the issuer on GET requests. Trigger issuance only from the lesson-completion POST (`/api/lesson-progress/complete`) and optionally from a dedicated "claim certificate" button — never on page load.

**Warning sign:** More than one row in `course_certificates` for the same `(user_id, course_id)` — this is blocked by the DB constraint but only if migration 0011 was applied completely. Run `SELECT user_id, course_id, COUNT(*) FROM course_certificates GROUP BY 1,2 HAVING COUNT(*) > 1;` after applying each migration in production.

**Phase mapping:** Certificate completion phase (whichever phase ships "Aluno recebe certificado").

---

### Pitfall 2: Progress 100% Breaks When Admin Adds a Lesson After Student Completed

**What goes wrong:** A student completes all 5 lessons of a course and receives a certificate. The admin later adds a 6th lesson (new module or existing module). `isCertificateEligible` in `issuer.ts` recalculates `totalLessons` dynamically from the current `lessons` table — not from a snapshot. On the next page visit, the student sees 83% progress (5/6) and the certificate appears to be invalid or the "100%" badge disappears from the dashboard.

**Why it happens:** `getUserCourseProgress` in `issuer.ts` always queries live lesson count. There is no enrollment snapshot. The `unique (user_id, course_id)` constraint on `course_certificates` means a new certificate cannot be re-issued (correctly), but the progress display will show <100% even though the certificate was legitimately earned.

**Consequences:** Students contact support confused why their progress went backward. If the institution manager sees the dashboard showing "not complete," they may refuse to accept the certificate. Trust in the platform erodes.

**Prevention:**
- Decide the business rule explicitly (document in CLAUDE.md): "A certificate once issued is permanent. Adding new lessons to a published course does not revoke existing certificates. The dashboard shows a separate indicator — 'Certificado emitido' — that is independent of current lesson count."
- Implement `issued_at` as the source of truth. If `course_certificates` has a row for `(user_id, course_id)`, show the "certificado emitido" badge regardless of current progress %.
- For new lessons added post-certification, display a "Nova aula disponível" badge rather than decreasing the progress percentage retroactively.
- Never tie the dashboard % display to certificate validity.

**Warning sign:** Student complains progress went from 100% to <100%. Query: `SELECT c.title, COUNT(l.id) as total_lessons FROM courses c JOIN modules m ON m.course_id = c.id JOIN lessons l ON l.module_id = m.id GROUP BY c.id` and compare against the lesson count at time of certificate issuance.

**Phase mapping:** Progress display + certificate UI phase. Must be designed before the first course goes live with multiple lessons, because the data contract cannot easily be changed after certificates are issued.

---

### Pitfall 3: RLS WITH CHECK Missing on Gestor (Institution Manager) Policies

**What goes wrong:** When writing RLS for the `institution_manager` role, developers typically write the `USING` clause to restrict reads, but forget `WITH CHECK` on INSERT/UPDATE policies. The result: a gestor cannot read students from other institutions (USING works), but can write progress records, certificates, or enrollments on behalf of students they don't manage (WITH CHECK absent = no write restriction).

**Why it happens:** PostgreSQL applies USING to SELECT, DELETE, and the filter in UPDATE/DELETE. `WITH CHECK` is the guard on the new row in INSERT and UPDATE. They are separate clauses. Supabase's policy editor shows them as optional fields, and it is easy to set one without the other.

**Consequences:** A gestor from Escola A can insert enrollment records for students of Escola B if the INSERT policy only checks `USING` (which is ignored for inserts). In a sensitive content domain (school safety, lockdown protocols), this is a data integrity violation with potential LGPD implications.

**Prevention:**
- Every policy that allows INSERT or UPDATE for `institution_manager` MUST have an explicit `WITH CHECK` clause. Template:
  ```sql
  create policy "Gestores manage own institution enrollments"
    on public.enrollments
    for insert
    to authenticated
    with check (
      exists (
        select 1 from public.institution_members im
        join public.institutions i on i.id = im.institution_id
        where im.user_id = auth.uid()
          and im.role = 'gestor'
          and enrollments.institution_id = i.id
      )
    );
  ```
- Code review checklist for every institution RLS migration: "Does every INSERT/UPDATE policy have `WITH CHECK`?"
- After writing each policy, test with a `gestor` JWT against a student from another institution; expect a 403.

**Warning sign:** A policy exists with `for insert` or `for update` but no `with check (...)` line. Audit with: `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('enrollments', 'institution_members') AND (cmd IN ('INSERT','UPDATE','ALL')) AND with_check IS NULL;`

**Phase mapping:** B2B institution scoping phase (migration that introduces `institutions` + `institution_members` tables).

---

### Pitfall 4: Recursive RLS Policy on Profiles Table Causes Stack Overflow

**What goes wrong:** The existing RLS on `courses`, `modules`, `lessons` already does a subquery to `profiles` to check `role`. When the B2B phase adds a new `institutions` or `institution_members` table whose RLS policy also subqueries `profiles` — and if a `profiles` policy in turn looks at another table that references `profiles` — Postgres enters infinite recursion and throws `stack depth limit exceeded`, breaking all queries for authenticated users.

**Why it happens:** Postgres evaluates RLS policies recursively. A policy on table A that queries table B, which has a policy querying table A, loops forever.

**Consequences:** All authenticated API calls return 500. The app appears to be down. The issue is invisible in application logs (Supabase returns a generic DB error); only visible in Postgres logs.

**Prevention:**
- Keep `profiles` RLS policies strictly non-recursive: they must only use `auth.uid()` directly, never subquery other tables.
- For role-checking sub-queries in other tables' policies, use a security-definer helper function that bypasses RLS internally:
  ```sql
  create or replace function public.get_my_role()
  returns public.user_role
  language sql stable security definer
  set search_path = public
  as $$
    select role from public.profiles where id = auth.uid();
  $$;
  ```
  Then policies reference `get_my_role() = 'admin'` instead of a raw subquery. This breaks the recursion surface.
- Never add a policy to `profiles` that queries `institution_members` or any table that itself has policies querying `profiles`.

**Warning sign:** Any new RLS migration that adds a SELECT on `profiles` inside a policy on a table whose own read policy queries `profiles`. Review every new policy for this shape before applying.

**Phase mapping:** B2B institution scoping phase. Must be validated in a local Supabase instance before applying to production.

---

### Pitfall 5: Auth Trigger Breaks on `institution_manager` Role Enum Addition

**What goes wrong:** Migration 0002 creates `user_role AS ENUM ('student', 'admin')`. The B2B phase must add `institution_manager` to this enum. Altering an enum in Postgres requires `ALTER TYPE ... ADD VALUE`. The trigger `handle_auth_user_profile` (migration 0010) hardcodes `'student'` as the default role — this is safe. But if any other code path does `role::user_role` casting from a string that is not in the enum (e.g., from a form field), it will throw a cast error inside the trigger, which is silently swallowed by the `EXCEPTION WHEN OTHERS` block (migration 0010, line 26). The user gets an `auth.users` row but no `profiles` row.

**Why it happens:** The fail-safe trigger was designed to never break auth — it swallows all exceptions. This means new enum values that cause cast errors are invisible until an admin notices missing profiles.

**Consequences:** An `institution_manager` invited via the admin panel completes signup, gets an `auth.users` entry, but has no `profiles` row. Middleware's `fetchUserRole` returns null, bounces them to `/dashboard` instead of the gestor dashboard. The invite flow appears broken.

**Prevention:**
- Before adding `institution_manager` to any code path that touches the trigger, run the enum migration FIRST and verify it applied: `SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'user_role';`
- Enum ADD VALUE is transactional in Postgres >= 12 only within certain conditions — verify Supabase's Postgres version. Never add enum values inside a transaction block in older versions.
- Add application-level profile verification after every invite acceptance: after `supabase.auth.signInWithOtp` or `acceptInvite`, immediately query `profiles` and surface an error if the row is missing, rather than silently redirecting to a broken state.
- Log profile creation failures to Sentry, not just to Postgres warning logs (which are invisible unless you're in the Supabase dashboard).

**Warning sign:** User appears in `auth.users` but not in `profiles`. Periodic check: `SELECT id FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles) LIMIT 20;`

**Phase mapping:** B2B institution scoping phase, specifically the migration that adds `institution_manager` to `user_role`.

---

### Pitfall 6: Signed URL Leakage Via Bunny Stream Token — Shared Across Devices

**What goes wrong:** Bunny Stream token authentication signs a URL with an expiry and optionally an IP address. If the signed URL is generated server-side and cached (e.g., in Next.js `cache()` or stored as a static prop), two students on different IPs — or the same student on mobile and desktop simultaneously — receive the same signed URL. When IP locking is enabled, the second device gets a 403. When IP locking is disabled, students can share signed URLs in WhatsApp groups and bypass authentication entirely for the duration of the token TTL.

**Why it happens:** Bunny Stream's default signed URL documentation shows a simple HMAC of `{SecurityKey}{VideoPath}{Expiry}`. IP binding requires explicitly adding the client IP to the HMAC input. If the video player component fetches the signed URL once per page load (stateless, no IP binding), the URL is functionally transferable.

**Consequences without IP binding:** A student shares the signed URL; anyone with the link watches the video for up to TTL minutes. For sensitive school safety content, this is a real brand risk.

**Consequences with IP binding:** Mobile users on LTE/5G with dynamic IPs, or users behind NAT/CGNAT where their perceived IP changes mid-session, get random playback failures. This will generate support tickets.

**Prevention:**
- Do NOT use IP binding in v1. The false-negative rate on mobile Brazil (Claro, Vivo, TIM all use CGNAT) is too high.
- Use short TTL (15 minutes maximum) and generate the signed URL server-side per request, not cached. Include the `userId` in a custom claim or embed a `?user=` query param in the URL that Bunny validates against (Bunny supports custom headers in token validation if configured).
- Pair with a DOM-overlay watermark of the student email as a social deterrent (see Pitfall 7).
- Log every signed URL generation with `userId`, `videoId`, and timestamp. If the same video generates more than N unique signed URL requests from one user within 1 hour (indicating credential sharing), flag the account.
- Set a realistic expectation with MDHE: "We can make piracy inconvenient and attributable, but not technically impossible without DRM (Widevine/FairPlay), which requires a budget-tier Bunny Stream plan."

**Warning sign:** High signed URL request volume from a single user, or requests for the same video from geographically distant IPs within minutes of each other.

**Phase mapping:** Video anti-piracy phase (Bunny Stream integration). Must be decided before building the player abstraction layer.

---

### Pitfall 7: Anti-Piracy via DOM Overlay — Security Theater vs Real Deterrence

**What goes wrong:** A `<div>` overlay with the student's email watermarked on the video can be removed in two keystrokes: `F12 → select element → Delete`. This is not a technical barrier — it is a social barrier (the leak is attributable). Treating it as a technical protection creates false confidence for the client.

**Realistic ceiling of DOM watermarking:**
- Stops: Casual sharing via screen recording where the watermark is visible in the recording.
- Does not stop: Anyone with basic DevTools knowledge, screen recorders that crop the overlay div, virtual machines that prevent overlay rendering.
- Stops: Accidental sharing (student forgets watermark is there).
- Does not stop: Intentional, technical piracy by motivated actors.

**Why it matters for MDHE:** The content is academically validated and brand-sensitive. The real risk is not technical piracy — it is unauthorized commercial redistribution (a competitor republishing the material). DOM watermarks are effective deterrents against this because they create legal attribution evidence.

**Prevention:**
- Be explicit in the architecture document: "Watermark is a deterrent and attribution tool, not a DRM. It does not technically prevent recording."
- Implement the watermark as a CSS `pointer-events: none` absolutely-positioned overlay with `z-index` above the video player, rotating position every 30 seconds to make partial-crop screen captures harder.
- Do NOT render the full email in plain text in the DOM (visible to scraping). Use `data-user-id` and inject via JavaScript only after hydration, so the email is not in the initial HTML payload.
- For videos where MDHE is most concerned (flagship course), add a visible "Certificado de uso exclusivo de [Name]" text that persists across the video duration and is burned server-side if/when Bunny Stream's server-side watermarking is available.
- The honest conversation with the client: "Our watermark means if the video appears on YouTube or a competitor's site, we can identify which student account leaked it and take legal action. That's the actual value."

**Warning sign:** Client asks "Can students bypass the watermark?" — this must be answered honestly in the onboarding conversation, not discovered post-launch.

**Phase mapping:** Video anti-piracy phase. The architecture decision (social deterrent vs. technical DRM) must be made and documented before the player is built.

---

### Pitfall 8: YouTube Unlisted Videos Surface in Production

**What goes wrong:** YouTube "unlisted" means "not in search results, but accessible to anyone with the link." The link is in the HTML of the course player page, which is server-rendered and crawlable. Google indexes page content, and if the unlisted link appears in a canonical URL or opengraph tag, it becomes findable. Additionally, YouTube's embed API returns video metadata that can reveal the channel, making it trivial to find other videos from the same channel.

**Specific risks for MDHE:**
- A student shares the course page URL; the recipient extracts the YouTube embed ID; YouTube suggests related videos from MDHE's channel.
- Screen recorders capture YouTube's embedded player without any custom watermark (YouTube overlays are not applied to embeds by default).
- YouTube can detect repeated embedding from production domains that look commercial and may flag the account.

**Prevention:**
- YouTube unlisted is appropriate ONLY for development and staging. Never deploy to production with YouTube-backed videos.
- The player abstraction layer (video provider interface) must enforce this: `VideoProvider.type === 'youtube'` throws an error if `NODE_ENV === 'production'` or if `NEXT_PUBLIC_VIDEO_PROVIDER_ENFORCE` env var is set.
- For dev/staging YouTube videos: disable embeds on the YouTube video settings page (Settings → Advanced → Embedding → Disable), and use `?enablejsapi=1&origin=https://your-staging-domain.com` to restrict embed origin.
- Set MDHE's YouTube channel to private during development so a leaked unlisted link does not expose the channel.
- Do not set canonical meta tags on `/curso/[slug]/aula/[lessonId]` pages that point to the lesson URL — this prevents indexing of lesson pages that contain video IDs.

**Warning sign:** Course lesson pages are indexed in Google Search Console with video thumbnails. Also: `robots.txt` does not disallow `/curso/`.

**Phase mapping:** Video player abstraction phase. The provider interface must encode this constraint from day one so it cannot be overlooked when switching to Bunny Stream in production.

---

## Moderate Pitfalls

---

### Pitfall 9: Slug Collision and Slug Mutation After Publication

**What goes wrong:** Two scenarios. (1) Admin creates two courses with the same slug — currently the Zod schema validates slug format but not uniqueness at form level. The `upsert-course.ts` action will get a unique-constraint error from the DB (if a unique index exists on `courses.slug`) that bubbles up as a generic error, confusing the admin. (2) Admin edits a published course and changes the slug — any student who bookmarked `/curso/old-slug/aula/lesson-id` gets a 404, including students mid-course.

**Prevention:**
- Add a DB unique index on `courses.slug` if not already present. Add a pre-submit async validation in the course form that calls a Server Action checking slug availability.
- After a course is published (has any enrolled students or any lesson progress rows), make the slug read-only in the admin form or require a confirmation modal that explains the consequence.
- If slug changes are permitted, add a `course_slug_redirects` table and a middleware rule to 301-redirect old slugs to new ones.

**Warning sign:** Admin edits course and slug field is editable without any warning. Check: is there a unique constraint on `courses.slug` in the current schema?

**Phase mapping:** Multi-course CRUD phase.

---

### Pitfall 10: Orphaned Modules and Lessons After Soft Delete

**What goes wrong:** If course deletion is implemented as a soft-delete flag (`deleted_at`) but module and lesson deletion is hard-delete (or vice versa), the data model becomes inconsistent. Students who completed a lesson from a "deleted" course still have `lesson_progress` rows referencing that lesson. The certificate issuer queries `lessons` and `modules` — if the lesson is hard-deleted but progress rows remain, progress calculation returns 0 completed / 0 total, potentially triggering false certificate eligibility (or false ineligibility).

**Prevention:**
- Choose one deletion strategy for the entire content hierarchy: hard delete with `ON DELETE CASCADE` at the DB level (already set for `course_id` on `course_certificates`), or soft delete with `deleted_at` on all tables in the hierarchy.
- Recommendation for v1: hard delete with cascade. The `ON DELETE CASCADE` is already wired in migration 0001 (`courses.id` cascades to `enrollments`, `course_certificates` cascades in 0011). Add cascade from `modules` to `lessons` and from `lessons` to `materials` and `lesson_progress`.
- Before allowing course/module/lesson deletion in the admin UI, check whether any student has progress in that scope. If yes, require explicit confirmation: "Excluir este módulo vai remover o progresso de N alunos. Confirmar?"

**Warning sign:** `lesson_progress` rows where `lesson_id` no longer exists in the `lessons` table. Check: `SELECT COUNT(*) FROM lesson_progress lp LEFT JOIN lessons l ON l.id = lp.lesson_id WHERE l.id IS NULL;`

**Phase mapping:** Multi-course CRUD phase, specifically when delete operations are added to the admin UI.

---

### Pitfall 11: Draft vs Published State Confusion Leads to Students Seeing Incomplete Courses

**What goes wrong:** If courses or lessons have a `published` boolean, an admin might mark the course as published before uploading all materials or configuring all lessons. Students who enroll immediately see an incomplete course. Alternatively, if there is no published state, every admin save is immediately visible to students (the current state — no `published` column exists in the current schema).

**Prevention:**
- Add a `published_at timestamptz` column to `courses` (nullable — null means draft). Expose this in the admin form as a toggle.
- RLS policy for student reads on `courses`: `USING (published_at IS NOT NULL OR get_my_role() = 'admin')`.
- Do not add per-lesson draft state in v1 — it adds complexity without proportional value. Lessons inherit the course's draft/published state.
- Admin preview mode: allow admins to view the course as if they were a student (without published_at needing to be set) via a `?preview=1` query param that the middleware allows for admin roles.

**Warning sign:** Students can navigate to `/curso/[slug]` for a course that is still being configured. Test: create an unpublished course and verify a student session returns 404 or a "em breve" page.

**Phase mapping:** Multi-course CRUD phase.

---

### Pitfall 12: Lesson Ordering Bugs — Position Field Drift

**What goes wrong:** The `lessons` table has a `position` column. When an admin deletes lesson 3 from a 5-lesson module, positions become `[1, 2, 4, 5]`. When a new lesson is added, it gets position 6. Eventually the ordering is inconsistent and the player shows lessons out of sequence. Worse: if the admin uses the current `create-lesson.ts` to create lessons without specifying position (position is auto-assigned), concurrent creates from two admin sessions can generate the same position number.

**Prevention:**
- Use a query-time `ORDER BY position` everywhere, never rely on insertion order.
- When deleting a lesson, re-number the remaining lessons in the same module: `UPDATE lessons SET position = position - 1 WHERE module_id = $1 AND position > $2`.
- For reordering: use a Server Action that accepts the full ordered list of lesson IDs and bulk-updates positions in a transaction.
- On concurrent inserts: use `SELECT COALESCE(MAX(position), 0) + 1 ... FOR UPDATE` in the insert transaction to prevent duplicate positions.

**Warning sign:** Lesson positions in a module are not a contiguous sequence starting at 1. Check: `SELECT module_id, array_agg(position ORDER BY position) FROM lessons GROUP BY module_id HAVING MAX(position) != COUNT(*);`

**Phase mapping:** Multi-course CRUD phase.

---

### Pitfall 13: pt-BR Locale — Certificate Date Shows UTC, Not America/Sao_Paulo

**What goes wrong:** `pdf.ts` `formatCertificateDate` uses `timeZone: "UTC"`. A student who completes a course at 23:30 BRT (02:30 UTC next day) gets a certificate dated the next day. For an official document, the date is wrong and may cause issues if the student prints it for employer verification.

**Compounding issue:** `issued_at` in `course_certificates` is stored as `timestamptz now()`, which Postgres stores in UTC. The display date in the PDF must be converted to BRT (UTC-3, or UTC-2 during Brazilian summer time). Brazilian summer time (horário de verão) has been suspended since 2020 — BRT is a fixed UTC-3 — but this should be verified.

**Prevention:**
- Change `timeZone: "UTC"` to `timeZone: "America/Sao_Paulo"` in `formatCertificateDate` in `pdf.ts`.
- Store `issued_at` in UTC (correct — do not change), but display it in the certificate PDF and in the admin dashboard using `America/Sao_Paulo` timezone.
- For CSV exports of certificate data: include both the raw ISO UTC timestamp and a formatted BRT column, with a UTF-8 BOM (`﻿`) at the start of the file so Excel does not misinterpret the encoding.

**Warning sign:** `formatCertificateDate` has `timeZone: "UTC"`. This is currently the case in `src/lib/certificates/pdf.ts` line 102 — it must be fixed before the first real certificate is issued.

**Phase mapping:** Certificate generation phase. Fix BEFORE issuing any certificates to real students.

---

### Pitfall 14: pdf-lib Helvetica Cannot Render ç, ã, õ

**What goes wrong:** `pdf.ts` uses `StandardFonts.HelveticaBold` and `StandardFonts.Helvetica`. pdf-lib's `StandardFonts` are the 14 PDF standard fonts embedded in every PDF reader. These fonts use WinAnsiEncoding (Windows-1252), which supports basic Latin with diacritics — ç (U+00E7), ã (U+00E3), õ (U+00F5), é, â, ê are all in WinAnsiEncoding. However, pdf-lib renders them only if the string is not treated as UTF-16. If the student's name contains characters outside WinAnsiEncoding (e.g., Chinese characters, Arabic, or combining diacritics from unusual input), the PDF will show replacement characters or throw an error.

**For typical Brazilian names (Fernanda, João, Conceição):** Standard WinAnsiEncoding covers these. Helvetica will work.

**Risk area:** Emojis, names with characters outside Latin-1 Extended (e.g., `Müller` is fine, but `Nguyễn` has `ễ` which is outside WinAnsiEncoding and will render incorrectly).

**Prevention:**
- For v1 with a Brazilian audience: Helvetica is acceptable. The full name on the certificate should be validated at profile creation to contain only characters in the Latin Extended-A Unicode block.
- Add a Zod refinement on `profiles.full_name` that rejects characters outside `/^[ -ÿ\s'-]+$/` (Latin-1 + common name punctuation).
- Before generating the PDF, strip or replace unsupported characters: `name.normalize('NFD').replace(/[^ -ÿ]/g, '?')` as a last-resort fallback.
- Test certificate generation with names: "João", "Conceição", "Müller", "Ângela", "Fernanda Novaes". All must render correctly with Helvetica.

**Warning sign:** PDF certificate renders name as `Jo?o` or shows blank where accented characters should be.

**Phase mapping:** Certificate generation phase, during the first PDF rendering test.

---

### Pitfall 15: B2B Gestor Sees Students From Other Institutions Via Aggregations

**What goes wrong:** A gestor's dashboard shows enrollment counts and progress per student. If the query joins `enrollments` to `users` or `profiles` without filtering by institution, and RLS only applies per-table (not to joined results), the join can leak rows from other institutions. Supabase RLS applies to the base table access, but aggregation functions and JOINs on the server (admin client, or queries using `service_role`) can bypass per-student RLS if not carefully written.

**Why it happens:** The gestor dashboard will likely be a Server Component making a query like "give me all students enrolled in courses under institution X." If the query uses the admin client (to avoid RLS denials), the `institution_id` filter must be applied in the WHERE clause — RLS does not protect the result set when using service_role.

**Prevention:**
- Gestor dashboard queries must NEVER use the admin client. Use the server client (cookie-bound JWT) and write RLS policies that restrict the gestor to their own institution's data.
- The institution scoping query on `enrollments` must always join through `institution_members` to verify the querying user is a gestor of that institution.
- Add a test: authenticate as gestor of institution A, call the dashboard API, assert no rows from institution B appear.
- For the admin client in the certificate issuer: the admin client is justified there because certificate issuance happens server-side after auth verification. Document this explicitly: "Admin client used here because certificate issuance is a server-initiated write, not a user-initiated read."

**Warning sign:** A Supabase query on `enrollments` inside the gestor dashboard that uses `createSupabaseAdminClient()`. If you see admin client usage in any UI data-fetching path for the gestor role, that is the bug.

**Phase mapping:** B2B institution scoping phase.

---

## Minor Pitfalls

---

### Pitfall 16: Manual Migration Out-of-Order Application

**What goes wrong:** The repo has no automated migration runner. Migrations must be applied manually via SQL Editor or `supabase` CLI. If migration 0013 is applied before 0012 (because the developer ran them from a sorted folder listing that reordered alphanumerically), the schema enters an inconsistent state. In Postgres, many `ALTER TABLE` and `CREATE TABLE IF NOT EXISTS` statements succeed even out of order — but constraints that reference tables created in a later migration will fail silently or throw.

**Prevention:**
- Add a comment block at the top of every migration with its dependencies: `-- Requires: 0011_courses_and_certificates.sql`.
- When the v1 migration batch is designed (~3-6 new files), include them in README.md in explicit application order with the exact command: `supabase db push` or paste order.
- Add a migration guard table: `CREATE TABLE IF NOT EXISTS _applied_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());` and INSERT a row at the top of every migration. Then verify the table's contents before applying new ones.

**Warning sign:** A migration applies without error but the expected table or column does not exist in the DB. Always verify with a SELECT after applying.

**Phase mapping:** Every phase that introduces new migrations. Highest risk during the B2B phase which will add multiple linked migrations (institutions, institution_members, enrollment_institution_fk).

---

### Pitfall 17: `SUPABASE_SERVICE_ROLE_KEY` Optional in Zod — Admin Client Fails Silently in Production

**What goes wrong:** `src/lib/env.ts` marks `SUPABASE_SERVICE_ROLE_KEY` as `.optional()`. If this variable is not set in Vercel's production environment (e.g., forgotten during deployment), `createSupabaseAdminClient()` throws at runtime, not at startup. The certificate issuer, lesson progress fallback, and institutional lead creation all use the admin client. In production, the first time any of these paths is hit, the user sees a 500 error with no explanation.

**This is already documented in CONCERNS.md** but has not been fixed.

**Prevention:**
- Change `SUPABASE_SERVICE_ROLE_KEY` to `.min(1)` (required) in `serverSchema` in `env.ts`. Add a note: "Required in all environments where admin operations are needed."
- Add startup validation: in `src/app/api/health/route.ts`, verify the service role key is set (without exposing it) by checking `getEnv().SUPABASE_SERVICE_ROLE_KEY !== undefined`.
- In Vercel: add `SUPABASE_SERVICE_ROLE_KEY` to the required environment variable checklist in the project README.

**Warning sign:** Vercel deployment succeeds but the first certificate issuance or lesson progress write returns 500. Check Vercel function logs for "SUPABASE_SERVICE_ROLE_KEY is required."

**Phase mapping:** Operational hardening phase (or fix immediately before any production traffic).

---

### Pitfall 18: Sentry Not Actually Firing in Production

**What goes wrong:** `src/lib/env.ts` makes `SENTRY_DSN` optional. If `SENTRY_DSN` is not set in Vercel's production environment, `Sentry.captureException()` is called on errors but the SDK silently drops them (no DSN configured). Critical errors — certificate issuance failures, trigger failures, lesson progress fallbacks — generate no alerts. The first indication of a problem is a user complaint.

**This is already documented in CONCERNS.md.**

**Prevention:**
- In `src/app/global-error.tsx` and any other Sentry callsite, wrap with: `if (process.env.SENTRY_DSN) { Sentry.captureException(error); }`.
- Better: add a `warnSentry(error)` wrapper in a shared module that checks initialization and falls back to `logger.error` if Sentry is not configured.
- Before going to production with real students, verify Sentry is firing by triggering a test error via the health endpoint.

**Warning sign:** Production is live but Sentry's "Issues" dashboard shows zero events after several days of user activity.

**Phase mapping:** Operational hardening phase.

---

### Pitfall 19: Bunny Stream Free Tier / Billing Surprise

**What goes wrong:** Bunny Stream charges for: storage (per GB/month), CDN delivery (per GB transferred), and optionally for video encoding (per minute encoded). If MDHE uploads 10 hours of high-quality video (e.g., 1080p), each GB of delivery costs approximately $0.005–$0.01 depending on region. For 1,000 students each watching 10 hours of video, delivery costs can reach $50–$200/month without warning — not catastrophic, but not zero.

**Prevention:**
- Profile the video library size before integration: estimated hours × bitrate × students × average rewatch rate.
- Enable Bunny's billing alerts. Set a monthly spending limit alert at 2x the expected cost.
- Store videos at 720p maximum in production (sufficient for educational content on laptop/tablet). This roughly halves delivery costs versus 1080p.
- Review which videos are marked "public" vs "private" in the Bunny panel. An accidentally public video is accessible without any signed URL — verify the pull zone settings require token authentication on every video.

**Warning sign:** Bunny dashboard shows unexpected high traffic from IP ranges that are not in Brazil. Or: a video URL works without the HMAC signature parameter (means the pull zone is not enforcing token auth).

**Phase mapping:** Bunny Stream integration phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Multi-course CRUD | Slug collision breaks navigation | Add unique index + async form validation before submit |
| Multi-course CRUD | Lesson position drift after deletes | Re-number positions on delete; test with concurrent admin sessions |
| Multi-course CRUD | Draft state leaks to students | Add `published_at` column + RLS filter before course list goes live |
| Certificate completion | UTC date on certificate | Fix `timeZone: "America/Sao_Paulo"` before first real issuance |
| Certificate completion | Post-completion lesson add breaks progress display | Decouple certificate badge from live progress % |
| Certificate completion | Idempotency if page is spammed | Already handled in `issuer.ts` — preserve the existing check unconditionally |
| B2B institutions | Gestor INSERT missing WITH CHECK | Every institution policy must have explicit WITH CHECK clause |
| B2B institutions | RLS recursion via profiles subquery | Use `get_my_role()` security-definer function; never query profiles from within a profiles policy |
| B2B institutions | Auth trigger breaks on enum addition | Apply enum ALTER TYPE migration first, verify before inviting first gestor |
| Video (Bunny Stream) | Signed URL shared across devices | Short TTL (15 min), per-request generation, no caching |
| Video (anti-piracy) | DOM watermark presented as DRM | Set expectations with client explicitly; document it as attribution tool |
| Video (YouTube dev) | YouTube ID leaks to production | Provider abstraction that throws if YouTube is used in production NODE_ENV |
| Ops | Service role key not set in Vercel | Make required in Zod schema; verify via /health endpoint |
| Ops | Sentry silent in production | Validate DSN at startup; add wrapper that falls back to logger |
| Ops | Migration applied out of order | Document explicit order in README; add guard table |

---

## Sources

- Codebase audit: `supabase/migrations/0002_roles_and_profiles.sql`, `0005_lesson_progress_rls.sql`, `0010_make_auth_profile_trigger_fail_safe.sql`, `0011_courses_and_certificates.sql`
- Implementation review: `src/lib/certificates/issuer.ts`, `src/lib/certificates/pdf.ts`, `src/app/api/lesson-progress/complete/route.ts`
- Project context: `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`
- Supabase RLS documentation: WITH CHECK vs USING behavior (HIGH confidence — official docs)
- Bunny Stream token authentication: path-based vs query-based signing, IP binding behavior (MEDIUM confidence — official docs + community reports on mobile IP issues)
- pdf-lib WinAnsiEncoding character support: Latin-1 Extended coverage (HIGH confidence — pdf-lib source + Unicode standard)
- Brazilian summer time suspension (2020): fixed UTC-3 offset (HIGH confidence — official Brazilian government decree)
- Postgres enum ADD VALUE in transactions: version-dependent behavior (MEDIUM confidence — Postgres release notes)

---

*Pitfalls audit: 2026-04-27*
