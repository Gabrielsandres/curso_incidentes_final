---
phase: 5
slug: b2b-institution-manager
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run <file>` |
| **Full suite command** | `npm run test:ci` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <file>` for the file just edited
- **After every plan wave:** Run `npm run test:ci` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green + `npm run lint` zero-warning + `npm run typecheck` clean
- **Max feedback latency:** 30 seconds (per-file vitest)

---

## Per-Task Verification Map

To be filled in by the planner. Each task in Phase 5 must map to a row here with:
- File under test
- Test command
- Whether the test file is created in Wave 0 or referenced from existing infrastructure

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD by planner | — | — | INST-05/06/07/08, EMAIL-03 | — | RLS-enforced isolation, atomic promote, idempotent invite | unit + integration | `npx vitest run <file>` | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test scaffolds the planner should create before implementation begins:

- [ ] `src/lib/institutions/queries.test.ts` — stubs for `getInstitutionForManager`, `getInstitutionMembersWithProgress`, `getInstitutionCertificates` (INST-06, INST-07)
- [ ] `src/lib/institutions/schema.test.ts` — Zod schema validation tests (institution create/update, member attach, manager promote payloads)
- [ ] `src/app/actions/upsert-institution.test.ts` — admin guard + Zod validation + happy path (INST-08)
- [ ] `src/app/actions/attach-institution-member.test.ts` — admin guard + idempotency on duplicate insert (INST-08)
- [ ] `src/app/actions/promote-institution-manager.test.ts` — atomic promote + auto-demote + global-role flip (INST-08)
- [ ] `src/app/actions/detach-institution-member.test.ts` — soft detach preserves enrollments + certificates (INST-08, alignment with CERT-05 spirit)
- [ ] `middleware.test.ts` (or test alongside `middleware.ts`) — gestor route gating: unauth→/login, non-manager→/dashboard, admin→/admin/instituicoes redirect, orphan-manager→/dashboard with notice (INST-05)
- [ ] No new framework install — vitest config already covers `src/**/*.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email institucional pt-BR template chega no inbox com `{{ .Data.institution_name }}` resolvido | EMAIL-03 | Template lives in Supabase panel (not in repo); requires SMTP configured (deferred EMAIL-01/02). Until prod SMTP works, manual sandbox check only. | (a) Configure template in Supabase Auth panel per `docs/email-templates.md`. (b) Trigger invite from `/admin/instituicoes/[slug]` with a test email. (c) Verify the invite email body contains the institution name and pt-BR copy. |
| RLS isolation: gestor de Inst A não vê Inst B | INST-06 | RLS-level test requires two real authenticated sessions; Vitest tests stub the client. | Use Supabase Studio or a manual sign-in: log in as gestor of Inst A, attempt `select * from enrollments where institution_id = '<Inst B id>'` — must return 0 rows. |
| Visual: matriz colapsa para scroll horizontal em viewport estreita | UI-SPEC §Mobile | Visual responsiveness; no jsdom in vitest. | DevTools mobile emulator at 375px width; matrix should scroll horizontally with sticky student column. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (must use `vitest run`, not `vitest`)
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
