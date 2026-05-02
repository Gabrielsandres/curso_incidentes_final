---
phase: 05-b2b-institution-manager
plan: 04
subsystem: edge-functions / supabase-auth / admin-invite
tags: [edge-function, deno, supabase-auth, email-template, pt-BR, b2b, institutional-invite]
status: tasks-1-3-complete-checkpoint-pending
requirements: [EMAIL-03, INST-08]
dependency_graph:
  requires:
    - "05-01 (institution_members RLS + RPCs)"
    - "Phase 1 institutions table + institution_members FK"
  provides:
    - "Edge Function institution_id branch (callable from 05-07 admin invite UI)"
    - "Browser wrapper payload type with institution_id?: string"
    - "docs/email-templates.md canonical pt-BR Supabase Auth Invite template"
  affects:
    - "supabase/functions/Criar-usuario/index.ts (extended; B2C path preserved)"
    - "src/lib/admin/call-admin-user-function.ts (additive type field)"
    - "docs/email-templates.md (new)"
tech-stack:
  added: []
  patterns:
    - "Pre-flight email check via auth.admin.listUsers (cap 1000) — matches existing /admin/cursos/[slug]/alunos pattern"
    - "Defensive profiles upsert with ignoreDuplicates before institution_members FK insert (Pitfall 6 — auth trigger race)"
    - "Conditional spread of institution_name into invite user_metadata for Go-template interpolation (D-09 + D-10)"
key-files:
  created:
    - "docs/email-templates.md (129 lines — canonical pt-BR Supabase Auth Invite source-of-truth)"
  modified:
    - "supabase/functions/Criar-usuario/index.ts (423 → 579 lines, Δ +156)"
    - "src/lib/admin/call-admin-user-function.ts (149 → 157 lines, Δ +8)"
decisions:
  - "Adopted auth.admin.listUsers pre-flight pattern (Open Question 1 + 4 — RESEARCH recommendation); profiles schema untouched"
  - "Inline TODO documents listUsers 1000-row cap as v2 follow-up per Threat T-05-04-07 / W-5"
  - "Conditional spread `...(institutionName ? { institution_name } : {})` keeps user_metadata payload identical when institution_id is absent (regression-safe)"
  - "207 partial-success status used for post-invite linkage failures (profile upsert / institution_members insert) so the operator can manually clean up state"
metrics:
  duration_seconds: 279
  duration_minutes: 4.7
  tasks_completed: 3
  tasks_total: 4
  files_changed: 3
  lines_added: 293
  completed_date: 2026-05-02
---

# Phase 05 Plan 04: Edge Function institution_id Branch + pt-BR Auth Template Summary

JWT-validated Edge Function `Criar-usuario` extended with an institution_id branch — pre-flight email check, institution lookup, defensive profile upsert, and institution_members insert — plus a canonical pt-BR Supabase Auth Invite template doc that the operator pastes into the dashboard. Plan unblocks 05-07 (admin invite UI). Tasks 1-3 autonomous and complete; Task 4 is the operator deploy + paste checkpoint.

## Files

| File | Lines (before → after) | SHA (HEAD) | Change |
|------|------------------------|------------|--------|
| `supabase/functions/Criar-usuario/index.ts` | 423 → 579 (Δ +156) | `d099307` | Extended invite branch only — create/delete/resend_invite branches untouched |
| `src/lib/admin/call-admin-user-function.ts` | 149 → 157 (Δ +8) | (in `2806393`) | Added optional `institution_id?: string` + JSDoc on `CreateAdminUserPayload` |
| `docs/email-templates.md` | new — 129 lines | (in `d59cf19`) | Canonical pt-BR Subject + HTML body + paste/verify instructions |

## New institution_id branch flow (pseudo)

When the Edge Function receives an `invite` payload with a non-empty `institution_id`:

- **Pre-flight email check** — call `supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })`; if `email` already exists in `auth.users`, return `409 { ok: false, message: "Email já cadastrado. Use Adicionar aluno existente." }` (D-06, blocks silent attach).
- **Institution lookup** — `select id, name from institutions where id = trimmedInstitutionId`; if missing, return `404 { ok: false, message: "Instituição não encontrada." }`.
- **Invite with metadata** — call `inviteUserByEmail(email, { data: { full_name, name, institution_name } })`; the Supabase Auth template renders `{{ .Data.institution_name }}` server-side.
- **Defensive profile upsert** — `upsert({ id: newUserId, full_name, role: "student" }, { onConflict: "id", ignoreDuplicates: true })` to neutralize the auth-trigger race (Pitfall 6); on failure return `207 { warning: true, invited: true, message: "Convite enviado, mas não foi possível preparar o perfil. Vincule manualmente." }`.
- **institution_members insert** — `insert({ institution_id, profile_id: newUserId, role: "student" })`; on failure return `207 { warning: true, invited: true, message: "Convite enviado, mas não foi possível vincular o aluno à instituição. Vincule manualmente." }`.
- **Success** — return `200 { ok: true, invited: true, user_id, message: "Convite enviado para <email> da instituição <institutionName>." }`.

When `institution_id` is absent, the function falls through to the **original** invite-success return at the end of the handler — byte-identical behavior for the existing `/admin/usuarios` B2C path.

## Verification (Tasks 1-3)

| Check | Result |
|-------|--------|
| `npm run typecheck` | exits 0 (clean) |
| `npm run lint --max-warnings=0` | exits 0 (only baseline-browser-mapping info note from a transitive dep) |
| Edge Fn contains `institution_id`, `institution_name`, all four pt-BR strings, `institution_members`, `ignoreDuplicates: true` | PASS |
| Edge Fn contains no `Resend` SDK import (existing `resend_invite` action is unrelated) | PASS — no `from "resend"` / `import` of any resend lib |
| `docs/email-templates.md` contains `{{ .Data.institution_name }}`, `{{ if .Data.institution_name }}`, `{{ else }}`, `{{ end }}`, `{{ .ConfirmationURL }}`, "Source of Truth", "Bem-vindo(a) à plataforma MDHE" | PASS |
| `src/lib/admin/call-admin-user-function.ts` contains `institution_id?:` and `D-11` traceability | PASS |
| Edge Fn diff scope: `git diff` shows only invite-branch changes — `create`, `delete`, `resend_invite`, CORS, bearer token, admin-role gate UNTOUCHED | PASS (visual diff confirms) |

## Operator action pending (Task 4 — BLOCKING checkpoint)

Two manual steps required to make the new functionality live in the dev/prod Supabase project:

1. **Deploy the Edge Function** — `supabase functions deploy Criar-usuario` from a developer machine OR Supabase Dashboard → Edge Functions → Criar-usuario → Deploy from local. The repo invokes the live Functions URL, so the new branch is dormant until deploy completes.
2. **Paste the pt-BR Invite template** — open `docs/email-templates.md` → copy §Subject + §HTML Body → paste into Supabase Dashboard → Authentication → Email Templates → Invite User → Save. (No API to push templates — Pitfall 2.)

A combined smoke test (Task 4 step 11 in PLAN) sends a real invite from the Functions test panel using a personal email account and a freshly-inserted test institution row, then verifies the inbox subject and body render with the institution name interpolated. After the operator types "deployed and verified", a follow-up agent (or 05-07 author) can proceed.

## Deviations from Plan

None — the plan executed exactly as written. No Rule 1/2/3 auto-fixes were necessary; all scaffolds and exact strings were inlined in the plan and applied verbatim. No Rule 4 architectural questions arose.

## Authentication Gates

None. The Edge Function admin gate (existing `profile?.role !== "admin"` check) is preserved verbatim. No new auth surface introduced.

## Threat Flags

No new security-relevant surface beyond the threats already enumerated in the plan's `<threat_model>` (T-05-04-01 through T-05-04-08). All `mitigate` dispositions implemented:

- T-05-04-02 mitigated by 409 pre-flight check (verbatim D-06 message)
- T-05-04-03 mitigated by parameterized `.eq("id", trimmedInstitutionId)` against UUID-typed column
- T-05-04-04 mitigated by Supabase Auth's default Go-template HTML escaping (documented in template Notes)
- T-05-04-07 mitigated to v2 by inline TODO above the listUsers call

## Known Stubs

None. All wiring is real:

- `institution_name` flows from DB lookup → invite metadata → Auth template (verified end-to-end in code).
- `institution_members.role = "student"` is concrete (not a placeholder); 05-07 admin UI will not need to override.
- `docs/email-templates.md` contains the **complete** Subject + HTML body — not a placeholder/skeleton.

## Self-Check: PASSED

- FOUND: `supabase/functions/Criar-usuario/index.ts` (HEAD includes institution_id branch)
- FOUND: `src/lib/admin/call-admin-user-function.ts` (HEAD includes institution_id?: field)
- FOUND: `docs/email-templates.md` (new file — 129 lines)
- FOUND: commit `3a4a9ce` (Task 1 — Edge Function extension)
- FOUND: commit `2806393` (Task 2 — wrapper payload type)
- FOUND: commit `d59cf19` (Task 3 — pt-BR template doc)

## Notes

- **Plan UNBLOCKS 05-07** — admin invite UI can now call `callAdminUserFunction({ action: "invite", email, full_name, institution_id })` and rely on the Edge Function for the email pre-flight, institution lookup, profile upsert, and members insert.
- **EMAIL-03 implementation concludes here** — the functional acceptance (pt-BR copy + institution name interpolation) requires Task 4 deploy + paste + smoke test.
- The worktree branch was created before Phase 5 plans existed on main; Phase 5 docs (CONTEXT, RESEARCH, PATTERNS) were materialized from main into the worktree filesystem to read but are intentionally NOT committed — they live on main and were used as read-only references.
