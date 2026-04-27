# Project Research Summary

**Project:** Plataforma MDHE — Gestão de Incidentes (Brownfield milestone)
**Domain:** B2C + B2B online course platform — corporate safety training (single-tenant)
**Researched:** 2026-04-27
**Confidence:** HIGH

## Executive Summary

This is a brownfield completion sprint on a Next.js 16 + Supabase platform that already has auth, middleware, a lesson player, materials, and a marketing landing page. The remaining v1 gap is a six-feature set (A through F) that must be shipped before any real student can complete a course end-to-end: multi-course admin CRUD, student progress dashboard, auto-issued certificates, video provider abstraction (YouTube dev to Bunny Stream prod), B2B institution scoping with a gestor dashboard, and Bunny Stream anti-piracy (token auth + CSS watermark). All research confirms the existing stack is correct — no new frameworks, no new runtimes, no background queue infrastructure.

The recommended build order is strictly dependency-driven: schema migrations first (institutions, then video columns), followed by two parallel streams (video abstraction and B2B institution queries), then the certificate trigger UX wired to the already-correct issuer.ts, and finally surface-level admin forms for video provider fields. Three XS additions should be bundled into the main features without separate phases: UTM capture on the institutional lead form (add to admin CRUD phase), enrollment expiry (add with the B2B schema migration), and resume-last-lesson redirect (bundle with progress dashboard). The estimated scope is five roadmap phases; all are brownfield integration work with well-understood patterns except the Bunny Player.js event integration, which warrants a short spike during Phase 4 planning.

The top operational risk before production is a cluster of three already-documented defects that must be fixed before any real student traffic: (1) the certificate date is stamped UTC instead of America/Sao_Paulo, producing wrong dates on the official document; (2) SUPABASE_SERVICE_ROLE_KEY is .optional() in Zod, causing silent 500s if not configured in Vercel; (3) Sentry DSN is optional with no fallback logger guard, making production errors invisible. These are not new features — they are pre-production hardening items that belong in the earliest feasible phase.

## Key Findings

### Recommended Stack

The base stack (Next.js 16, React 19, TypeScript strict, Supabase, Tailwind v4, Sentry, Vitest, Zod, pdf-lib) is locked. The only open decisions researched were the video provider, email delivery, and certificate generation strategy. All three are now closed. See `.planning/research/STACK.md` for full rationale and what-not-to-add list.

**New additions confirmed:**

- **Bunny Stream** — video hosting in production; token auth via SHA256(tokenKey + videoId + expires), MediaCage Basic DRM included at no extra charge, CSS overlay for per-user watermark (Bunny native watermark is static logo only — not dynamic text). Estimated cost USD 3-10/month at expected volume. Mux is 5-10x more expensive for the same feature set at this scale.
- **resend 6.12.2** — replaces Supabase default SMTP (2 emails/hour hard cap, unsuitable for B2B invite batches). Configure as custom SMTP in Supabase Auth dashboard; use SDK for custom onboarding emails beyond auth flows.
- **react-email 6.0.1** — typed pt-BR email templates as React components, pairs with Resend SDK.
- **pdf-lib (existing, no change)** — per-request certificate generation is correct at under 10k certificates/year. Generate-once-store-then-serve via course_certificates row + Supabase Storage is already the implemented pattern. No queue infrastructure needed.

**New env vars required (all serverSchema, never NEXT_PUBLIC_):** BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_TOKEN_KEY, BUNNY_STREAM_CDN_ZONE, BUNNY_STREAM_TOKEN_TTL_SECONDS (optional, default 3600), RESEND_API_KEY, EMAIL_FROM (optional with default).

### Expected Features

The A through F build order from FEATURES.md is the canonical sequence. Three additional XS items are elevated to v1 scope. See `.planning/research/FEATURES.md` for full feature specifications including anti-features (quizzes, gamification, bulk CSV invite, multi-tenant) with documented rationale for exclusion.

**Must have (table stakes):**
- **A: Multi-course admin CRUD** — course/module/lesson/material management without SQL; foundation for everything else
- **B: Student progress dashboard** — % completion per course + continuar link resuming last incomplete lesson
- **C: Auto certificate on 100%** — infrastructure ~80% built in `src/lib/certificates/`; needs trigger wiring and dashboard surface
- **E: Video provider abstraction** — `src/lib/video/` module with YouTube (dev) and Bunny (prod) adapters; precondition for production launch
- **UTM on institutional lead** — XS complexity, immediate marketing ROI; add to Feature A phase
- **Enrollment expiry** — `expires_at` on enrollments table; required for B2B contract enforcement; add to B2B schema migration
- **Resume last lesson** — 2-3 lines of redirect logic in `/curso/[slug]/page.tsx`; bundle with Feature B

**Should have (differentiators):**
- **D: Institution entity + gestor_instituicao role** — compliance reporting dashboard for school coordinators; CSV export of team progress is the highest-ROI sub-feature
- **F: Anti-piracy — Bunny token auth + CSS watermark** — client-mandated priority; 15 min TTL, no IP binding (CGNAT on Brazilian mobile), CSS overlay repositioning every 30s

**Defer to v1.1+:**
- Closed captions (design `caption_url` nullable column in v1 schema now; UI deferred)
- NPS post-certificate survey
- CSV bulk invite upload
- Certificate revocation

### Architecture Approach

The architecture is additive — new modules slot into the existing three-client (browser/server/admin), Server-Action-first, Zod-validated, RLS-enforced pattern. Two new domain modules (`src/lib/video/`, `src/lib/institutions/`) and one new route tree (`src/app/gestor/`) are the primary additions. The lesson Server Component is the insertion point for provider resolution: `getVideoProvider(lesson.video_provider).getPlayableSource(lesson, user)` runs server-side, mints Bunny tokens, and passes a serialisable PlayableSource prop to the client. The Bunny token key never reaches the browser. See `.planning/research/ARCHITECTURE.md` for full schema SQL, RLS policies, component boundary table, data flow diagram, and anti-patterns to avoid.

**Major components:**
1. **`src/lib/video/`** — VideoProvider interface, YouTubeVideoProvider, BunnyVideoProvider (server-only), factory getVideoProvider(); PlayableSource discriminated union passed as prop to client
2. **`src/components/course/watermark-overlay.tsx`** — client component; CSS pointer-events:none overlay over iframe wrapper; email text repositions every 30s
3. **`src/lib/institutions/`** — new domain module: queries.ts (gestor-scoped, uses server client not admin client), schema.ts, types.ts
4. **`src/app/gestor/[institutionSlug]/`** — new route tree guarded by role === gestor_instituicao; reads via RLS-scoped server client
5. **`middleware.ts` update** — add GESTOR_ROUTES = ["/gestor"] guard; update config.matcher
6. **Migrations 0012 + 0013** — 0012: institutions, institution_members, enrollment.institution_id, gestor_instituicao enum, SECURITY DEFINER STABLE helpers, all RLS policies; 0013: lessons.video_provider, lessons.video_external_id

### Critical Pitfalls

Top items from `.planning/research/PITFALLS.md` (see that file for all 19 pitfalls with prevention steps, warning SQL queries, and phase mappings).

1. **Certificate UTC date bug (Pitfall 13)** — `pdf.ts` uses `timeZone: "UTC"`; student completing at 23:30 BRT gets a certificate dated the next day. Fix: change to `timeZone: "America/Sao_Paulo"` in `formatCertificateDate`. Fix before the first real certificate is issued.

2. **SUPABASE_SERVICE_ROLE_KEY optional in Zod (Pitfall 17)** — already in CONCERNS.md; silently breaks certificate issuance, progress fallback, and institutional lead creation in production if not set in Vercel. Fix: change `.optional()` to `.min(1)` in serverSchema.

3. **RLS WITH CHECK missing on gestor INSERT/UPDATE policies (Pitfall 3)** — USING restricts reads; WITH CHECK restricts writes. A gestor from Escola A can insert enrollment rows for Escola B if WITH CHECK is omitted. Every institution INSERT/UPDATE policy needs an explicit WITH CHECK clause.

4. **Recursive RLS via profiles subquery (Pitfall 4)** — institution table policies that subquery profiles, whose own policy subqueries back, cause Postgres stack overflow (all authenticated requests return 500). Fix: use `get_my_role()` SECURITY DEFINER function from ARCHITECTURE.md; never query profiles from within a profiles policy.

5. **Auth trigger breaks on gestor_instituicao enum addition (Pitfall 5)** — fail-safe trigger swallows errors silently; if enum ALTER TYPE migration is not applied before the invite flow runs, gestores get auth.users rows but no profiles rows. Fix: apply enum migration first, verify with pg_enum query before inviting the first gestor.

**Additional must-fix-before-prod (operational):**
- YouTube provider must throw in `NODE_ENV === "production"` — prevents dev videos reaching prod (Pitfall 8)
- Sentry DSN — wrap captureException with fallback to logger.error when DSN is absent (Pitfall 18)
- Short Bunny token TTL (15 min max); generate per request, never cache; no IP binding due to CGNAT on Brazilian mobile (Pitfall 6)
- Certificate idempotency check in issuer.ts must never be removed; add integration test asserting second call returns already_issued for same (userId, courseId) (Pitfall 1)

## Implications for Roadmap

Suggested five-phase structure. Dependencies flow strictly downward.

### Phase 1: Foundation — Schema + Ops Hardening

**Rationale:** Everything else depends on this. Schema migrations must precede all feature work. The three pre-production defects are cheap to fix now and catastrophic to discover in production.

**Delivers:** Correct database schema for all v1 features; CONCERNS.md items resolved; Resend replacing Supabase default SMTP.

**Addresses:**
- Migration 0012: institutions, institution_members, enrollment.institution_id, gestor_instituicao enum, SECURITY DEFINER helpers, all RLS policies
- SUPABASE_SERVICE_ROLE_KEY from `.optional()` to `.min(1)` in serverSchema
- `formatCertificateDate` timezone fix to `America/Sao_Paulo`
- Sentry guard wrapper (fallback to logger.error when DSN absent)
- Resend SMTP config in Supabase Auth dashboard + RESEND_API_KEY and EMAIL_FROM added to serverSchema
- UTM fields (utm_source, utm_medium, utm_campaign) on institutional_leads schema (XS, add while touching schema)

**Avoids:** Pitfalls 1 (UTC cert date), 3 (WITH CHECK), 4 (RLS recursion), 5 (enum trigger break), 17 (service role optional), 18 (silent Sentry)

**Research flag:** Standard patterns — skip `/gsd-research-phase`. RLS policies fully specified in ARCHITECTURE.md.

---

### Phase 2: Multi-Course Admin CRUD (Feature A)

**Rationale:** First blocker to going live. All other features depend on courses and lessons existing in a well-formed catalog.

**Delivers:** Admin creates/edits/deletes courses, modules, and lessons without SQL; attaches/removes materials; sets published_at draft/publish toggle; manages lesson ordering without drift.

**Addresses:** Feature A; enrollment expiry `expires_at` column on enrollments; `published_at` on courses (Pitfall 11); slug uniqueness async validation (Pitfall 9); lesson position re-numbering on delete (Pitfall 12); cascade delete from modules to lessons to materials + lesson_progress (Pitfall 10)

**Avoids:** Pitfalls 9, 10, 11, 12, 16 (migration order)

**Research flag:** Standard patterns — skip `/gsd-research-phase`.

---

### Phase 3: Student Progress + Certificate Completion (Features B + C)

**Rationale:** Progress depends on courses existing (Phase 2). Certificate infrastructure is ~80% built; main work is trigger wiring and dashboard surface. These two features are tightly coupled and small enough to ship together.

**Delivers:** Dashboard shows % completion per course; continuar resumes last incomplete lesson; certificate auto-issues on last lesson completion; Meus certificados wired into /dashboard.

**Addresses:** Features B + C; resume last lesson (XS, bundle here); courseCompleted: boolean flag added to /api/lesson-progress/complete response; certificate badge decoupled from live progress % (post-certification lesson additions do not decrease progress display).

**Stack:** pdf-lib per-request generation remains; no queue; lazy PDF on first download click after 100%, eager eligibility flag in completion response.

**Avoids:** Pitfalls 1 (UTC date fixed in Phase 1), 2 (post-completion lesson addition decoupled from certificate badge), idempotency preserved in issuer.ts.

**Research flag:** Standard patterns — skip `/gsd-research-phase`. Certificate issuer logic fully specified in ARCHITECTURE.md section 4.

---

### Phase 4: Video Abstraction + Anti-Piracy (Features E + F)

**Rationale:** Can be developed in parallel with Phase 3. Video abstraction is a precondition for production launch. Migration 0013 (video columns on lessons) is deliberately last in this stream so the provider module can be written and tested against the existing video_url field first.

**Delivers:** `src/lib/video/` module with YouTube and Bunny adapters; LessonPlayer refactored to accept PlayableSource; CSS watermark overlay with 30s position rotation; YouTube provider throws in production; Migration 0013 applied; admin lesson form gains video_provider and video_external_id fields.

**Addresses:** Features E + F; Pitfall 6 (short TTL, no IP binding, per-request, no caching); Pitfall 7 (CSS overlay documented as attribution deterrent, not DRM; client expectation set explicitly); Pitfall 8 (YouTube throws in production); Pitfall 19 (Bunny billing alerts, max 720p for cost control).

**Stack:** BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_TOKEN_KEY, BUNNY_STREAM_CDN_ZONE added to serverSchema; no @vidstack/react or hls.js needed (Bunny iframe handles adaptive streaming internally).

**Avoids:** Minting Bunny tokens client-side; caching signed embed URLs; storing institution_id in JWT claims.

**Research flag:** MEDIUM confidence on Bunny Player.js `ended` event. Recommend a short `/gsd-research-phase` spike to confirm event name and payload for lesson-complete detection before Phase 4 implementation begins.

---

### Phase 5: B2B Institution Manager (Feature D)

**Rationale:** Depends on Phases 1 (schema), 2 (courses), 3 (progress + certificates). Migration 0012 schema is already in place from Phase 1; this phase is the TypeScript query layer, route tree, and invite email flow.

**Delivers:** Admin assigns institution when inviting users; `src/lib/institutions/queries.ts` with 4 gestor-scoped queries using server client (not admin client); `/gestor/[institutionSlug]/` route tree with progress and certificate views; middleware GESTOR_ROUTES guard; CSV export of team progress; institutional invite emails via Resend SDK.

**Addresses:** Feature D; Pitfall 15 (gestor queries use server client, never admin client — RLS enforces institution scoping).

**Avoids:** Using admin client in gestor UI queries (would bypass institution-scoping RLS and risk cross-institution data leakage).

**Research flag:** Standard patterns — skip `/gsd-research-phase`. All RLS policies, query signatures, and route structure fully specified in ARCHITECTURE.md sections 1 and 5.

---

### Phase Ordering Rationale

- **Schema first (Phase 1):** gestor_instituicao enum and institution tables must exist before any feature code references them. Enum addition must precede the first gestor invite or the auth trigger silently drops the profile row.
- **Catalog before progress (Phase 2 before Phase 3):** Progress queries join courses to modules to lessons; the catalog must be fully operable before progress can be meaningfully tested.
- **Video independent of B2B (Phase 4 alongside Phase 3):** Video abstraction has no dependency on the institution schema. These can proceed in parallel if capacity allows. Phase 4 must complete before Phase 5 ships.
- **B2B last (Phase 5):** Gestor dashboard is a read-layer over data produced by Phases 2, 3, and 4. Nothing breaks for B2C users if it ships last.

### Research Flags

**Needs `/gsd-research-phase` during planning:**
- **Phase 4 (Bunny Player.js `ended` event):** Confirm event name and payload for lesson-complete detection with Bunny iframe embed. STACK.md rates this MEDIUM confidence. Short spike prevents a broken completion trigger.

**Standard patterns — skip research phase:**
- **Phase 1:** RLS policy shapes fully specified in ARCHITECTURE.md
- **Phase 2:** Server Action + Zod schema CRUD is the dominant pattern in this codebase
- **Phase 3:** Certificate issuer logic fully specified in ARCHITECTURE.md section 4
- **Phase 5:** All query signatures and route structure specified in ARCHITECTURE.md sections 1 and 5

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Bunny pricing and token algorithm verified against official docs; Resend free tier and npm versions verified; pdf-lib adequacy well-understood at this volume |
| Features | HIGH | Build order A-F is dependency-derived, not opinion; XS additions (UTM, expiry, resume) confirmed low-risk |
| Architecture | HIGH | RLS policy shapes sourced from official Supabase docs + existing codebase patterns; SECURITY DEFINER approach is canonical for Supabase |
| Pitfalls | HIGH | UTC bug confirmed by direct code reading of pdf.ts line 102; service role key optionality confirmed by env.ts; RLS WITH CHECK behavior is official Postgres documentation |

**Overall confidence:** HIGH

### Gaps to Address

- **Bunny Player.js `ended` event (MEDIUM):** Confirm against a live Bunny embed before wiring lesson-complete trigger in Phase 4. Spike recommended during Phase 4 planning.
- **MediaCage Basic DRM iOS caveat (MEDIUM):** STACK.md notes iOS HLS playback may fail with MediaCage Basic enabled. If iOS is a significant delivery target for MDHE students, verify with Bunny support before enabling DRM in Phase 4. Can ship token auth alone without DRM if iOS compatibility is at risk.
- **Migration 0011 enrollment model:** FEATURES.md notes the explicit enrollment model with expires_at is not visible in codebase documentation. Verify whether an `enrollments` table already exists in migration 0011 before designing the column addition in Phase 2. If it does not exist, Phase 2 must create it.
- **Bunny CDN zone identifier format:** BUNNY_STREAM_CDN_ZONE env var is needed for the HLS URL in bunny-provider.ts but the exact format of the zone name is not documented in STACK.md. Confirm from the Bunny Stream dashboard before Phase 4.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — video provider decision, email provider, certificate generation strategy
- `.planning/research/FEATURES.md` — A-F build order, table stakes vs differentiators, anti-features
- `.planning/research/ARCHITECTURE.md` — institution schema SQL, RLS policies, component boundaries, data flow, build order, anti-patterns
- `.planning/research/PITFALLS.md` — 19 pitfalls with prevention strategies, warning SQL queries, phase mappings
- `src/lib/certificates/issuer.ts` (direct code reading) — idempotency behavior confirmed HIGH confidence
- `src/lib/certificates/pdf.ts:102` (direct code reading) — UTC timezone bug confirmed present
- `src/lib/env.ts` (direct code reading) — SUPABASE_SERVICE_ROLE_KEY optional confirmed present
- https://docs.bunny.net/docs/stream-embed-token-authentication
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://resend.com/pricing — 3,000 emails/month free tier verified

### Secondary (MEDIUM confidence)
- MediaCage Basic DRM iOS behavior — third-party review (daveswift.com); verify with Bunny support before enabling
- Bunny Player.js `ended` event — official Bunny blog post confirms Player.js spec support; exact event behavior on mobile/iOS not validated from a primary source

---
*Research completed: 2026-04-27*
*Ready for roadmap: yes*
