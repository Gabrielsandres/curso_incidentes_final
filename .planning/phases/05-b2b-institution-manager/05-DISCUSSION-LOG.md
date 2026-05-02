# Phase 5: B2B Institution Manager — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 05-b2b-institution-manager
**Areas discussed:** Manager role model + URL, Admin UI for institutions, Invite flow + pt-BR template (EMAIL-03), Manager dashboard data shape

---

## Manager role model + URL

### Q1: How should 'institution_manager' be represented for middleware gating + RLS?

| Option | Description | Selected |
|--------|-------------|----------|
| Global role only (profiles.role) | Set profiles.role='institution_manager' when admin assigns. Middleware checks this. RLS uses is_member_of_institution() to scope. Simplest. One global role per user. | |
| Both layers | profiles.role='institution_manager' (middleware gate) + institution_members.role='manager' (which institution). | ✓ |
| Local role only | Don't touch profiles.role. Middleware queries institution_members for any 'manager' row. Most flexible but every middleware request does a JOIN. | |

**User's choice:** Both layers (Recommended)
**Notes:** Codified as D-01.

---

### Q2: URL shape for the manager dashboard?

| Option | Description | Selected |
|--------|-------------|----------|
| /gestor (singular, no slug) | One manager = one institution today. Simpler. | ✓ |
| /gestor/[slug] (per roadmap literal) | Per roadmap criterion 2 wording. More work for one-institution-today reality. | |
| /gestor with optional /gestor/[slug] | Most flexible but adds an extra page for v1. | |

**User's choice:** /gestor singular (Recommended)
**Notes:** Captured as D-03. Roadmap criterion 2 says /gestor/[slug] — explicit deviation documented.

---

### Q3: Roadmap criterion 2 reconciliation?

| Option | Description | Selected |
|--------|-------------|----------|
| Document deviation in CONTEXT.md only | Note in CONTEXT.md that we deliberately chose /gestor (no slug) and why. Roadmap stays untouched. | ✓ |
| Update ROADMAP.md to /gestor | Edit phase 5 success criterion 2. Cleaner end-state. | |

**User's choice:** Document deviation in CONTEXT.md only

---

### Q4: Edge cases — orphaned manager + admin access to /gestor?

| Option | Description | Selected |
|--------|-------------|----------|
| Orphan → /dashboard, admins → blocked from /gestor | Orphan redirected with flash. Admins use /admin/instituicoes/[slug] for the same data. | ✓ |
| Orphan → empty state, admins → /admin redirect | Orphan stays on /gestor with 'not configured' state. Admins bounced to /admin. | |
| Orphan → logout error, admins → unrestricted /gestor | Orphan logged out (fail loud). Admins browse any /gestor view. | |

**User's choice:** Orphan → /dashboard with flash; admins blocked from /gestor (Recommended)
**Notes:** Captured as D-02.

---

## Admin UI for institutions

### Q1: Where does the admin manage institutions?

| Option | Description | Selected |
|--------|-------------|----------|
| New /admin/instituicoes section | Mirrors /admin/cursos pattern: list + detail [slug]. Cleanest separation. | ✓ |
| Inline panel on /admin/usuarios | Compact but crowds the page fast. | |
| Hybrid: /admin/instituicoes + attach via /admin/usuarios | Splits the workflow; more clicks. | |

**User's choice:** New /admin/instituicoes section (Recommended)
**Notes:** Captured as D-05.

---

### Q2: Attach student UX on detail page?

| Option | Description | Selected |
|--------|-------------|----------|
| Search-and-add from existing students | Auto-complete profiles where role='student'. Mirrors grant-enrollment. | ✓ |
| Invite-by-email directly | Combines invite + attach into one form. Edge cases tricky (email exists?). | |
| Both: search existing + invite-new same page | Two sections on detail page. Most surface area but flexible. | |

**User's choice:** Search-and-add from existing students (Recommended) — but invite flow on same page surfaced in Area 3.
**Notes:** Captured as D-06. Combined with the EMAIL-03 area decisions, the detail page actually has BOTH surfaces (search-existing + invite-new), with invite-new being its own form per Area 3 Q2.

---

### Q3: Manager assignment surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-row 'Promover a gestor' button | Each member row has the action. Auto-demotes previous manager. | ✓ |
| Manager dropdown on institution settings | Selector at top. Less obvious than per-row action. | |
| Separate 'Gerenciar gestores' page | More clicks for what is essentially a single field. | |

**User's choice:** Per-row 'Promover a gestor' button (Recommended)
**Notes:** Captured as D-07.

---

### Q4: Attach + course enrollment coupling?

| Option | Description | Selected |
|--------|-------------|----------|
| Independent — separate flows | Attach inserts institution_members only. Enrollment via /admin/cursos/[slug]. | ✓ |
| Auto-enroll via institution package | Each institution has default courses. Auto-grants. Adds 'package' concept. | |
| Prompt at attach time — admin picks courses | One step covers both. Coupling questions arise. | |

**User's choice:** Independent (Recommended)
**Notes:** Captured as D-08.

---

### Q5: Detach behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft — delete institution_members row, keep enrollments + progress + certificates | Aligned with CERT-05 spirit. Manager loses visibility immediately via RLS. | ✓ |
| Hard — delete membership + revoke active enrollments | Cleaner 'leave institution' but destructive. | |
| Confirm dialog with admin choosing | Most flexible, most clicks. | |

**User's choice:** Soft (Recommended)
**Notes:** Captured as D-08.

---

## Invite flow + pt-BR template (EMAIL-03)

### Q1: Email delivery path?

| Option | Description | Selected |
|--------|-------------|----------|
| Customize Supabase template + institution_name metadata | Edge Function passes institution_name in user_metadata. Template in Supabase panel uses {{ .Data.institution_name }}. No new infra. Unblocks Phase 5 from EMAIL-01/02. | ✓ |
| Application-level via Resend SDK with custom HTML | Maximum control + template in repo. Blocked on EMAIL-01/02 (domain). | |
| Two-template hybrid: Resend B2B + Supabase B2C | Same blocker as Resend option. | |

**User's choice:** Customize Supabase template + institution_name metadata (Recommended)
**Notes:** Captured as D-09. Trade-off: template lives in Supabase panel, not in repo (mitigated by D-10).

---

### Q2: Invite trigger point in admin UI?

| Option | Description | Selected |
|--------|-------------|----------|
| On institution detail page — 'Convidar novo aluno' form | Second surface on the same page. Institution context locked. | ✓ |
| Reuse existing /admin/usuarios + post-attach | Invite is generic at the time of sending. | |
| Both surfaces — institution detail with context, /admin/usuarios for B2C | Two distinct paths. | |

**User's choice:** On institution detail page (Recommended)
**Notes:** Captured as D-06 (combined with the search-existing surface) and D-11.

---

### Q3: If invite email already exists?

| Option | Description | Selected |
|--------|-------------|----------|
| Block with clear error — admin must use 'Adicionar aluno existente' | Predictable, no surprise mutations. | ✓ |
| Auto-attach + send notification | One-step UX but silent affiliation change. | |
| Prompt admin: 'Email exists. Add to institution?' | Most explicit. More clicks. | |

**User's choice:** Block with clear error (Recommended)
**Notes:** Captured as D-06 + D-11 pre-flight check.

---

### Q4: Where does the pt-BR template text live?

| Option | Description | Selected |
|--------|-------------|----------|
| docs/email-templates.md with copy-pasteable HTML/text | Single doc with preview, variables, panel update steps. | ✓ |
| Code constant + doc that references it | Drift risk between panel and code unless an explicit comparison test runs. | |
| Skip docs, include in SUMMARY only | Discoverability suffers. | |

**User's choice:** docs/email-templates.md (Recommended)
**Notes:** Captured as D-10.

---

## Manager dashboard data shape

### Q1: Dashboard layout?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-student rows + course columns matrix | rows=students, cols=courses, cell=% completion. Matches INST-07 phrasing. | ✓ |
| Grouped by course — sections per course with student lists | Useful for course-adoption tracking. Worse for tracking specific employees. | |
| Per-student detail page (list + drill-down) | More clicks; overkill for v1. | |

**User's choice:** Per-student × course matrix (Recommended)
**Notes:** Captured as D-12.

---

### Q2: Where do certificates appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate section below progress matrix | Compact, scannable. | ✓ |
| Inline badge in matrix cell | Cells get noisy. | |
| Per-student expandable row | Adds interaction layer, mostly unnecessary. | |

**User's choice:** Separate section below the matrix (Recommended)
**Notes:** Captured as D-12.

---

### Q3: Certificate code as link to public verification?

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text only — no public verification page in v1 | New /verificar/[code] would be new scope. Code copyable. | ✓ |
| Build /verificar/[code] this phase | Expands Phase 5 noticeably. | |
| Plain text + 'Copiar código' button | Tiny effort but no public page. | |

**User's choice:** Plain text only (Recommended)
**Notes:** Captured as D-15. Public verification page captured as deferred idea.

---

### Q4: Empty states?

| Option | Description | Selected |
|--------|-------------|----------|
| Progressive empty states with admin contact CTA | 0 students / 0 enrollments / 0 certs each have specific copy. | ✓ |
| Single 'No data yet' empty state | Less helpful — manager can't tell which condition is true. | |
| Hide empty sections entirely | Manager might think page is broken. | |

**User's choice:** Progressive empty states (Recommended)
**Notes:** Captured as D-13.

---

### Q5: Show inactive students (expired enrollments)?

| Option | Description | Selected |
|--------|-------------|----------|
| Show all members; mark expired enrollments visually | Manager keeps historical visibility. Aligns with ENR-04. Requires admin client OR query bypass. | ✓ |
| Hide expired enrollments | Cleaner; matches RLS default; loses historical visibility. | |
| Toggle 'Mostrar expirados' | Best of both; UI complexity for v1. | |

**User's choice:** Show all members + visual mark (Recommended)
**Notes:** Captured as D-12. Admin-client bypass approach chosen with documented justification.

---

## Claude's Discretion

Items the user explicitly left to Claude/planner:

- Componentização exata da matriz (table vs grid CSS)
- Estrutura interna do `institution-manager.tsx` client component
- Atomicidade de `promoteInstitutionManagerAction` (single vs split)
- Schema Zod exato para input do convite institucional
- Lógica de detecção do "único gestor global" no demote

## Deferred Ideas

Captured during the discussion:

- /verificar/[code] public verification page (v2)
- /gestor/[slug] for multi-institution managers (v2)
- B2B-V2-01/02/03 (CSV bulk invite, gestor self-invite, PDF/Excel report) — confirmed out-of-scope
- Auto-template-drift test (panel vs repo string compare) (v2)
- Resend SDK wrapper (still deferred from Phase 1 D-12 — EMAIL-03 path doesn't need it)
- Toggle 'Mostrar expirados' (UI complexity not justified for v1)
- Manager certificate PDF preview/audit (v2 if demand surfaces)
- Course-completion notifications to manager (blocked on EMAIL-01/02)
