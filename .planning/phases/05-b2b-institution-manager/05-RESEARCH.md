# Phase 5: B2B Institution Manager — Research

**Researched:** 2026-05-02
**Domain:** Brownfield extension of Next.js 16 App Router + Supabase Auth/RLS for B2B admin CRUD, manager dashboard with batched per-team progress, and institution-aware Supabase Auth invite emails.
**Confidence:** HIGH (stack/patterns/RLS/code samples are all in-tree and verified) with MEDIUM on three Supabase-Auth template details flagged below.

<user_constraints>
## User Constraints (from CONTEXT.md)

> The locked decisions D-01 through D-15 are the contract this phase MUST honor. Reproducing them inline so the planner doesn't have to round-trip back to CONTEXT.md.

### Locked Decisions

**Manager role model + middleware**

- **D-01:** "Institution manager" lives in **two layers**:
  - `profiles.role = 'institution_manager'` — middleware gate for `/gestor` (mirrors admin gate for `/admin`)
  - `institution_members.role = 'manager'` — identifies WHICH institution this user manages (queries resolve `institution_id` from this row)
  - Rationale: middleware already reads `profiles.role`; reusing the pattern avoids a JOIN per request.

- **D-02:** Middleware gains a fourth ring `GESTOR_ROUTES = ["/gestor"]`; matcher includes `/gestor/:path*`. Rules:
  - Unauthenticated on `/gestor` → `/login?redirectTo=/gestor`
  - Authenticated, role not in `{institution_manager, admin}` → `/dashboard`
  - **Admin on `/gestor`** → blocked, redirect to `/admin/instituicoes` (admin uses admin route for same view)
  - **Orphan manager** (`profiles.role='institution_manager'` but zero `institution_members` rows) → `/dashboard` with flash message

- **D-03:** URL is **`/gestor` singular** (not `/gestor/[slug]`). RLS guarantees data isolation; v1 contract is one institution per gestor. **Documented deviation from ROADMAP success criterion 2** (which said `/gestor/[slug]`).

- **D-04:** `/gestor` resolves institution via `select institution_id from institution_members where profile_id = auth.uid() and role = 'manager' limit 1`. Zero rows → orphan redirect (D-02). One row → render that institution's dashboard.

**Admin UI for institutions**

- **D-05:** New section `/admin/instituicoes` mirroring `/admin/cursos`:
  - `/admin/instituicoes` (list)
  - `/admin/instituicoes/nova` (create)
  - `/admin/instituicoes/[slug]` (detail with member management)
  - "Instituições" link added to admin nav alongside "Cursos" and "Usuários"

- **D-06:** Detail-page member management has **two forms**:
  - **Adicionar aluno existente** — search-autocomplete against `profiles where role='student'`, excludes current members. Selecting → server action inserts `institution_members` row with `role='student'`.
  - **Convidar novo aluno** — full_name + email form. Calls Edge Function `Criar-usuario` with `institution_id` payload. Function does invite (with `institution_name` in metadata) THEN inserts `institution_members` row.
  - **Email-already-exists** → block with explicit error: "Email já cadastrado. Use 'Adicionar aluno existente'." NO silent auto-attach.

- **D-07:** **Per-row "Promover a gestor"** button. Click → `promoteInstitutionManagerAction(institution_id, profile_id)`:
  1. Set `profiles.role = 'institution_manager'` for new manager
  2. Set `institution_members.role = 'manager'` for new manager
  3. Auto-demote: any other `institution_members` row in same institution with `role='manager'` (other than promoted one) → back to `'student'`. If demoted user has no other `manager` rows globally, also reset their `profiles.role` to `'student'`.
  4. **Constraint v1: one institution = one gestor at a time.**
  - Inverse "Rebaixar a aluno" button does the demote (and `profiles.role='student'` if it was their only global manager role).

- **D-08:** **Attach is independent of enrollment.** Linking a student to an institution only inserts `institution_members` — does NOT create `enrollments`. Course enrollment continues via `/admin/cursos/[slug]/alunos` (existing Phase 2 flow).
  **Detach is soft:** removes `institution_members` row only; `enrollments` (with `institution_id` still pointing to the now-separated institution), progress, certificates are preserved (consistent with CERT-05). RLS revokes manager visibility immediately after detach.

**Invite flow + pt-BR template**

- **D-09:** **Use Supabase Auth template** (configured in panel), NOT Resend. Edge Function `Criar-usuario` extended to accept `institution_id`; resolves `institution_name` via admin client; passes via `data` (user_metadata) on `auth.admin.inviteUserByEmail`. Panel template uses `{{ .Data.institution_name }}` in pt-BR copy.

- **D-10:** **Template text in `docs/email-templates.md`** — admin copy/pastes into Supabase Auth panel. Doc includes:
  - pt-BR subject: "Bem-vindo(a) à plataforma MDHE — convite de {{ .Data.institution_name }}"
  - pt-BR body HTML with `{{ .ConfirmationURL }}` and `{{ .Data.institution_name }}`
  - pt-BR setup steps for the panel
  - Fallback version (no institution_name) for legacy invites from `/admin/usuarios`

- **D-11:** **Edge Function extension contract:**
  - New payload: `{ action: "invite", email, full_name, institution_id?: uuid }`
  - When `institution_id` present:
    1. Lookup `institutions.name` (404 if not found)
    2. Invite with `data: { full_name, name, institution_name }` in metadata
    3. After invite succeeds + profile row exists (trigger fail-safe + ensureProfileExists), insert `institution_members` row
    4. Return `{ ok: true, message: "Convite enviado para {email} da instituição {institution_name}" }`
  - When absent: current B2C-style behavior preserved
  - Email pre-flight: `select id from profiles where email = ?` → if exists, return 409 with bloqueante message (D-06)

**Manager dashboard data shape**

- **D-12:** Dashboard `/gestor` is a **matrix layout**:
  - Hero: institution name + member/course counts
  - Main table: rows=alunos, cols=cursos with ≥1 enrollment in institution, cells="85% — 17/20 aulas" or "—" if no enrollment
  - **Expired enrollments included, visually marked.** Manager retains historical visibility per ENR-04. **Decided: option (a) — admin client server-side with explicit `institution_id` filter** (NOT a new RLS policy). Bypass justification documented inline per PROJECT.md Concerns.
  - "Certificados emitidos" section below: aluno · curso · data emissão (America/Sao_Paulo) · código (monospace, no link, no download)

- **D-13:** **Progressive empty states:**
  - 0 alunos → "Nenhum aluno vinculado ainda. Entre em contato com a MDHE para vincular sua equipe." + MDHE contact card
  - >0 alunos, 0 enrollments → "Sua equipe ainda não tem acesso a nenhum curso. Aguarde a MDHE liberar o acesso aos cursos contratados."
  - >0 enrollments, 0 certificates → cert section: "Nenhum certificado emitido ainda."

- **D-14:** **New module `src/lib/institutions/queries.ts`** with:
  - `getInstitutionForManager(client, userId)` — resolves institution_id; null if orphan
  - `getInstitutionMembersWithProgress(adminClient, institution_id)` — per-aluno array of `{course_id, course_title, totalLessons, completedLessons, completionPercentage, enrollmentExpired: boolean}`. Reuses logic of `getAvailableCourses` BATCHED for multiple users.
  - `getInstitutionCertificates(adminClient, institution_id)` — `{aluno_name, course_title, issued_at, certificate_code}[]` ordered by `issued_at desc`
  - Zod schemas in `src/lib/institutions/schema.ts`

- **D-15:** **Verification page `/verificar/[code]` is OUT-OF-SCOPE.** Code is plain monospace text only. Capture as deferred.

### Claude's Discretion

- Componentização exata da matriz (HTML table vs CSS grid — UI-SPEC §Layout already locked HTML table)
- Estrutura interna do `institution-manager.tsx` (paralela ao `course-manager.tsx`)
- `promoteInstitutionManagerAction`: single atomic action vs split sub-actions (recommended: single)
- Schema Zod exato para input do convite institucional
- Detecção do "único gestor global" no demote: query simples vs flag — planner choice

### Deferred Ideas (OUT OF SCOPE for Phase 5)

- `/verificar/[code]` página pública de verificação de certificado (v2)
- `/gestor/[slug]` para múltiplas instituições por gestor (v2 — when multi-institution gestor surge)
- Bulk invite via CSV (B2B-V2-01)
- Gestor convidando funcionários sozinho (B2B-V2-02)
- Relatório PDF/Excel exportável (B2B-V2-03)
- Auto-template-drift test entre `docs/email-templates.md` e painel Supabase
- Resend SDK (continua deferred — EMAIL-01/02)
- Toggle "Mostrar expirados" no dashboard (sempre mostra greyed)
- Manager pode ver certificate PDF preview
- Notificação ao gestor quando aluno conclui curso

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INST-05 | `middleware.ts` gains `GESTOR_ROUTES = ["/gestor"]`; matcher includes `/gestor/:path*`; users without role `institution_manager` or `admin` are redirected | Pattern documented in §Architecture Patterns "Pattern 1: Middleware ring extension"; orphan-manager edge case in §Common Pitfalls #1 |
| INST-06 | Gestor logs into `/gestor` and sees only alunos/enrollments of their own institution (validated by RLS, not just app filter) | RLS policies "Institution managers read institution enrollments" + "Members read own membership" already shipped (0013 lines 142–150, 259–263); §Architecture Patterns "Pattern 3: Server-side admin bypass with explicit filter" covers the expired-enrollment carve-out |
| INST-07 | Manager dashboard shows: linked students, % progress per course, certificates with metadata (no direct download) | Reuse pattern in §Code Examples "Batched per-team progress query"; cert query mirrors `getUserCertificatesByCourseId` (queries.ts:475) |
| INST-08 | Admin creates institution, links students 1-by-1, assigns one as manager | Pattern in §Architecture Patterns "Pattern 2: Admin CRUD scaffold mirroring /admin/cursos"; promote action in §Code Examples "Atomic promote-with-auto-demote" |
| EMAIL-03 | Institutional invite ships pt-BR template (subject + body) mentioning the contracting institution | §Architecture Patterns "Pattern 4: Supabase Auth template + user_metadata"; §Code Examples "Edge Function institution-aware invite"; D-09/D-10/D-11 lock the path |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

These are repo-level directives the planner MUST verify compliance against:

| Constraint | Source | Verification |
|-----------|--------|-------------|
| Lint policy zero-warning (`--max-warnings=0`) | CLAUDE.md §Conventions | `npm run lint` must stay green; any new warning fails CI |
| All input validated via Zod in `src/lib/**/schema.ts` (NEVER inline) | CLAUDE.md §Conventions | Institution schemas live in `src/lib/institutions/schema.ts` (D-14); reuse from server actions |
| Typed Supabase clients with `<Database>` generic everywhere | CLAUDE.md §Conventions | All new query helpers must accept `SupabaseClient<Database>`; mirror pattern from `src/lib/courses/queries.ts:22-23` |
| pt-BR for all UI/copy | CLAUDE.md §Conventions | UI-SPEC.md already locks every string; planner enforces |
| Server Actions preferred over API routes for mutations | CLAUDE.md §Architecture | Phase 5 actions in `src/app/actions/`; only Edge Function `Criar-usuario` is HTTP-callable (already established for invites) |
| Migrations must be additive, sequentially numbered | CLAUDE.md §Database | Phase 5 is **app-layer only** — no new migrations. If discoveries reveal a need (e.g., need to add `institution_id` to existing enrollments backfill), it goes in `0014_*.sql`, not edits to 0013. README.md migration list updated, `database.types.ts` regenerated. |
| Vitest `environment: "node"` (no jsdom) | CLAUDE.md §Testing | All Phase 5 tests target server logic / pure functions / queries with mocked Supabase clients (mirror `src/app/actions/grant-enrollment.test.ts`) |
| Server-only secrets only via `getEnv()` | CLAUDE.md §Env validation | Edge Function reads via `Deno.env.get`; Next.js side via `getEnv()` |
| RLS bypass via admin client must be **documented** with reason | PROJECT.md §Concerns | Manager dashboard query (D-12) bypasses RLS to include expired enrollments — every `createSupabaseAdminClient()` call site in Phase 5 needs a comment explaining why bypass is necessary |

## Summary

Phase 5 is a **brownfield extension on already-shipped schema** (Phase 1 migrations 0012/0013 already created `institutions`, `institution_members`, `enrollments.institution_id`, `is_member_of_institution()` SECURITY DEFINER STABLE helper, the `institution_manager` enum value, and the 11 RLS policies including "Institution managers read institution enrollments"). The work is entirely in Next.js App Router + Supabase Edge Functions and consists of: (1) one new admin CRUD section mirroring `/admin/cursos`, (2) one new manager dashboard route with a batched per-team progress matrix, (3) extending one Edge Function to pass institution metadata into the Supabase Auth invite, (4) extending `middleware.ts` with a fourth role-ring, and (5) a single pt-BR docs file with the email template body for manual copy/paste into the Supabase panel.

The two non-trivial technical risks are: (a) the **batched per-student per-course progress query** must avoid N+1 by using `in()` filters on user_ids and lesson_ids, mirroring the `getAvailableCourses` reduce pattern but iterating over an outer student dimension; and (b) the **promote-with-auto-demote** action must be atomic across `profiles.role` + `institution_members.role` updates for both the new and prior manager — recommended approach is a single PostgreSQL RPC function (`SECURITY DEFINER`, called via Supabase RPC client) so the whole operation runs in one transaction with automatic rollback on failure. Hand-rolling sequential admin-client calls works but introduces partial-failure states that are hard to detect from the UI.

Three Supabase-Auth template details are MEDIUM-confidence (panel UX, not code) and should be smoke-tested by the executor before /gsd-verify-work: (i) the `{{ .Data.institution_name }}` variable resolves correctly when the field is passed through `inviteUserByEmail({ data: { institution_name: "..." } })`, (ii) the `if/else` Go-template syntax for the fallback no-institution branch behaves as docs claim, and (iii) the panel does NOT auto-rewrite the template when other Supabase Auth settings are saved.

**Primary recommendation:** Build promote/demote as a single Postgres RPC `promote_institution_manager(p_institution_id uuid, p_new_manager_profile_id uuid) returns void` that runs the full sequence under one transaction. Implement everything else as Server Actions following the established `requireAdminUser → admin client → revalidatePath` pattern from `grant-enrollment.ts`. Mock Supabase clients in Vitest tests using the chain pattern already proven in `grant-enrollment.test.ts`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route gating (`/gestor`, `/admin/instituicoes`) | Frontend Server (Next.js middleware) | API/Backend (RLS) | Same pattern as existing 3 rings — gate at edge to avoid render thrash; RLS is the truth source |
| Admin CRUD (institutions list/create/detail) | Frontend Server (RSC + Server Actions) | Database (RLS via admin client where needed) | RSC reads via Supabase server client; mutations via Server Actions per CLAUDE.md |
| Member management (attach/detach/promote/demote) | Frontend Server (Server Actions) | Database (RPC for promote atomicity) | Atomic multi-row updates → Postgres RPC; single-row attaches → Server Action with admin client |
| Per-team progress query | Frontend Server (RSC fetching from `src/lib/institutions/queries.ts`) | Database (PostgreSQL with admin-client bypass) | Server-side only — admin client bypass justified to include expired enrollments (D-12) |
| Search autocomplete (member add) | Frontend Server (Server Action with debounced input) | API/Backend (RLS-respecting queries) | Server Action receives query string, returns filtered profiles. Avoids exposing admin client to client; mirrors Next.js learn pattern |
| Institutional invite | API/Backend (Supabase Edge Function `Criar-usuario`) | Auth (Supabase Auth `inviteUserByEmail`) | HTTP-callable (per CLAUDE.md exception list); already established function |
| Email template rendering | External (Supabase Auth runtime) | None | Go-template processed by Supabase Auth, fed by `user_metadata` from invite |
| Manager dashboard rendering | Frontend Server (RSC + Suspense) | Browser/Client (`useTransition` for action buttons) | Pure RSC for matrix; client only for buttons that mutate |

## Standard Stack

### Core (already in repo, reuse)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.x (App Router) | Framework | Already established (CLAUDE.md) `[VERIFIED: package.json + scripts in CLAUDE.md]` |
| `react` | 19.x | UI runtime | Already established `[VERIFIED: CLAUDE.md]` |
| `@supabase/ssr` | (current) | Server-side cookie-bound Supabase client | Used by `middleware.ts` and `src/lib/supabase/server.ts` `[VERIFIED: in-tree imports]` |
| `@supabase/supabase-js` | 2.x | Admin/service-role client + auth.admin API | Used by `src/lib/supabase/admin.ts` and `Criar-usuario` Edge Function `[VERIFIED: in-tree imports]` |
| `zod` | (current) | All input/payload validation | CLAUDE.md mandates Zod for all validation `[VERIFIED: CLAUDE.md §Conventions]` |
| `lucide-react` | (current) | Icons | Already in deps; UI-SPEC §Design System lists exact icons to use `[VERIFIED: UI-SPEC.md]` |
| `vitest` | (current) | Testing framework | `environment: "node"`; mocked Supabase clients pattern `[VERIFIED: vitest.config.ts:12]` |
| `@sentry/nextjs` | (current) | Error capture in actions | `captureException` already used in `grant-enrollment.ts` `[VERIFIED: src/app/actions/grant-enrollment.ts:80]` |

### Supporting (already in repo, reuse)

| Library / Module | Path | Purpose | When to Use |
|------------------|------|---------|-------------|
| `slugify(text)` | `src/lib/courses/slugify.ts` | NFKD-strip-and-lowercase pt-BR slug | Auto-fill `slug` field from `name` in NewInstitutionForm `[VERIFIED: src/lib/courses/slugify.ts]` |
| `Breadcrumb` | `src/components/admin/breadcrumb.tsx` | Admin breadcrumb nav | All `/admin/instituicoes/*` pages `[VERIFIED]` |
| `ConfirmationDialog` | `src/components/admin/confirmation-dialog.tsx` | Modal confirm with focus trap, Tab/Escape handling | Promote-with-auto-demote, demote, detach `[VERIFIED]` |
| `LogoutButton` | `src/components/auth/logout-button.tsx` | Header logout | Both `/admin/instituicoes/*` and `/gestor` headers |
| `StatusBadge` shape | `src/components/admin/status-badge.tsx` | Pill badge pattern | Reference for new `MemberRoleBadge` (UI-SPEC §Components) `[VERIFIED]` |
| `fetchUserRole(client, userId)` | `src/lib/auth/roles.ts` | Read profiles.role | Middleware role gate; admin gate in Server Actions `[VERIFIED]` |
| `requireAdminUser()` pattern | `src/app/actions/grant-enrollment.ts:14-43` | Reusable auth+role gate for actions | Copy-paste skeleton into every Phase 5 server action `[VERIFIED]` |
| `callAdminUserFunction()` | `src/lib/admin/call-admin-user-function.ts` | Browser→Edge-Function invoker with bearer token + apikey | Extend payload type to accept `institution_id` `[VERIFIED]` |
| `ensureProfileExists(userId)` | `src/lib/auth/profiles.ts` | Auth-trigger fail-safe guardrail | Edge Function should call after invite + before inserting `institution_members` to ensure profile row exists `[VERIFIED: imported in src/app/dashboard/page.tsx:7]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Admin client + explicit institution filter (D-12 chosen) | Add new RLS policy "Institution managers read expired enrollments in their institution" | RLS policy = no bypass needed, but adds surface area to RLS audit and the policy duplicates is_member_of_institution() check. CONTEXT D-12 chose admin-client bypass for simplicity + documented justification. `[CITED: CONTEXT.md D-12]` |
| Postgres RPC for atomic promote/demote (recommended) | Sequential admin-client `update().eq()` calls in Server Action | Sequential calls leave partial state on failure (e.g., new manager promoted but old one not demoted). RPC wraps in single transaction with automatic rollback. `[CITED: marmelab.com 2025/12, dev.to/voboda]` |
| `useTransition` + inline status banner (UI-SPEC chosen) | `sonner` toast library | Adding a toast lib is a new dependency; UI-SPEC §Components rules it out for v1. Banner pattern proven in `user-manager.tsx`. `[CITED: UI-SPEC.md §Toast strategy]` |
| Server-action search (Next.js learn pattern) | Direct browser-side Supabase query | Browser query needs RLS policy permitting students to read other profiles (security exposure). Server action keeps admin client server-side. `[CITED: nextjs.org/learn/dashboard-app/adding-search-and-pagination]` |

**Installation:** No new packages required. Phase 5 is implemented entirely with existing dependencies.

**Version verification:** No package additions. The planner should NOT run `npm install` for new deps. Existing versions are already validated in CI per CLAUDE.md.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │           Browser (admin or gestor)             │
                    └────────┬────────────────────────────┬───────────┘
                             │                            │
                  POST /actions/*                  GET /gestor or /admin
                  (Server Actions)                (RSC routes)
                             │                            │
                             ▼                            ▼
                    ┌──────────────────────────────────────────────┐
                    │  middleware.ts (4 rings + matcher)           │
                    │  ┌────────┐ ┌─────┐ ┌──────┐ ┌────────────┐  │
                    │  │protected│ │admin│ │gestor│ │auth (logout)│ │
                    │  └────────┘ └─────┘ └──────┘ └────────────┘  │
                    │  Reads profiles.role via fetchUserRole()     │
                    └────────┬─────────────────────────────┬───────┘
                             │                             │
                ┌────────────┴───────────────┐ ┌──────────┴───────────┐
                │ Next.js RSC + Server Actions│ │ Supabase Edge Func   │
                │ src/app/admin/instituicoes/ │ │ Criar-usuario (Deno) │
                │ src/app/gestor/             │ │ - admin gate         │
                │ src/app/actions/*           │ │ - email pre-flight   │
                │ src/lib/institutions/       │ │ - inviteUserByEmail  │
                │   - queries.ts              │ │   with metadata      │
                │   - schema.ts               │ │ - insert membership  │
                └─────┬───────────────────┬───┘ └──────────┬───────────┘
                      │                   │                │
       Server client  │       Admin client│                │ Admin client
       (RLS-respect)  │      (RLS-bypass) │                │ (service role)
                      │                   │                │
                      ▼                   ▼                ▼
                    ┌──────────────────────────────────────────────┐
                    │            PostgreSQL (Supabase)             │
                    │  Tables: institutions, institution_members,  │
                    │          enrollments, profiles, courses,     │
                    │          lessons, lesson_progress,           │
                    │          course_certificates                 │
                    │  Helper:  is_member_of_institution(uuid)     │
                    │           SECURITY DEFINER STABLE            │
                    │  RLS:     11 policies from migration 0013    │
                    │  RPC (NEW): promote_institution_manager(...)│
                    └────────────────────────┬─────────────────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ Supabase Auth runtime│
                                  │ - inviteUserByEmail  │
                                  │ - email template     │
                                  │   (Go template)      │
                                  │ - {{ .Data.* }}      │
                                  └──────────┬───────────┘
                                             │
                                             ▼
                                     SMTP (default Supabase
                                     in dev; Resend in v2 — deferred)
                                             │
                                             ▼
                                       Convidado (email)
```

Data flow for the two critical paths:

**Path A: Admin invites new student to institution**
1. Browser submits InstitutionManager form → `callAdminUserFunction({ action: "invite", email, full_name, institution_id })`
2. `Criar-usuario` Edge Function: validates admin → email pre-flight (block if exists) → lookup `institutions.name` (404 if missing) → `inviteUserByEmail(email, { data: { full_name, name, institution_name }, redirectTo })` → on success, ensure profile exists (await invite settle + ensureProfileExists or wait for trigger) → insert `institution_members` row → return success
3. Supabase Auth renders panel template, substituting `{{ .Data.institution_name }}` and `{{ .ConfirmationURL }}` → SMTP delivery
4. Browser updates list via revalidatePath in calling Server Action

**Path B: Manager loads /gestor**
1. Browser navigates to `/gestor` → middleware checks `profiles.role ∈ {institution_manager, admin}` → admin redirected to `/admin/instituicoes`; orphan manager redirected to `/dashboard` with flash
2. RSC `/gestor/page.tsx`: `getInstitutionForManager(serverClient, user.id)` resolves institution_id (RLS-respecting via "Members read own membership" policy)
3. Suspense-wrapped: `getInstitutionMembersWithProgress(adminClient, institution_id)` runs **3 batched queries**: (a) `institution_members JOIN profiles` for student names, (b) `enrollments WHERE institution_id = ? AND user_id IN (...)` for matrix data INCLUDING expired, (c) `lesson_progress WHERE user_id IN (...) AND lesson_id IN (...)` for progress percentages
4. Outside Suspense: `getInstitutionCertificates(adminClient, institution_id)` returns ordered cert list
5. Render hero card + matrix + certs section

### Recommended Project Structure

```
src/app/admin/instituicoes/
├── page.tsx                          # RSC list (mirrors src/app/admin/cursos/page.tsx)
├── nova/
│   └── page.tsx                      # RSC + <NewInstitutionForm /> client component
├── new-institution-form.tsx          # Client form with slugify auto-fill (mirrors new-course-form.tsx)
├── [slug]/
│   └── page.tsx                      # RSC detail (loads members + available-students list)
├── institution-manager.tsx           # Client: holds tabs (add-existing | invite) + member list
├── promote-manager-button.tsx        # Client: useTransition + ConfirmationDialog
└── detach-member-button.tsx          # Client: useTransition + ConfirmationDialog

src/app/gestor/
├── layout.tsx                        # Manager-tone header (no admin nav)
├── page.tsx                          # RSC: hero + Suspense<ProgressMatrix> + InstitutionCertificatesTable
├── progress-matrix.tsx               # RSC: receives pre-batched data; renders sticky-first-col table
└── institution-certificates-table.tsx# RSC: stripped MyCertificates analog

src/lib/institutions/
├── queries.ts                        # All 3 D-14 functions
├── schema.ts                         # Zod: createInstitutionSchema, attachMemberSchema, inviteMemberSchema
├── types.ts                          # InstitutionWithStats, InstitutionMemberWithProfile, MatrixCell, etc.
└── queries.test.ts                   # Vitest with mocked Supabase clients (mirror grant-enrollment.test.ts)

src/app/actions/
├── upsert-institution.ts             # createInstitutionAction, updateInstitutionAction
├── upsert-institution-state.ts       # FormState shape
├── upsert-institution.test.ts        # Vitest for the actions
├── attach-institution-member.ts      # attachMemberAction (existing-student path)
├── attach-institution-member.test.ts
├── promote-institution-manager.ts    # Calls Postgres RPC (recommended)
├── promote-institution-manager.test.ts
├── detach-institution-member.ts      # Soft detach
├── detach-institution-member.test.ts
└── search-students-for-institution.ts# Server-side search action for autocomplete

src/components/admin/
└── member-role-badge.tsx             # Pill badge (manager=emerald+Crown, student=slate)

src/components/marketing/
└── mdhe-contact-card.tsx             # Reusable for /gestor empty state

supabase/migrations/
└── 0014_promote_institution_manager_rpc.sql  # SECURITY DEFINER RPC for atomic promote/demote
                                                # NOTE: only added if planner adopts RPC recommendation;
                                                # otherwise no migration in Phase 5 (matches D's "app-layer only").

supabase/functions/Criar-usuario/
└── index.ts                          # Extended with institution_id branch (D-11)

src/lib/admin/
└── call-admin-user-function.ts       # Payload type extended to include institution_id?: string

middleware.ts                          # Add GESTOR_ROUTES + matcher

docs/
└── email-templates.md                # NEW: pt-BR Supabase Auth templates (D-10)

src/app/dashboard/
└── page.tsx                          # Add "Gerenciar instituições" link in admin nav block (UI-SPEC §Layout)
```

### Pattern 1: Middleware ring extension (INST-05)

**What:** Add a fourth role-gated route ring `GESTOR_ROUTES` to `middleware.ts` so `/gestor` is gated for `institution_manager` (and admin, who is redirected away).

**When to use:** Whenever a phase introduces a new role-protected URL family. Pattern is already established 3 times.

**Example:**
```typescript
// middleware.ts — ADDITIONS only; existing 3 rings preserved verbatim
const PROTECTED_ROUTES = ["/dashboard", "/curso", "/admin", "/gestor"];
const ADMIN_ROUTES = ["/admin", "/dashboard/aulas"];
const GESTOR_ROUTES = ["/gestor"];
const AUTH_ROUTES = ["/login"];

function isGestorPath(path: string) {
  return GESTOR_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

// inside middleware(), AFTER the existing isAdminPath check:
if (user && isGestorPath(path)) {
  const role = await fetchUserRole(supabase, user.id);
  if (role === "admin") {
    // Admin doesn't use /gestor — redirect to admin equivalent
    return NextResponse.redirect(new URL("/admin/instituicoes", request.url));
  }
  if (role !== "institution_manager") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  // Note: orphan-manager check (zero institution_members rows) is HANDLED IN /gestor/page.tsx
  // not in middleware — see Pitfall 2
}

export const config = {
  matcher: ["/dashboard/:path*", "/curso/:path*", "/admin/:path*", "/gestor/:path*", "/login"],
};
```

**Critical:** the matcher MUST include `/gestor/:path*` or the middleware never runs for those URLs. This is documented in CLAUDE.md §Auth & route protection. `[VERIFIED: middleware.ts:83]`

### Pattern 2: Admin CRUD scaffold mirroring /admin/cursos (INST-08)

**What:** Three-page admin section (list / create / detail) following the exact frame of `/admin/cursos`.

**When to use:** Any admin CRUD area in this codebase.

**Example structure (from `/admin/cursos/page.tsx:64-156`):**
```typescript
export default async function AdminInstituicoesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/admin/instituicoes`);
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") redirect("/dashboard");

  const institutions = await getAdminInstitutionList(supabase);
  // Render frame: header > main(max-w-6xl) > eyebrow + h1 > CTA + table-rows
}
```

**Note:** The middleware ALREADY gates `/admin/*`, so the in-page redirect is a defense-in-depth duplicate (preserves session-expiry edge case where middleware sees stale cookie). This pattern is repeated in every existing admin page; follow it. `[VERIFIED: src/app/admin/cursos/page.tsx:36-45]`

### Pattern 3: Server-side admin-bypass query with explicit filter (D-12)

**What:** When a query needs to return rows that an authenticated user cannot read via RLS (e.g., expired enrollments for the manager dashboard), use the admin client server-side with an EXPLICIT filter that re-implements the RLS authorization.

**When to use:** Manager dashboard's `getInstitutionMembersWithProgress` (returns expired enrollments for ENR-04 visibility per D-12).

**Example:**
```typescript
// src/lib/institutions/queries.ts
export async function getInstitutionMembersWithProgress(
  adminClient: SupabaseClient<Database>,
  institutionId: string,
): Promise<InstitutionMemberWithProgress[]> {
  // BYPASS JUSTIFICATION (per CLAUDE.md and PROJECT.md Concerns):
  // The "Students read own enrollments" RLS policy filters expires_at IS NULL OR > now().
  // The manager dashboard MUST display expired enrollments per ENR-04 + D-12 (visibility
  // is preserved as historical record). Rather than adding a new RLS policy that grants
  // managers a broader read on enrollments, we use the admin client server-side and
  // explicitly filter by institution_id (which is the intended scope). The admin client
  // is server-only and the explicit filter mirrors the RLS authorization scope.

  // Step 1: members + profile names
  const { data: members } = await adminClient
    .from("institution_members")
    .select("profile_id, role, profiles:profile_id (full_name)")
    .eq("institution_id", institutionId);

  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.profile_id);

  // Step 2: enrollments INCLUDING expired
  const { data: enrollments } = await adminClient
    .from("enrollments")
    .select("user_id, course_id, expires_at, courses:course_id (id, title, slug)")
    .eq("institution_id", institutionId)
    .in("user_id", userIds);

  // Step 3: lesson + lesson_progress for each course in scope
  // ... (see §Code Examples for the full batched implementation)
}
```

`[CITED: CONTEXT.md D-12; PROJECT.md Concerns]`

### Pattern 4: Supabase Auth template + user_metadata (EMAIL-03)

**What:** Pass institution name in the `data` field of `inviteUserByEmail` options; reference it in the panel template via `{{ .Data.institution_name }}`.

**When to use:** Phase 5 institutional invite path (D-09).

**Example (Edge Function):**
```typescript
// supabase/functions/Criar-usuario/index.ts (extension)
const { data: institution, error: instErr } = await supabaseAdmin
  .from("institutions")
  .select("id, name")
  .eq("id", institutionId)
  .maybeSingle();

if (instErr || !institution) {
  return jsonResponse({ ok: false, message: "Instituição não encontrada." }, 404);
}

const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  data: {
    full_name: fullName,
    name: fullName,
    institution_name: institution.name,  // <-- key new metadata field
  },
  redirectTo,
});
```

**Example (template — for `docs/email-templates.md`):**
```html
<!-- Subject: Bem-vindo(a) à plataforma MDHE — convite de {{ .Data.institution_name }} -->

<h2>Olá!</h2>

{{ if .Data.institution_name }}
<p>
  Você foi convidado pela <strong>MDHE Consultoria</strong> para acessar a plataforma de cursos
  como aluno(a) da <strong>{{ .Data.institution_name }}</strong>.
</p>
{{ else }}
<p>
  Você foi convidado pela <strong>MDHE Consultoria</strong> para acessar a plataforma de cursos.
</p>
{{ end }}

<p>Clique no link abaixo para definir sua senha e começar:</p>

<p>
  <a href="{{ .ConfirmationURL }}">Aceitar convite e criar minha senha</a>
</p>

<p style="font-size:12px;color:#64748b">
  Este link expira em algumas horas. Se não foi você que solicitou o convite, pode ignorar este email.
</p>
```

**Sources for the JS SDK signature:**
- The `data` parameter is documented for the Swift, Kotlin, and Dart SDKs (which mirror the JS SDK shape) `[CITED: supabase.com/docs/reference/swift/auth-admin-inviteuserbyemail, supabase.com/docs/reference/kotlin/auth-admin-inviteuserbyemail]`
- The current in-tree Edge Function ALREADY uses `data: { full_name, name }` successfully — so the JS SDK supports it `[VERIFIED: supabase/functions/Criar-usuario/index.ts:354-356]`
- Template variables `{{ .Data.field }}` and `{{ if eq .Data.field "..." }}` syntax confirmed `[CITED: supabase.com/docs/guides/auth/auth-email-templates]`

### Anti-Patterns to Avoid

- **Hand-rolling sequential admin-client calls for promote+demote.** If the new-manager update succeeds and the prior-manager demotion fails, the system is in an inconsistent state ("two managers in one institution"). Use a Postgres RPC instead so PostgREST wraps the entire procedure in one transaction with automatic rollback on any failure. `[CITED: dev.to/voboda — gotcha-supabase-postgrest-rpc-with-transactions]`

- **Querying institution_members in middleware to detect orphan managers.** Middleware runs on EVERY request — adding a second DB roundtrip for the orphan check inflates latency for every page in the app. Move the orphan check INTO `/gestor/page.tsx` (one extra query but only on `/gestor` routes). `[VERIFIED: D-04 + middleware perf considerations]`

- **Using direct browser-side Supabase client for member-search autocomplete.** Browser-side queries would force a permissive RLS policy on `profiles` that lets anyone read other students' names/emails — security exposure. Use a Server Action that runs on the server with the appropriate client (admin OR an RLS policy that limits the query to admin users). `[CITED: nextjs.org/learn/dashboard-app/adding-search-and-pagination — fetch on server]`

- **Reading `process.env` directly in Phase 5 code.** CLAUDE.md §Env validation: server vars only via `getEnv()`. Edge Function reads `Deno.env.get(...)` (already established pattern in current `Criar-usuario`). `[VERIFIED: CLAUDE.md]`

- **Adding the orphan-manager flash message via cookies.** Use Next.js search params (`/dashboard?notice=orphan-manager`) and surface in the `/dashboard` page; cookies introduce SSR/CSR drift on App Router. The dashboard page conditionally renders the banner based on the `notice` param.

- **Creating new RLS policies in Phase 5.** CONTEXT D-12 explicitly chose admin-client bypass over new RLS policy. Phase 5 ONLY consumes the existing RLS policies from migration 0013. The optional `0014_*.sql` for the promote RPC is the ONLY DB change.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| pt-BR slug normalization | Custom NFKD-strip logic | `slugify()` from `src/lib/courses/slugify.ts` | Already handles ã/ç/õ correctly; tested in `slugify.test.ts` |
| Admin auth gate in Server Actions | Inline `getUser()` + `fetchUserRole()` checks | Copy `requireAdminUser()` skeleton from `grant-enrollment.ts:14-43` | Pattern is proven, returns consistent error message shape |
| Atomic multi-row updates from Server Actions | Sequential admin-client calls | Postgres RPC with SECURITY DEFINER | PostgREST wraps RPCs in transactions automatically; no partial state on failure `[CITED: dev.to/voboda]` |
| Modal confirmation dialogs | Custom modal w/ ARIA | `ConfirmationDialog` from `src/components/admin/confirmation-dialog.tsx` | Already implements alertdialog role, focus trap, Tab/Escape, focus-on-cancel safety |
| Form-state shape | Custom state interfaces | Mirror `EnrollmentFormState` from `grant-enrollment-state.ts` | Existing `useActionState` consumers expect `{ success, message, fieldErrors }` shape |
| Toast/notification system | Add `sonner` or `react-hot-toast` | Inline status banner (`role="status" aria-live="polite"`) | UI-SPEC §Toast strategy explicitly rules out new dep for v1; banner pattern proven in `user-manager.tsx` |
| Email template rendering | Custom email HTML generation | Supabase Auth panel template with `{{ .Data.institution_name }}` | Built-in Go template engine; D-09 locked decision; no Resend dep needed |
| Per-user progress calculation | Per-student loop with N queries | Batched `in()` query on lesson_ids + reduce per user | Mirror `getAvailableCourses` pattern; see §Code Examples |
| RLS bypass for expired enrollments | New RLS policy that grants managers expanded read | Admin client server-side with explicit `institution_id` filter | D-12 chose this; new RLS policy = larger audit surface |

**Key insight:** Phase 5 has zero net-new infrastructure needs. Every problem already has a proven in-tree pattern. The only "novel" work is composing them and adding the RPC for atomic promote/demote.

## Runtime State Inventory

> Phase 5 is **brownfield extension** but **not** a rename/refactor. This inventory still applies because the phase introduces new state (institutions/members rows, user_metadata fields, role flips on profiles) that interacts with already-shipped data.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | (1) `institutions` table — currently empty (no rows). (2) `institution_members` table — currently empty. (3) `enrollments.institution_id` — backfill from migration 0013 only seeded admin enrollments with `institution_id=null`. **No existing user has `institution_id` set on their enrollments.** (4) `profiles.role` — only `admin` and `student` values present in production today (verified by `0013` backfill scope which only inserted for admins; `institution_manager` value exists in enum but no rows). | None — these are populated by Phase 5 actions; Phase 5 is the first writer. **Caveat:** when admin attaches an existing student via D-06 path, the existing `enrollments` rows for that student will NOT auto-acquire `institution_id` (that field is set only on B2B-grant flow). Document this in detach UX so admin understands the manager won't see those B2C enrollments unless explicitly re-granted via institution context. |
| **Live service config** | (1) Supabase Auth Email Templates panel — currently uses default English templates (per docs/DEPLOY-CHECKLIST.md context). (2) SMTP config — currently default Supabase SMTP (EMAIL-01/02 deferred). | **Manual step:** admin copies pt-BR template from `docs/email-templates.md` (NEW) into Supabase Auth panel → Authentication → Email Templates → Invite User. **NOT version-controlled** — drift risk acknowledged in §Common Pitfalls #4. Add to docs/DEPLOY-CHECKLIST.md as a one-time setup step. |
| **OS-registered state** | None — Next.js runtime + Supabase managed; no Windows/Linux service registrations. | None |
| **Secrets/env vars** | (1) `SUPABASE_SERVICE_ROLE_KEY` — already required (OPS-01 complete). (2) `APP_URL` / `NEXT_PUBLIC_APP_URL` — already used by Edge Function for `redirectTo` construction. | None — no new secrets introduced. |
| **Build artifacts / installed packages** | None — no new npm deps. Existing `database.types.ts` already has `institutions`, `institution_members`, and `institution_id` on enrollments (verified line 446-509, line 313). | If planner adopts the optional `0014_*.sql` RPC, **regenerate `src/lib/database.types.ts`** to surface the RPC under `Database["public"]["Functions"]` (it's currently empty per line 632-634). Manual hand-edit acceptable per CLAUDE.md §Database. |

**Nothing found in OS-registered state:** Verified — Next.js + Supabase architecture has no OS-level registrations.

## Common Pitfalls

### Pitfall 1: Orphan-manager dead-end loop

**What goes wrong:** A user has `profiles.role='institution_manager'` but zero `institution_members` rows (e.g., admin promoted them then deleted the institution; or admin manually flipped the role in DB). Without orphan handling, they hit `/gestor`, the page tries to query their institution_id, gets null, and either crashes or renders an empty broken UI.

**Why it happens:** Promote/demote actions are not perfectly bidirectional with institution lifecycle (Phase 5 doesn't implement institution-delete cascade because institutions table allows deletion but `on delete cascade` for institution_members → so deleting an institution leaves orphan profiles.role unless the cascade also resets profiles.role, which it doesn't).

**How to avoid:**
1. `/gestor/page.tsx`: when `getInstitutionForManager()` returns null, use `redirect("/dashboard?notice=orphan-manager")` and surface the flash message in `/dashboard` (as per UI-SPEC §Error states).
2. Document in CONTEXT (already done in D-02) and add a Vitest test for `/gestor` redirect behavior with mocked null institution.
3. **Don't** put the orphan check in middleware — middleware runs every request; checking institution_members on every nav inflates latency. Page-level check is correct.

**Warning signs:** Errors in Sentry tagged with `/gestor` route + null institution_id; or admin reports "the gestor I just promoted got bounced".

### Pitfall 2: Email template drift between repo doc and Supabase panel

**What goes wrong:** `docs/email-templates.md` is updated (e.g., copy fix, new variable), but admin forgets to re-paste into Supabase Auth panel. Production sends old template. Or vice-versa: admin tweaks template in panel, repo doc gets stale.

**Why it happens:** Supabase Auth templates live in panel state, NOT in code. There is no API to programmatically push a template (as of mid-2025 docs); template upload is manual via dashboard.

**How to avoid:**
1. The doc itself is the source of truth — title it clearly: "TEMPLATE SOURCE OF TRUTH — copy/paste exact contents into Supabase Auth panel".
2. Add to `docs/DEPLOY-CHECKLIST.md`: "When email templates change in this repo, manually re-apply to Supabase Auth panel; verify with a test invite."
3. v2 deferred: implement automated drift check (compare via Supabase Management API) — captured in CONTEXT Deferred Ideas.

**Warning signs:** Reports of English email content in production; users complaining "qual instituição me convidou?" (template not interpolating `{{ .Data.institution_name }}`).

### Pitfall 3: Partial promote/demote leaves "two managers"

**What goes wrong:** Server Action does sequential admin-client calls to (a) update profiles.role, (b) update new manager's institution_members.role to 'manager', (c) demote prior manager's institution_members.role to 'student'. Step (c) fails (e.g., transient DB error). System now has TWO `manager` rows in `institution_members` for the same institution. RLS still works ("Members read own membership" doesn't care about count) but the UI lists two managers. Admin sees inconsistent state.

**Why it happens:** Without a transaction, partial failure is not rolled back. PostgREST/Supabase JS calls are NOT in a single transaction by default; each is its own request to PostgREST.

**How to avoid:** **Use a Postgres RPC.** Define in `supabase/migrations/0014_promote_institution_manager_rpc.sql`:
```sql
create or replace function public.promote_institution_manager(
  p_institution_id uuid,
  p_new_manager_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior_manager_profile_id uuid;
begin
  -- 1. Find prior manager (if any) IN THIS institution
  select profile_id into v_prior_manager_profile_id
  from public.institution_members
  where institution_id = p_institution_id
    and role = 'manager'
    and profile_id <> p_new_manager_profile_id
  limit 1;

  -- 2. Promote new manager
  update public.profiles
  set role = 'institution_manager'
  where id = p_new_manager_profile_id;

  update public.institution_members
  set role = 'manager'
  where institution_id = p_institution_id
    and profile_id = p_new_manager_profile_id;

  -- 3. Demote prior manager (if exists)
  if v_prior_manager_profile_id is not null then
    update public.institution_members
    set role = 'student'
    where institution_id = p_institution_id
      and profile_id = v_prior_manager_profile_id;

    -- If prior manager has no other manager rows globally, demote profiles.role too
    if not exists (
      select 1 from public.institution_members
      where profile_id = v_prior_manager_profile_id
        and role = 'manager'
    ) then
      update public.profiles
      set role = 'student'
      where id = v_prior_manager_profile_id;
    end if;
  end if;
end;
$$;

-- Grant execute to authenticated (service role bypasses; admins call this from server action)
revoke all on function public.promote_institution_manager(uuid, uuid) from public;
grant execute on function public.promote_institution_manager(uuid, uuid) to service_role;
```

Then in the Server Action: `const { error } = await adminClient.rpc("promote_institution_manager", { p_institution_id, p_new_manager_profile_id });`

The whole RPC runs in a single transaction; if any UPDATE fails, all are rolled back. `[CITED: dev.to/voboda — PostgREST wraps RPC in transaction; openillumi.com — Supabase RPC atomicity]`

**Warning signs:** Sentry events showing `update().eq()` errors AFTER a successful prior step in promote-action; manual DB inspection finding multiple `role='manager'` rows for one institution.

### Pitfall 4: `institution_id` not set on existing student's enrollments

**What goes wrong:** Admin attaches student S (existing user with prior B2C enrollment) to institution I via D-06 "Adicionar aluno existente". Manager of I expects to see S's progress in those courses. They don't — because S's enrollment row has `institution_id=null` (set by old `grant-enrollment.ts`), and the dashboard query filters `enrollments.institution_id = institution_id`.

**Why it happens:** `grant-enrollment.ts:60-72` doesn't set `institution_id` on the upsert. Existing student's enrollments are B2C-shaped.

**How to avoid:** **Document explicitly in the UI**: D-08 already says "Vincular aqui não matricula em cursos." UI-SPEC subtitle on detail page repeats this. Ensure planner surfaces it in admin-attach flow. Manager sees S in member list but S has no course rows in matrix → matrix renders "—" for all cells (per UI-SPEC matrix cell shape "no enrollment").

If product later wants to back-link existing enrollments → that's a separate task: an admin tool that sets `enrollments.institution_id = X` for a given user_id+institution_id pair. Capture as deferred idea (does not exist in current Deferred Ideas list — recommend adding).

**Warning signs:** Manager confusion: "I see Maria in my members but she has no courses." Admin response: "She has B2C courses, not B2B. Either grant her a new B2B enrollment or migrate her existing rows."

### Pitfall 5: RLS recursion via institution_members → profiles → institution_members

**What goes wrong:** Crafting a new query that joins `institution_members` to `profiles` and adds an RLS check that itself queries `institution_members` would cause infinite recursion. PostgreSQL detects and raises an error.

**Why it happens:** Naive RLS policies that reference the same table. The existing `is_member_of_institution()` helper is `SECURITY DEFINER STABLE` specifically to break this recursion (verified in 0013 line 31-55).

**How to avoid:** **Use the existing helper** `is_member_of_institution(uuid)` for any RLS check. Don't write custom inline queries against `institution_members` in policy bodies. Phase 5 doesn't add RLS policies (D-12), so this risk is theoretical for this phase, but if the planner deviates, this is the trap.

**Warning signs:** Error message "infinite recursion detected in policy for relation X" in Sentry/server logs.

### Pitfall 6: Trigger race — invite succeeds, profile row not yet created when membership insert runs

**What goes wrong:** Edge Function invokes `inviteUserByEmail` → Supabase Auth queues the email → returns `{ user: { id } }`. Edge Function immediately tries `insert into institution_members (profile_id, institution_id) values (id, ...)`. The insert fails with foreign-key violation because `profiles.id` row doesn't exist YET (the auth trigger creates it on first sign-in or on user-creation event, with timing variability).

**Why it happens:** Migrations 0008-0010 set up an auth trigger that creates `profiles` rows. CLAUDE.md §Auth notes the trigger had 2 fail-safe fixes. The `ensureProfileExists` guardrail exists for exactly this reason.

**How to avoid:** In the Edge Function (Deno), after successful `inviteUserByEmail`, before `insert into institution_members`:
```typescript
// Wait briefly for trigger; then ensure profile exists or create it explicitly
const newUserId = inviteData.user?.id;
if (newUserId) {
  // Try insert profile defensively (idempotent — primary key conflict is safe)
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: newUserId, full_name: fullName, role: 'student' }, { onConflict: "id", ignoreDuplicates: true });
}
// Now insert institution_members
```
Note: the Edge Function does NOT have access to `src/lib/auth/profiles.ts:ensureProfileExists` (Deno can't import from the Next.js app), so reimplement the upsert defensively in the function. `[VERIFIED: ensureProfileExists usage in src/app/dashboard/page.tsx:37]`

**Warning signs:** "Convite enviado mas vinculação falhou" errors; manual cleanup needed. Sentry events with "violates foreign key constraint institution_members_profile_id_fkey".

## Code Examples

### Example 1: Batched per-team progress query (D-14)

Verified pattern adapted from `getAvailableCourses` (`src/lib/courses/queries.ts:122-207`):

```typescript
// src/lib/institutions/queries.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";

type InstitutionMemberWithProgress = {
  profileId: string;
  fullName: string;
  memberRole: "student" | "manager";
  courses: Array<{
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    totalLessons: number;
    completedLessons: number;
    completionPercentage: number;
    enrollmentExpired: boolean;
  }>;
};

export async function getInstitutionMembersWithProgress(
  adminClient: SupabaseClient<Database>,
  institutionId: string,
): Promise<InstitutionMemberWithProgress[]> {
  // BYPASS JUSTIFICATION: see Pattern 3 above. Manager dashboard must include expired
  // enrollments per ENR-04 + D-12; admin client + explicit institution_id filter is the
  // documented approach (CONTEXT.md D-12) instead of broadening RLS surface area.

  // Step 1: members + profile names (single query)
  const membersRes = await adminClient
    .from("institution_members")
    .select("profile_id, role, profiles!inner(full_name)")
    .eq("institution_id", institutionId);

  if (membersRes.error) {
    logger.error("Falha ao carregar membros da instituicao", {
      institutionId,
      error: membersRes.error.message,
    });
    return [];
  }

  const members = membersRes.data ?? [];
  if (members.length === 0) return [];

  const userIds = members.map((m) => m.profile_id);

  // Step 2: enrollments for these users in this institution, INCLUDING expired
  const enrollmentsRes = await adminClient
    .from("enrollments")
    .select("user_id, course_id, expires_at, courses!inner(id, title, slug, published_at, archived_at)")
    .eq("institution_id", institutionId)
    .in("user_id", userIds);

  if (enrollmentsRes.error) {
    logger.error("Falha ao carregar enrollments da instituicao", {
      institutionId,
      error: enrollmentsRes.error.message,
    });
    return [];
  }

  const enrollments = enrollmentsRes.data ?? [];

  // Step 3: collect unique course IDs to fetch lessons for them (batched)
  const courseIds = Array.from(new Set(enrollments.map((e) => e.course_id)));
  if (courseIds.length === 0) {
    // No enrollments at all — return members with empty courses arrays
    return members.map((m) => ({
      profileId: m.profile_id,
      fullName: (m.profiles as unknown as { full_name: string })?.full_name ?? "—",
      memberRole: m.role as "student" | "manager",
      courses: [],
    }));
  }

  // Step 4: fetch lessons (id, module → course_id) for these courses
  const lessonsRes = await adminClient
    .from("modules")
    .select("course_id, deleted_at, lessons!inner(id, deleted_at)")
    .in("course_id", courseIds)
    .is("deleted_at", null);

  if (lessonsRes.error) {
    logger.error("Falha ao carregar lessons para matriz", { error: lessonsRes.error.message });
    return [];
  }

  const lessonsByCourseId = new Map<string, string[]>();
  for (const moduleRow of lessonsRes.data ?? []) {
    const lessons = (moduleRow.lessons as unknown as { id: string; deleted_at: string | null }[])
      .filter((l) => !l.deleted_at)
      .map((l) => l.id);
    const existing = lessonsByCourseId.get(moduleRow.course_id) ?? [];
    lessonsByCourseId.set(moduleRow.course_id, [...existing, ...lessons]);
  }

  const allLessonIds = Array.from(new Set([...lessonsByCourseId.values()].flat()));

  // Step 5: lesson_progress for all (user, lesson) pairs (batched)
  const progressRes = await adminClient
    .from("lesson_progress")
    .select("user_id, lesson_id, status")
    .in("user_id", userIds)
    .in("lesson_id", allLessonIds);

  if (progressRes.error) {
    logger.error("Falha ao carregar progresso", { error: progressRes.error.message });
    return [];
  }

  const completedSet = new Set(
    (progressRes.data ?? [])
      .filter((p) => p.status === "COMPLETED")
      .map((p) => `${p.user_id}::${p.lesson_id}`),
  );

  const now = Date.now();

  // Step 6: assemble per-member matrix
  return members.map((m) => {
    const memberEnrollments = enrollments.filter((e) => e.user_id === m.profile_id);
    return {
      profileId: m.profile_id,
      fullName: (m.profiles as unknown as { full_name: string })?.full_name ?? "—",
      memberRole: m.role as "student" | "manager",
      courses: memberEnrollments.map((e) => {
        const course = e.courses as unknown as { id: string; title: string; slug: string };
        const lessonIds = lessonsByCourseId.get(e.course_id) ?? [];
        const totalLessons = lessonIds.length;
        const completedLessons = lessonIds.filter((lid) =>
          completedSet.has(`${m.profile_id}::${lid}`),
        ).length;
        const completionPercentage =
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const enrollmentExpired = e.expires_at !== null && new Date(e.expires_at).getTime() < now;
        return {
          courseId: course.id,
          courseTitle: course.title,
          courseSlug: course.slug,
          totalLessons,
          completedLessons,
          completionPercentage,
          enrollmentExpired,
        };
      }),
    };
  });
}
```

**Performance characteristics:** 5 queries total regardless of member count. With ~10-50 members per institution and ~3-10 courses, the `in()` arrays stay well under the 10K threshold flagged by Supabase RLS performance docs `[CITED: github.com/orgs/supabase/discussions/14576]`. No N+1.

### Example 2: Atomic promote-with-auto-demote via RPC

Server Action calling the RPC defined in Pitfall 3:

```typescript
// src/app/actions/promote-institution-manager.ts
"use server";

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  institution_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  institution_slug: z.string().min(1),
});

export type PromoteState = { success: boolean; message: string };

async function requireAdminUser() {
  // ... mirror grant-enrollment.ts:14-43
}

export async function promoteInstitutionManagerAction(
  _prev: PromoteState,
  formData: FormData,
): Promise<PromoteState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) return { success: false, message: auth.errorMessage };

  const parsed = inputSchema.safeParse({
    institution_id: formData.get("institution_id"),
    profile_id: formData.get("profile_id"),
    institution_slug: formData.get("institution_slug"),
  });
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos." };
  }

  const adminClient = createSupabaseAdminClient();
  // ATOMIC: single transaction wrapped by PostgREST around the RPC.
  const { error } = await adminClient.rpc("promote_institution_manager", {
    p_institution_id: parsed.data.institution_id,
    p_new_manager_profile_id: parsed.data.profile_id,
  });

  if (error) {
    logger.error("Falha ao promover gestor", { error: error.message, ...parsed.data });
    captureException(new Error("promote_institution_manager RPC failed"), {
      extra: { message: error.message, code: error.code },
    });
    return { success: false, message: "Não foi possível promover o aluno a gestor. Atualize a página e tente novamente." };
  }

  revalidatePath(`/admin/instituicoes/${parsed.data.institution_slug}`);
  return { success: true, message: "Promoção concluída." };
}
```

`[CITED: openillumi.com/en/en-supabase-transaction-rpc-atomicity — PostgREST automatic transactions]`

### Example 3: Edge Function institution-aware invite (D-11)

Diff from current `Criar-usuario/index.ts`:

```typescript
// supabase/functions/Criar-usuario/index.ts (additions only)

type InviteRequestBody = {
  action: "invite" | "create";
  email: string;
  full_name: string;
  institution_id?: string;  // <-- NEW
};

// Inside the existing invite branch (after `const fullName = ...`), BEFORE the inviteUserByEmail call:

let institutionName: string | null = null;
let institutionId: string | null = null;
if (typeof body.institution_id === "string" && body.institution_id.trim()) {
  institutionId = body.institution_id.trim();

  // Email pre-flight: block silent reuse
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)  // NOTE: profiles table needs email column or join to auth.users via id
    .maybeSingle();
  // (See note below — current schema uses auth.users.email; adjust based on schema check)
  // Actually use auth.admin.listUsers with filter, or check by listing then filtering — see implementation note

  // Lookup institution name for metadata
  const { data: institution, error: instErr } = await supabaseAdmin
    .from("institutions")
    .select("id, name")
    .eq("id", institutionId)
    .maybeSingle();

  if (instErr || !institution) {
    return jsonResponse({ ok: false, message: "Instituição não encontrada." }, 404);
  }
  institutionName = institution.name;
}

const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  data: {
    full_name: fullName,
    name: fullName,
    ...(institutionName ? { institution_name: institutionName } : {}),
  },
  redirectTo,
});

if (inviteError) {
  // ... existing error handling preserved
}

// AFTER invite success, if institutionId provided, insert membership
if (institutionId && inviteData.user?.id) {
  // Defensive profile upsert (Pitfall 6)
  await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: inviteData.user.id, full_name: fullName, role: 'student' },
      { onConflict: "id", ignoreDuplicates: true },
    );

  const { error: memberErr } = await supabaseAdmin
    .from("institution_members")
    .insert({
      institution_id: institutionId,
      profile_id: inviteData.user.id,
      role: "student",
    });

  if (memberErr) {
    // Invite already sent — log but don't fail the whole call (idempotency caveat)
    console.error("Invite sent but membership insert failed", {
      memberErr,
      newUserId: inviteData.user.id,
      institutionId,
    });
    return jsonResponse(
      {
        ok: false,
        message: `Convite enviado, mas não foi possível vincular o aluno à instituição. Erro: ${memberErr.message}. Vincule manualmente.`,
        warning: true,
        invited: true,
        user_id: inviteData.user.id,
      },
      207,  // Multi-Status — partial success
    );
  }

  return jsonResponse({
    ok: true,
    invited: true,
    user_id: inviteData.user.id,
    message: `Convite enviado para ${email} da instituição ${institutionName}.`,
    redirectTo,
  });
}

// Else (no institution_id) — existing return preserved
```

**Implementation note:** The current `profiles` schema **does not have an `email` column** (verified at `src/lib/database.types.ts:240-280` — profiles has id/role/full_name/created_at/updated_at but no email). Email lookup must use `supabaseAdmin.auth.admin.listUsers` with email filter, OR the planner adds an `email` column to profiles in a `0014_*.sql` migration (mirror it from `auth.users.email`). Recommend the latter for query simplicity, but consider it **a discretionary call for the planner**. If kept as-is, use `listUsers({ filter: \`email.eq.${email}\` })` and check the returned array.

`[VERIFIED: src/lib/database.types.ts profiles row shape]` — current shape has no `email`. Existing flow in `grant-enrollment.ts:115-117` calls invite directly without pre-flight.

### Example 4: Server-side debounced search action (member autocomplete)

Mirrors Next.js learn pattern with Server Action:

```typescript
// src/app/actions/search-students-for-institution.ts
"use server";

import { z } from "zod";
import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  institution_id: z.string().uuid(),
  query: z.string().trim().max(120),
});

export async function searchStudentsForInstitution(
  institutionId: string,
  query: string,
): Promise<Array<{ id: string; fullName: string; email: string }>> {
  // Auth gate
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") return [];

  const parsed = inputSchema.safeParse({ institution_id: institutionId, query });
  if (!parsed.success || parsed.data.query.length < 2) return [];

  const adminClient = createSupabaseAdminClient();

  // Get current member IDs to exclude
  const { data: members } = await adminClient
    .from("institution_members")
    .select("profile_id")
    .eq("institution_id", parsed.data.institution_id);
  const excludeIds = new Set((members ?? []).map((m) => m.profile_id));

  // Search profiles by full_name (case-insensitive)
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", `%${parsed.data.query}%`)
    .eq("role", "student")
    .order("full_name")
    .limit(20);

  // Get emails via auth.admin (since profiles has no email column)
  // Optimization: only fetch auth users for the filtered profile IDs
  const candidateIds = (profiles ?? [])
    .filter((p) => !excludeIds.has(p.id))
    .map((p) => p.id);

  if (candidateIds.length === 0) return [];

  // Note: listUsers does not support direct id filter; fetch in batches if needed.
  // For now, follow the existing pattern from src/app/admin/cursos/[slug]/alunos/page.tsx:95
  const { data: authUsers } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email ?? ""]) ?? []);

  return candidateIds
    .map((id) => {
      const profile = profiles!.find((p) => p.id === id)!;
      return { id, fullName: profile.full_name, email: emailById.get(id) ?? "" };
    })
    .filter((s) => {
      // Also match query against email
      const q = parsed.data.query.toLowerCase();
      return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });
}
```

**Client-side debounce:** in the InstitutionManager component, use `setTimeout(() => action(...), 250)` cleared on input change. No new dep needed; if planner wants `use-debounce`, capture as deferred. `[CITED: nextjs.org/learn/dashboard-app/adding-search-and-pagination — debouncing with use-debounce hook]`

### Example 5: Vitest test pattern (mirror grant-enrollment.test.ts)

```typescript
// src/app/actions/promote-institution-manager.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/roles", () => ({ fetchUserRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { promoteInstitutionManagerAction } from "./promote-institution-manager";

describe("promoteInstitutionManagerAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls promote_institution_manager RPC with correct params", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) },
    } as never);
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const rpcSpy = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc: rpcSpy } as never);

    const fd = new FormData();
    fd.set("institution_id", "00000000-0000-0000-0000-000000000001");
    fd.set("profile_id", "00000000-0000-0000-0000-000000000002");
    fd.set("institution_slug", "colegio-marista");

    const result = await promoteInstitutionManagerAction({ success: false, message: "" }, fd);

    expect(result.success).toBe(true);
    expect(rpcSpy).toHaveBeenCalledWith("promote_institution_manager", {
      p_institution_id: "00000000-0000-0000-0000-000000000001",
      p_new_manager_profile_id: "00000000-0000-0000-0000-000000000002",
    });
  });

  it("returns permission error for non-admin", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }) },
    } as never);
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const fd = new FormData();
    fd.set("institution_id", "00000000-0000-0000-0000-000000000001");
    fd.set("profile_id", "00000000-0000-0000-0000-000000000002");
    fd.set("institution_slug", "x");

    const result = await promoteInstitutionManagerAction({ success: false, message: "" }, fd);
    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });
});
```

`[VERIFIED: pattern mirrors src/app/actions/grant-enrollment.test.ts]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Resend SDK + custom HTML emails | Supabase Auth panel template + `user_metadata` | Phase 5 D-09 (this phase, 2026-05) | No new dep, no domain dependency. EMAIL-01/02 stay deferred. |
| Sequential admin-client calls for atomic flows | Postgres RPC SECURITY DEFINER for atomic multi-row updates | Industry pattern; explicitly documented by Supabase | Single transaction with automatic rollback on failure |
| Direct browser-side Supabase queries for search | Server-side action returning filtered list to client | Next.js 15+ App Router consensus | No RLS broadening required; maintains security |
| `--turbo` Next.js | `--webpack` (CLAUDE.md) | Phase 1 setup | Webpack flag deliberately chosen — preserve in build commands |

**Deprecated/outdated:**
- (None — Phase 5 introduces no replacements for already-shipped functionality. It only ADDS surface area on top of the existing 4 phases.)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Supabase JS SDK accepts `data: { ... }` in the second-arg options object of `inviteUserByEmail` (alongside `redirectTo`) | Pattern 4, Example 3 | LOW — the in-tree `Criar-usuario` Edge Function (line 354-356) already passes `data: { full_name, name }` and the function works in production today. Adding `institution_name` to the same shape is safe. Confirmed indirectly via Swift/Kotlin/Dart docs which mirror JS shape. |
| A2 | The `{{ if .Data.institution_name }} ... {{ else }} ... {{ end }}` Go-template syntax works for boolean-presence test (empty string evaluates to false) | Pattern 4 example, §Common Pitfalls #2 | LOW — Go template default semantics for boolean-context evaluation. Docs show `{{ if eq .Data.X "..." }}` with explicit equality but the bare `{{ if .Data.X }}` is standard Go template. Smoke-test by sending one invite with metadata and one without before /gsd-verify-work. |
| A3 | `auth.users.user_metadata` (which is what Supabase docs reference as `{{ .Data }}`) populates from the `data` field of `inviteUserByEmail` options | Pattern 4 | LOW — supabase docs explicitly state "{{ .Data }} contains metadata from auth.users.user_metadata". The mapping from the SDK `data` field to `user_metadata` column is consistent across all SDKs. |
| A4 | PostgREST wraps RPC calls in a single transaction by default (so failures inside the function trigger automatic rollback) | Pitfall 3, Example 2 | LOW — confirmed by multiple sources (`dev.to/voboda`, `marmelab.com/blog/2025/12/08`, Supabase docs on Database Functions). Standard PostgREST behavior. |
| A5 | The orphan-manager flash via `?notice=...` in `/dashboard` will not break existing dashboard rendering | Pitfall 1 | LOW — current `/dashboard/page.tsx` does not read search params. Adding a conditional banner block is additive. |
| A6 | A Postgres `0014_*.sql` migration with the `promote_institution_manager` RPC does NOT trigger a separate "Phase 5 has migrations after all" reclassification (CONTEXT D-12 said "no new SQL migrations expected") | Recommended approach in summary, Pitfall 3 | MEDIUM — CONTEXT explicitly says "Phase 5 é app-layer only — no new SQL migrations expected" but ALSO has D-07 saying promote/demote is per-row. The RPC is the cleanest atomic implementation. **Recommendation:** planner should treat the RPC as discretionary (Claude's Discretion D-discretion item: "promote action atomic vs split"). If the planner chooses sequential admin-client calls instead, accept the partial-failure risk and add explicit reconciliation logic (re-query after each step, abort with error message if mid-state detected). Either path is defensible; the RPC is just the safer default. |
| A7 | `institutional_id` filter on a `select` query at the manager-dashboard scale (≤50 members × ≤10 courses × ≤200 lessons) keeps the `in()` arrays well below the 10K threshold flagged by Supabase RLS performance docs | Example 1 | LOW — the array sizes are inherent ceiling of single-tenant MDHE B2B. If a single institution grows beyond ~500 members, revisit and add query pagination. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed. (It is not empty — see A6 in particular for a borderline call.)

## Open Questions

1. **Should `profiles` get an `email` column to simplify pre-flight checks?**
   - What we know: Current `profiles` shape has no `email` (verified). Email-already-exists check requires either `supabaseAdmin.auth.admin.listUsers` (slow, returns 1000 rows) or schema change.
   - What's unclear: Whether the planner is willing to add a `0014_add_email_to_profiles.sql` migration (would also require populating from `auth.users.email` and adding a trigger to keep in sync OR documenting the convention that `email` is set at profile creation only).
   - Recommendation: **Use `listUsers` for v1** (matches the existing pattern at `src/app/admin/cursos/[slug]/alunos/page.tsx:95`). Capture as deferred idea: "Add email column to profiles for faster lookups; add sync trigger from auth.users".

2. **Does the planner adopt the Postgres RPC for promote/demote, or sequential admin-client calls?**
   - What we know: RPC = atomic, sequential = partial-failure risk.
   - What's unclear: CONTEXT says "no new SQL migrations expected"; the RPC is a SQL migration. Strict reading conflicts with D-07 atomicity needs.
   - Recommendation: **Adopt the RPC** (one tiny migration is a small price for atomicity); add `0014_promote_institution_manager_rpc.sql` and update README.md migration list. Document the deviation from "app-layer only" inline. This is the planner's call (D-discretion).

3. **Should the orphan-manager redirect carry a one-time flash via search param or session storage?**
   - What we know: UI-SPEC §Error states says "/gestor manager órfão (D-02 — flash on /dashboard after redirect)".
   - What's unclear: Mechanism — search param survives URL share (annoying but harmless); session storage is more privacy-respectful but requires client JS.
   - Recommendation: **Search param `?notice=orphan-manager`** for v1 — simple, no client JS, conditional banner in `/dashboard/page.tsx`. Capture toast-replacement as deferred when toast lib is added.

4. **Pre-flight email check — match against `auth.users` (canonical) or `profiles.email` if added?**
   - What we know: `auth.users.email` is canonical; `profiles` doesn't have email today.
   - What's unclear: Linked to Open Question 1.
   - Recommendation: **Match against `auth.users` via `listUsers` for v1**.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev/build | ✓ | 20+ (CI uses 20) | — |
| npm | Package management | ✓ | bundled with Node | — |
| Supabase CLI | Local migration testing | UNKNOWN (depends on dev machine) | — | Apply migrations directly via Supabase SQL Editor (existing workflow per CLAUDE.md) |
| Deno (for Edge Function dev) | `Criar-usuario` local development | UNKNOWN | — | Edit Edge Function source; deploy via `supabase functions deploy Criar-usuario`; rely on Supabase logs for debugging |
| Supabase project (cloud) | Auth, DB, Storage, Edge Functions | ✓ (production already operational) | — | — |
| Sentry DSN | Error capture in actions | ✓ | — | If absent, sentry no-op (verified in `src/lib/observability/sentry.ts`) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Supabase CLI / Deno — both have manual workflow fallbacks already in use by this team.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (current — pinned via `vitest.config.ts`) |
| Config file | `vitest.config.ts` (env: node, alias `@` → `src`) |
| Quick run command | `npx vitest run src/app/actions/promote-institution-manager.test.ts` (per file) |
| Full suite command | `npm run test:ci` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INST-05 | Middleware redirects unauthed `/gestor` to `/login` | unit (middleware test) | `npx vitest run middleware.test.ts` | ❌ Wave 0 — middleware has no tests today |
| INST-05 | Middleware redirects student-role from `/gestor` to `/dashboard` | unit | `npx vitest run middleware.test.ts` | ❌ Wave 0 |
| INST-05 | Middleware redirects admin-role from `/gestor` to `/admin/instituicoes` | unit | `npx vitest run middleware.test.ts` | ❌ Wave 0 |
| INST-06 | `/gestor/page.tsx` redirects orphan manager to `/dashboard?notice=orphan-manager` | unit (RSC behavior via mocked queries) | `npx vitest run src/app/gestor/page.test.tsx` | ❌ Wave 0 |
| INST-06 | `getInstitutionMembersWithProgress` only returns members of the requested institution | unit | `npx vitest run src/lib/institutions/queries.test.ts` | ❌ Wave 0 |
| INST-06 | `getInstitutionMembersWithProgress` includes expired enrollments with `enrollmentExpired: true` flag | unit | `npx vitest run src/lib/institutions/queries.test.ts` | ❌ Wave 0 |
| INST-07 | Matrix renders 0%/n aulas for active no-progress; 100%/n for completed; em-dash for no enrollment; expired pill for expired | manual-only (UI rendering) | n/a | n/a |
| INST-07 | `getInstitutionCertificates` returns certs ordered by issued_at DESC | unit | `npx vitest run src/lib/institutions/queries.test.ts` | ❌ Wave 0 |
| INST-08 | `createInstitutionAction` validates with Zod schema; rejects duplicate slug | unit | `npx vitest run src/app/actions/upsert-institution.test.ts` | ❌ Wave 0 |
| INST-08 | `attachInstitutionMemberAction` requires admin role; inserts `institution_members` with role='student' | unit | `npx vitest run src/app/actions/attach-institution-member.test.ts` | ❌ Wave 0 |
| INST-08 | `promoteInstitutionManagerAction` calls `promote_institution_manager` RPC with correct params; rejects non-admin | unit | `npx vitest run src/app/actions/promote-institution-manager.test.ts` | ❌ Wave 0 |
| INST-08 | `detachInstitutionMemberAction` removes `institution_members` row only (no enrollment changes) | unit | `npx vitest run src/app/actions/detach-institution-member.test.ts` | ❌ Wave 0 |
| EMAIL-03 | Edge Function sends invite with `data.institution_name` when `institution_id` is provided | manual-only (Deno integration test infeasible in current setup) | n/a — verify by sending real invite in dev project | n/a |
| EMAIL-03 | Edge Function blocks email-already-exists with 409 when institution_id provided (D-06) | manual-only | n/a | n/a |
| EMAIL-03 | Email template renders pt-BR with institution_name when metadata present | manual-only (panel UX) | n/a | n/a |
| EMAIL-03 | Email template renders fallback when metadata absent (legacy /admin/usuarios) | manual-only | n/a | n/a |
| Schema | All Zod schemas in `src/lib/institutions/schema.ts` accept valid inputs and reject invalid ones | unit | `npx vitest run src/lib/institutions/schema.test.ts` | ❌ Wave 0 |
| Slug | Institution slug auto-fill via `slugify()` works for pt-BR diacritics | unit (re-uses existing slugify tests; new institution-form test for the UI auto-fill behavior is integration-y, defer) | `npx vitest run src/lib/courses/slugify.test.ts` | ✓ |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched-file>.test.ts` (single file, < 5s)
- **Per wave merge:** `npm run test:ci` (full suite, ~10-30s based on current 21 test files)
- **Phase gate:** `npm run lint && npm run typecheck && npm run test:ci && npm run build` all green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `middleware.test.ts` — covers INST-05 (middleware ring extension); will require new test file at repo root or `tests/` (pattern not yet established for middleware testing in this repo — planner decides location)
- [ ] `src/lib/institutions/queries.test.ts` — covers INST-06, INST-07 (all three D-14 query functions)
- [ ] `src/lib/institutions/schema.test.ts` — covers Zod schemas
- [ ] `src/app/actions/upsert-institution.test.ts` — INST-08
- [ ] `src/app/actions/attach-institution-member.test.ts` — INST-08
- [ ] `src/app/actions/promote-institution-manager.test.ts` — INST-08
- [ ] `src/app/actions/detach-institution-member.test.ts` — INST-08
- [ ] `src/app/actions/search-students-for-institution.test.ts` — supports D-06 search UX
- [ ] `src/app/gestor/page.test.tsx` — INST-06 orphan-manager redirect (NOTE: RSC test in env="node" with mocked Supabase + mocked `next/navigation.redirect` — same pattern as `grant-enrollment.test.ts:3-7`)
- [ ] Framework install: NONE — Vitest already configured

**Manual-only items (cannot be automated in current setup):** Email rendering (Supabase Auth panel state) and Edge Function execution (Deno runtime in cloud) require manual smoke-tests. Document in `docs/DEPLOY-CHECKLIST.md` as a pre-prod step: "Send one institutional invite from `/admin/instituicoes/[slug]`; verify email contains institution name in subject + body."

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (email + password); session via `@supabase/ssr` cookies (already shipped) |
| V3 Session Management | yes | Same as V2; middleware refreshes cookies via `setAll` callback (already in `middleware.ts:36-50`) |
| V4 Access Control | yes | Four-ring middleware (PROTECTED, ADMIN, GESTOR, AUTH) + `requireAdminUser()` server-action gate + RLS policies on all 3 institution tables (shipped in 0013); `is_member_of_institution()` SECURITY DEFINER STABLE helper |
| V5 Input Validation | yes | Zod schemas in `src/lib/institutions/schema.ts` + parsing in every Server Action; UUID validation on institution_id and profile_id; trim+lowercase email |
| V6 Cryptography | n/a | No new crypto in Phase 5; certificate signing already shipped (Phase 3); SMTP TLS handled by Supabase |
| V8 Data Protection | yes | Manager dashboard query bypasses RLS (admin client) — explicit `institution_id` filter is the documented compensating control; comment in `getInstitutionMembersWithProgress` MUST explain why |
| V9 Communications | yes | HTTPS enforced by Vercel + Supabase; Edge Function CORS headers preserve current pattern |
| V11 Business Logic | yes | Atomic promote/demote via RPC (Pitfall 3); idempotent membership insert (upsert with `ignoreDuplicates`); soft detach preserves enrollments (D-08) |

### Known Threat Patterns for Next.js 16 + Supabase RLS + Server Actions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Privilege escalation via Server Action without role check | Elevation | `requireAdminUser()` gate at top of EVERY new Server Action (mirror pattern from `grant-enrollment.ts:14-43`); never trust client-supplied role |
| Manager reading another institution's data via parameter tampering | Information Disclosure | `getInstitutionForManager()` resolves institution_id from `auth.uid()` server-side via `institution_members` RLS-respecting query; never accept institution_id as URL param on `/gestor` (D-03 chose singular URL specifically to avoid this) |
| Email-already-exists silent attach (security: link wrong account to institution) | Spoofing | Edge Function pre-flight check (D-06) BLOCKS the operation with explicit error; admin must explicitly use "add existing" path |
| RPC SQL injection via JSON params | Tampering | RPC uses typed parameters (`p_institution_id uuid, p_new_manager_profile_id uuid`); PostgreSQL rejects type mismatch; no string interpolation |
| Email template XSS via institution name | Tampering | Supabase Auth Go template engine is HTML-safe by default for `.Data.*` interpolations; institution names are stored as plain text; verify by including a test institution with `<script>` in name and confirming email renders escaped (smoke test) |
| Session fixation on /gestor | Session | Middleware uses `getUser()` (not `getSession()`) which validates with auth server — already correct in current `middleware.ts:55` |
| CSRF on Server Actions | Tampering | Next.js Server Actions have built-in CSRF protection (encrypted action IDs); no additional control needed |
| Open redirect via redirectTo param | Spoofing | `getInviteRedirectTo()` in Edge Function constructs URL from `APP_URL` env var (server-controlled), not from request — already correct |

## Sources

### Primary (HIGH confidence)
- `src/lib/courses/queries.ts:122-207` — `getAvailableCourses` pattern (basis for batched query)
- `src/app/actions/grant-enrollment.ts` — Server Action skeleton + `requireAdminUser` pattern
- `src/app/actions/grant-enrollment.test.ts` — Vitest mocking pattern for Supabase clients
- `supabase/functions/Criar-usuario/index.ts:354-356` — confirms JS SDK accepts `data` in inviteUserByEmail options
- `supabase/migrations/0013_institutions_enrollments.sql` — all RLS policies + helper function
- `src/lib/database.types.ts:302-509` — typed schema for institutions, institution_members, enrollments
- `middleware.ts` — existing 3-ring pattern to extend
- `src/components/admin/confirmation-dialog.tsx` — reusable dialog with focus trap
- `src/app/admin/cursos/[slug]/alunos/page.tsx` — admin-client + listUsers pattern (basis for member search)
- CLAUDE.md, .planning/PROJECT.md, .planning/REQUIREMENTS.md, CONTEXT.md, UI-SPEC.md — repo-level constraints

### Secondary (MEDIUM confidence — Supabase docs and Next.js learn, verified)
- [Supabase Auth Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) — Go template syntax + `{{ .Data.* }}` access
- [Supabase JS inviteUserByEmail reference](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail) — confirmed signature (limited content extracted; cross-verified via Swift/Kotlin docs)
- [Supabase Swift inviteUserByEmail](https://supabase.com/docs/reference/swift/auth-admin-inviteuserbyemail) — confirms `data` parameter shape
- [Supabase Kotlin inviteUserByEmail](https://supabase.com/docs/reference/kotlin/auth-admin-inviteuserbyemail) — same
- [Next.js learn: search and pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) — debounce + URL search param pattern
- [RLS Performance and Best Practices (GitHub Discussion)](https://github.com/orgs/supabase/discussions/14576) — `in()` filter guidance, 10K threshold, wrap functions in `select` for initPlan caching
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions) — RPC + transaction semantics
- [Easy functions and transactions using Postgres + PostgREST or Supabase (dev.to/voboda)](https://dev.to/voboda/gotcha-supabase-postgrest-rpc-with-transactions-45a7) — PostgREST wraps RPC in transaction
- [Supabase Data Integrity: Guarantee Atomicity Using PostgreSQL RPC (openillumi.com)](https://openillumi.com/en/en-supabase-transaction-rpc-atomicity/) — atomic operations pattern
- [Transactions and RLS in Supabase Edge Functions (marmelab.com 2025/12)](https://marmelab.com/blog/2025/12/08/supabase-edge-function-transaction-rls.html) — Edge Function transaction patterns

### Tertiary (LOW confidence — flagged for executor smoke-test)
- Go template `{{ if .Data.field }}` boolean-presence behavior (Assumption A2 — verify with test invite)
- Email template HTML escaping of `.Data.*` interpolations (verify with `<script>` in institution name)
- Supabase panel template-drift behavior on partial saves (verify via Supabase support if production drift observed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in repo, no new deps
- Architecture patterns: HIGH — every pattern cited mirrors existing in-tree code
- Pitfalls: HIGH — derived from documented Supabase concerns + concrete schema state inspection
- Validation architecture: HIGH — Vitest config + mocking pattern proven; manual-only items justified
- Security domain: HIGH — RLS policies already shipped; new actions follow established gate pattern
- Email template syntax: MEDIUM — official docs cited but not exhaustive; assumption A1-A3 flagged
- Promote RPC adoption: MEDIUM — recommendation contradicts "no migrations" framing; assumption A6 flagged for planner

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (Supabase Auth template UX is stable; Next.js App Router patterns are stable in v16)
