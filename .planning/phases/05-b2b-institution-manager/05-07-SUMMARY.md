---
phase: 05-b2b-institution-manager
plan: 07
subsystem: admin-ui
tags: [admin-ui, rsc, server-actions, useactionstate, tailwind, pt-BR, b2b]
requirements: [INST-08, EMAIL-03]
provides:
  - "/admin/instituicoes RSC list page with stats line + 'Nova instituição' CTA"
  - "/admin/instituicoes/nova RSC shell + NewInstitutionForm client form (slugify auto-fill)"
  - "/admin/instituicoes/[slug] RSC detail page wired to InstitutionManager"
  - "InstitutionManager composite: tabs (Adicionar aluno existente | Convidar novo aluno), debounced search 250ms, attach + invite actions"
  - "PromoteManagerButton with 3 visual modes (sky primary / white secondary / amber inverse) per UI-SPEC §Promover hierarchy"
  - "DetachMemberButton with ConfirmationDialog and locked D-08 soft-detach copy"
  - "MemberRoleBadge — emerald 'Gestor' (Crown icon) vs slate 'Aluno'"
requires:
  - "src/lib/institutions/queries.ts:getAdminInstitutionList (05-03)"
  - "src/app/actions/upsert-institution.ts:createInstitutionAction (05-05)"
  - "src/app/actions/attach-institution-member.ts (05-05)"
  - "src/app/actions/promote-institution-manager.ts (05-05)"
  - "src/app/actions/detach-institution-member.ts (05-05)"
  - "src/app/actions/search-students-for-institution.ts (05-05)"
  - "src/lib/admin/call-admin-user-function.ts with institution_id payload (05-04)"
affects:
  - "Plan 05-09 (UAT) — unblocks the end-to-end admin journey for the smoke checklist"
tech-stack:
  added: []
  patterns:
    - "RSC + admin client + auth.admin.listUsers email join (mirrors src/app/admin/cursos/[slug]/alunos/page.tsx)"
    - "useActionState + useFormStatus for the create form (mirrors new-course-form.tsx)"
    - "useTransition + useActionState for per-row server-action buttons (mirrors revoke-enrollment-button.tsx)"
    - "Runtime narrowing on callAdminUserFunction success branch (B-1 fix mirroring user-manager.tsx:64-72)"
    - "Three-state promote button: no-prior skips dialog (UI-SPEC §Promover line 451-460); with-prior + demote both confirm via shared ConfirmationDialog"
key-files:
  created:
    - "src/app/admin/instituicoes/page.tsx (153 lines)"
    - "src/app/admin/instituicoes/nova/page.tsx (75 lines)"
    - "src/app/admin/instituicoes/[slug]/page.tsx (149 lines)"
    - "src/app/admin/instituicoes/nova/new-institution-form.tsx (152 lines)"
    - "src/app/admin/instituicoes/institution-manager.tsx (417 lines)"
    - "src/app/admin/instituicoes/promote-manager-button.tsx (133 lines)"
    - "src/app/admin/instituicoes/detach-member-button.tsx (81 lines)"
    - "src/components/admin/member-role-badge.tsx (26 lines)"
    - ".planning/phases/05-b2b-institution-manager/05-07-SUMMARY.md"
  modified: []
decisions:
  - "Detail page select omits contact_phone — institutions table (migration 0013) has no contact_phone column. The plan-provided code listed contact_phone in the select; corrected to match the actual schema (consistent with 05-03/05-05 decisions)."
  - "members map narrows m.role at the call site (m.role === 'manager' ? 'manager' : 'student') so the InstitutionMemberWithProfile.role union stays sound without an extra cast in the RSC."
  - "Removed unused 'institutionName' destructure from PromoteManagerButton — was in the plan snippet but never referenced; kept the prop in the interface for future use and lint clean."
  - "handleInvite catch clause uses bare 'catch {}' (no unused identifier) since lint forbids unused vars."
metrics:
  duration: "~12 min"
  completed: 2026-05-02
  tasks: 2
  files_created: 8
  files_modified: 0
---

# Phase 5 Plan 7: Admin Instituicoes UI Summary

The full /admin/instituicoes/* admin operator surface for INST-08 — list, create, detail, plus the composite InstitutionManager with attach/invite/promote/demote/detach wired to the 05-05 server actions and the 05-04 extended Edge Function.

## What Was Built

### 1. RSC pages (Task 1)

| Path | Role | Highlights |
|---|---|---|
| `/admin/instituicoes` | List | Eyebrow "INSTITUIÇÕES", H1 "Instituições contratantes", stats line `N instituições · M alunos vinculados · K com gestor`, primary CTA "Nova instituição", per-row "Editar". Empty state with `Building2` icon + secondary CTA. |
| `/admin/instituicoes/nova` | Create shell | Breadcrumb (Instituições > Nova instituição) + `<NewInstitutionForm />`. |
| `/admin/instituicoes/[slug]` | Detail | Resolves institution by slug via admin client; loads `institution_members` joined to `profiles`; pulls emails from `auth.admin.listUsers` (perPage 1000, single page); calls `notFound()` when slug doesn't exist. Renders `<InstitutionManager />`. |

All three RSC pages duplicate the standard 3-step auth gate (getUser → not-user redirect /login + redirectTo, fetchUserRole !== "admin" redirect /dashboard) for defense-in-depth — middleware already gates `/admin`, but the in-page redirect handles stale-cookie edge cases (PATTERNS lines 1531-1542).

### 2. MemberRoleBadge (Task 1)

Tiny pill component at `src/components/admin/member-role-badge.tsx`:

- `role === "manager"` → emerald-100 / emerald-700 + `Crown` icon + "Gestor"
- `role === "student"` → slate-100 / slate-600 / border slate-200 + "Aluno"

Both variants share `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold`.

### 3. NewInstitutionForm (Task 2)

Mirrors `new-course-form.tsx`:

- `useActionState(createInstitutionAction, initialInstitutionFormState)`
- Slug auto-fill: `slugify(name)` populates the slug input via uncontrolled ref while the user hasn't touched it. After first slug edit, auto-fill stops (`slugTouched` latches).
- pt-BR labels (verbatim per UI-SPEC §Copywriting Contract): "Nome da instituição *", "Slug *", "Email do contato comercial", "Telefone (opcional)", "Criar instituição", "Cancelar".
- `state.message` banner with success/error chrome.

### 4. InstitutionManager (Task 2 — the composite)

The 417-line client component that owns the detail-page interactivity:

**Tabs**

```text
| Adicionar aluno existente | Convidar novo aluno |
```

Locked tab labels per UI-SPEC.

**Add-existing pane** — debounced search:

- 250ms `setTimeout` debounce; previous timeout cleared on each keystroke (T-05-07-04 mitigation in threat model).
- `searchStudentsForInstitution(institution.id, search)` triggers when query length ≥ 2.
- Results render with Adicionar aluno button per row → `attachInstitutionMemberAction` via `useTransition`.
- `attachState.message` banner.

**Invite pane** — `callAdminUserFunction({ action: "invite", email, full_name, institution_id })`:

The B-1 fix landed verbatim at lines 117-123:

```typescript
const responseMessage =
  typeof result.data === "object" &&
  result.data !== null &&
  "message" in result.data &&
  typeof (result.data as Record<string, unknown>).message === "string"
    ? ((result.data as Record<string, unknown>).message as string)
    : `Convite enviado para ${inviteEmail} da instituição ${institution.name}.`;
```

This narrows the `result.data` (success-branch shape `{ ok: true, data: unknown }`). Reading `result.message` on the success branch was the type-error pattern caught by the planner; the broken pattern (`result.message ?? "..."`) is absent (`grep` returns 0 matches).

**Members list** — `sortedMembers.map(...)`:

Per row: `MemberRoleBadge` + `PromoteManagerButton` + `DetachMemberButton`. Sort is `localeCompare("pt-BR")`.

`promoteMode` resolution:
- Current member is the manager → `"demote"`
- Some other member is the manager → `"promote-with-prior"` (white secondary; opens dialog)
- No manager exists → `"promote-no-prior"` (sky primary; submits without dialog per UI-SPEC §Promover line 451-460)

### 5. PromoteManagerButton (Task 2)

Routes to `promoteInstitutionManagerAction` or `demoteInstitutionManagerAction` based on `mode === "demote"`. The three modes have distinct Tailwind classes:

| Mode | Classes | Dialog? |
|---|---|---|
| `promote-no-prior` | `bg-sky-600` primary | NO (direct submit) |
| `promote-with-prior` | `border border-slate-300 bg-white` secondary | YES (warns prior manager will be auto-demoted, mentions priorManagerName) |
| `demote` | `border border-amber-300 bg-amber-50 text-amber-700` inverse | YES (D-08-style copy) |

### 6. DetachMemberButton (Task 2)

Mirrors `revoke-enrollment-button.tsx`. Always opens `ConfirmationDialog` with the locked D-08 body: *"O aluno mantém o histórico de progresso e os certificados emitidos. Apenas o vínculo com a instituição é removido."*

## Verification

| Command | Status |
|---|---|
| `npm run typecheck` | ✓ exit 0 |
| `npm run lint` | ✓ exit 0 (max-warnings=0) |
| `npm run test:ci` | ✓ 207/207 pass |
| `npm run build` | ✓ all 3 new routes render in route map |

Build route table now includes:
```
ƒ /admin/instituicoes
ƒ /admin/instituicoes/[slug]
ƒ /admin/instituicoes/nova
```

## Acceptance criteria — verbatim grep guards

| Criterion | Result |
|---|---|
| `INSTITUIÇÕES`, `Instituições contratantes`, `Nova instituição`, `Nenhuma instituição cadastrada` in list page | 5 matches |
| `Crown` + `emerald-100` in MemberRoleBadge | 3 matches |
| `Adicionar aluno existente` + `Convidar novo aluno` in InstitutionManager | 2 matches |
| `institution_id: institution.id` in InstitutionManager | 1 match |
| `, 250)` (debounce) in InstitutionManager | 1 match |
| D-08 detach body in DetachMemberButton | 1 match |
| `in result.data` (B-1 narrowing) in InstitutionManager | 1 match (line 119) |
| `result.message ??` broken pattern | 0 matches |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Detail page select listed contact_phone**

- **Found during:** Task 1 (writing [slug]/page.tsx)
- **Issue:** The plan snippet's select was `"id, slug, name, contact_email, contact_phone, created_at, updated_at"`, but the institutions table (migration 0013) has no contact_phone column. `InstitutionRow` types confirm. Selecting a missing column would fail at runtime / break typing because the row would carry no contact_phone.
- **Fix:** Removed contact_phone from the select; aligned to the schema reality consistent with prior 05-03/05-05 decisions (see those summaries for the full backstory). Inline comment added in the file.
- **Files modified:** `src/app/admin/instituicoes/[slug]/page.tsx`
- **Commit:** 7fb243e

**2. [Rule 1 - Bug] PromoteManagerButton destructured an unused prop**

- **Found during:** Task 2 lint pass
- **Issue:** The plan snippet destructured `institutionName` but never referenced it. With `--max-warnings=0`, `@typescript-eslint/no-unused-vars` fails the build.
- **Fix:** Kept `institutionName` in the `Props` interface (so the call site in InstitutionManager keeps passing it — preserves the planner's API for future use), but dropped it from the destructure inside the function body.
- **Files modified:** `src/app/admin/instituicoes/promote-manager-button.tsx`
- **Commit:** 8ca5e36

**3. [Rule 1 - Bug] handleInvite catch identifier was unused**

- **Found during:** Task 2 lint pass
- **Issue:** The plan snippet wrote `catch (err) {}` without using `err`; lint flags unused catch params under the strict policy.
- **Fix:** Switched to bare-binding `catch {}` (TypeScript 4.0+ feature; ESLint compatible).
- **Files modified:** `src/app/admin/instituicoes/institution-manager.tsx`
- **Commit:** 8ca5e36

**4. [Rule 1 - Bug] members.role narrowing in detail page**

- **Found during:** Task 1 (writing [slug]/page.tsx)
- **Issue:** The Supabase JOIN row gives `role: string` (DB-level CHECK constraint, but no enum). The plan snippet cast with `m.role as "student" | "manager"`, which works but is unsafe for unexpected DB values.
- **Fix:** Replaced the cast with a guarded narrowing: `m.role === "manager" ? "manager" : "student"`. Same outcome for valid data, defensive for invalid data.
- **Files modified:** `src/app/admin/instituicoes/[slug]/page.tsx`
- **Commit:** 7fb243e

### Plan ambiguities resolved

**Task 1 verify command can't pass standalone.** The plan's Task 1 verify ran `npm run typecheck` after writing only the RSC pages — but `[slug]/page.tsx` imports `InstitutionManager` from `../institution-manager` which was scheduled for Task 2. Per Rule 3 (auto-fix blocking), I committed Task 1 files anyway and ran the full verify suite after Task 2 — typecheck/lint/test/build all green. Documenting here because the plan as-written would have produced a transient "missing import" that anyone reading the commit history might wonder about.

**Form retains `contact_phone` field with no DB column.** The plan listed `contact_phone` in the must_haves (the form has the field), but the schema/action/types don't accept the column. The form input therefore *renders* but its value is silently ignored on submit. Kept the field per the plan instruction (form-shape forward compatibility for a future migration); zero side effects since `state.fieldErrors?.contact_phone` is always undefined and the action never reads `formData.get("contact_phone")`.

## Authentication Gates

None — admin user is the operator; middleware (`/admin` ring) plus the per-page 3-step auth gate already cover.

## Threat Flags

None — surface introduced in this plan is fully covered by the plan's `<threat_model>` (T-05-07-01 through T-05-07-07). Search query parameterization, admin-only server-action gates, debounce, and bearer-token forwarding are all already in the inherited callees.

## Self-Check: PASSED

**File existence:**
- ✓ `src/app/admin/instituicoes/page.tsx`
- ✓ `src/app/admin/instituicoes/nova/page.tsx`
- ✓ `src/app/admin/instituicoes/nova/new-institution-form.tsx`
- ✓ `src/app/admin/instituicoes/[slug]/page.tsx`
- ✓ `src/app/admin/instituicoes/institution-manager.tsx`
- ✓ `src/app/admin/instituicoes/promote-manager-button.tsx`
- ✓ `src/app/admin/instituicoes/detach-member-button.tsx`
- ✓ `src/components/admin/member-role-badge.tsx`

**Commits in `git log`:**
- ✓ 7fb243e — feat(05-07): add admin instituicoes RSC pages + MemberRoleBadge
- ✓ 8ca5e36 — feat(05-07): add admin instituicoes client components

**Plan-level `<verification>` checklist:**
- [x] All 8 files exist
- [x] `npm run typecheck` exits 0
- [x] `npm run lint` exits 0
- [x] `npm run test:ci` exits 0
- [x] `npm run build` exits 0
- [ ] Manual smoke (UAT in 05-09) — out of scope for this plan

## Plan unblocks

**Plan 05-09 (UAT)** — the smoke checklist requires the admin operator UI in this plan to drive the end-to-end B2B journey (create institution → invite student with pt-BR institutional email → promote a member to gestor → /gestor login flows). Everything is now wired.
