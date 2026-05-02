---
phase: 5
slug: b2b-institution-manager
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-02
---

# Phase 5 — UI Design Contract

> Visual and interaction contract for the B2B Institution Manager phase. Brownfield extension of the existing Tailwind v4 design language used in `/admin/cursos`, `/admin/usuarios` and `/dashboard`. **No redesign in v1** — every token below is harvested from production code, not invented.

> **Two surfaces, two tones:**
> - **`/admin/instituicoes` (list / `nova` / `[slug]`)** — mirrors `/admin/cursos` exactly: data-dense, formal, business tone, breadcrumbs, sky-600 primary action.
> - **`/gestor` (singular, no slug — D-03)** — mirrors `/dashboard`: welcoming greeting header, single column of cards, but addresses a *manager* tracking a team, not a student tracking themselves.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (no `components.json`; brownfield Tailwind v4) |
| Preset | not applicable |
| Component library | none — raw Tailwind utility classes following project convention |
| Icon library | `lucide-react` (already in dependencies; `Building2`, `Users`, `UserPlus`, `Search`, `Crown`, `ArrowDownCircle`, `AlertCircle`, `CheckCircle2`, `Loader2`, `X`, `MoreHorizontal`, `ExternalLink`, `Mail`, `Phone`) |
| Font | Project default (Tailwind base, system stack via `font-sans`); same as `/admin/cursos` and `/dashboard` |
| CSS variables | `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, `--radius`, `--shadow-soft/medium/strong` already defined globally — reuse, do not redefine |
| Reused patterns | `Breadcrumb` (`@/components/admin/breadcrumb`), `ConfirmationDialog` (`@/components/admin/confirmation-dialog`), `LogoutButton` (`@/components/auth/logout-button`), `StatusBadge` shape (NEW: `MemberRoleBadge` follows the same pill rules — see §Components) |

---

## Spacing Scale

Declared values (multiples of 4 only, harvested from existing admin/dashboard pages):

| Token | Tailwind | Value | Usage |
|-------|----------|-------|-------|
| xs | `gap-1` / `p-1` | 4px | Inline icon gaps inside buttons / breadcrumb chevrons |
| sm | `gap-2` / `p-2` / `py-2` | 8px | Compact element spacing inside cards, button vertical padding |
| md | `gap-4` / `p-4` / `px-4` | 16px | Default card internal spacing, button horizontal padding, table cell padding |
| lg | `gap-6` / `p-6` | 24px | Card padding (`rounded-2xl … p-6`), section header padding |
| xl | `gap-8` / `py-8` | 32px | Layout gaps between major sections on `/gestor` |
| 2xl | `py-10` / `py-12` | 40-48px | Page main padding (`py-10` for admin, `py-12` for /gestor — matches existing `/dashboard`) |

**Container width:** `max-w-6xl` (matches all existing admin + dashboard pages). NEVER widen for the matrix table — overflow handled by horizontal scroll, see §Layout.

**Icon target sizes:** `size={14}` for inline (breadcrumb chevron, list metadata icons), `size={16}` (h-4 w-4) for button icons, `size={32}` for empty-state hero icons. **No 44px touch-target exception** — desktop-first audience (school administrators on laptops).

**Exceptions:** Table row vertical padding is `py-3` (12px) not 16px — tighter than card padding to keep matrix rows scannable when rendering 5–30 students. This matches the existing course-list `space-y-3` rhythm.

---

## Typography

Sizes harvested from existing admin/dashboard. **3 sizes, 2 weights** (within budget):

| Role | Tailwind | Size | Weight | Line Height |
|------|----------|------|--------|-------------|
| Body | `text-sm` | 14px | 400 (regular) / 500 (`font-medium`) for emphasis | 1.5 (`leading-normal` default; `leading-relaxed` for paragraph copy in dialogs) |
| Label / Eyebrow | `text-xs font-semibold uppercase tracking-[0.2em]` | 12px | 600 (semibold) | 1.5 |
| H1 / Page title | `text-2xl font-semibold` | 24px | 600 | 1.2 (`leading-tight`) |
| H2 / Section title | `text-xl font-semibold` | 20px | 600 | 1.2 |

**Notes:**
- `text-xs` (12px) is also used for table metadata, captions, and `text-slate-500` helper hints — **same size as eyebrow** but without the uppercase/tracking treatment. Total *sizes* declared: 12px, 14px, 20px, 24px = 4 sizes (within the 3–4 budget).
- `text-base` (16px) is reserved for the global header brand label (`Gestão de Incidentes`) and the first-line of empty-state hero text, mirroring existing `/admin/cursos` header.
- **Monospace exception (D-15):** the `certificate_code` UUID renders as `font-mono text-xs text-slate-700 select-all`. `select-all` enables one-click copy by the gestor. This is the single intentional deviation from the regular body face.
- **Rule:** never introduce a new size without removing one — this contract is a strict cap.

---

## Color

Color contract follows the existing slate-on-sky palette. The 60/30/10 split is **enforced** by referencing only these tokens:

| Role | Tailwind class | Resolved | Usage |
|------|----------------|----------|-------|
| Dominant (60%) | `bg-slate-50` | `#f8fafc` | Page background (`min-h-screen bg-slate-50`) — admin + /gestor identical |
| Secondary (30%) | `bg-white` | `#ffffff` | All cards, header bar, table surface, dialog body |
| Accent (10%) | `bg-sky-600` (hover `bg-sky-700`); text `text-white` | `#0284c7` / `#0369a1` | Primary CTAs ONLY — see Reserved-for list below |
| Destructive | `bg-red-600` (hover `bg-red-700`); text `text-white`; subtle `bg-red-50 border-red-200 text-red-700` | `#dc2626` | Destructive confirmations and inline error banners only |
| Success | `bg-emerald-50 border-emerald-200 text-emerald-700` (subtle); `bg-emerald-100 text-emerald-700` (badge) | `#10b981` family | Toast / inline success after a mutation; "manager" role badge |
| Warning / Expired | `bg-amber-50 border-amber-200 text-amber-700` (banner); `bg-slate-100 text-slate-500 line-through-decoration-none` (cell) | `#f59e0b` family + slate | Expired enrollment indicator (see §Matrix) |

### Accent reserved for (this is the entire list — no exceptions)

1. **Primary submit / save buttons** in admin forms: `Criar instituição`, `Salvar`, `Cadastrar usuário`, `Adicionar aluno`, `Convidar novo aluno`
2. **Page-level entry CTAs** in admin lists: `Nova instituição` (top-right of `/admin/instituicoes`), `Promover a gestor` (per-row primary action when no manager set)
3. **Single header anchor** on `/gestor`: the institution name in the hero card (uses `text-slate-900` not sky — accent is the BUTTON treatment, not heading color)
4. **Selection state** in autocomplete results: selected row gets `bg-sky-50 text-sky-900`
5. **Focus ring** on all inputs and buttons: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500` and `focus:border-sky-500 focus:ring-2 focus:ring-sky-100` for inputs

### Accent NOT used for

- Body links (use `hover:text-slate-900 transition` on `text-slate-500` — Breadcrumb pattern)
- Navigation links between admin sections (use `border border-slate-300 bg-white text-slate-700`)
- Status badges (each role has its own subtle palette — see §Badges)
- Member-row default state (white card; only the "Promover a gestor" button is sky)

### Role badges (semantic, NOT accent)

| State | Tailwind |
|-------|----------|
| Manager (current) | `inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold` + `Crown` icon size 12 |
| Student (member) | `inline-flex rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 text-xs font-medium` |
| Expired enrollment | `inline-flex rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide` with content "Expirado" |
| Course active | (no badge — implicit white background) |

### Decision: expired enrollment visual treatment (gray-area question resolved)

In the per-student × per-course matrix cell, an expired enrollment renders as:

```
text-slate-400 (the percentage and "X/Y aulas" line)
+ a small "Expirado" pill (the table above) inline below the percentage
+ NO strike-through (line-through harms readability for percentages)
+ NO icon (the pill carries the semantic — adds clarity without clutter)
```

Rationale: ENR-04 keeps history visible. Strike-through plus pill plus icon would over-design; gray text + pill is the existing project's idiom (see `course-archive-button` opacity-60 treatment for the same "preserved but inactive" semantic).

---

## Copywriting Contract

All copy in pt-BR, formal-but-warm tone, matching existing `/admin` (formal/business) for the admin pages and `/dashboard` (welcoming, action-oriented) for `/gestor`. **Never invent terminology** — `gestor`, `instituição`, `aluno`, `convite`, `vinculado` are the locked nouns/verbs from CONTEXT.md.

### Global

| Element | Copy |
|---------|------|
| Page title (browser tab) — list | `Instituições | Admin — Gestão de Incidentes` |
| Page title — create | `Nova instituição | Admin — Gestão de Incidentes` |
| Page title — detail | `{nome da instituição} | Admin — Gestão de Incidentes` |
| Page title — gestor | `Painel da instituição | Gestão de Incidentes` |
| Header brand (admin) | `Gestão de Incidentes · Área restrita (admin)` (existing pattern) |
| Header brand (/gestor) | `Gestão de Incidentes` + sub `Painel da instituição · Olá, {nome do gestor}` |
| Primary CTA (list page) | `Nova instituição` |
| Primary CTA (create form) | `Criar instituição` (pending: `Criando…`) |
| Primary CTA (member add — existing) | `Adicionar aluno` (pending: `Adicionando…`) |
| Primary CTA (member add — invite) | `Convidar novo aluno` (pending: `Enviando convite…`) |
| Primary CTA (promote) | `Promover a gestor` (pending: `Promovendo…`) |
| Inverse CTA (demote) | `Rebaixar a aluno` (pending: `Rebaixando…`) |
| Destructive CTA (detach) | `Desvincular aluno` (pending: `Desvinculando…`) |

### Admin — list page (`/admin/instituicoes`)

| Element | Copy |
|---------|------|
| Eyebrow | `INSTITUIÇÕES` |
| H1 | `Instituições contratantes` |
| Subtitle | `Gerencie instituições B2B, vincule alunos e atribua um gestor por instituição.` |
| Stats line (when data exists) | `{N} instituições · {M} alunos vinculados · {K} com gestor atribuído` |
| Table column: Nome | `Instituição` |
| Table column: Slug | `Slug` |
| Table column: Membros | `Alunos` |
| Table column: Gestor | `Gestor` |
| Table column: Criada em | `Criada em` |
| Per-row action | `Editar` (link to `/admin/instituicoes/[slug]`) |

### Admin — create page (`/admin/instituicoes/nova`)

| Element | Copy |
|---------|------|
| Eyebrow | `INSTITUIÇÕES` |
| H1 | `Nova instituição` |
| Field label: Nome | `Nome da instituição *` |
| Field placeholder | `Ex.: Colégio Marista` |
| Field label: Slug | `Slug *` |
| Field hint | `Use apenas letras minúsculas, números e hífens. Será gerado automaticamente a partir do nome — você pode editar antes de salvar.` |
| Field label: Email comercial | `Email do contato comercial` |
| Field hint | `Email do contato comercial na instituição (não é o gestor da plataforma).` |
| Field label: Telefone | `Telefone (opcional)` |
| Submit | `Criar instituição` |
| Cancel link | `Cancelar` (volta para `/admin/instituicoes`) |

### Admin — detail page (`/admin/instituicoes/[slug]`)

| Element | Copy |
|---------|------|
| Section eyebrow (members) | `MEMBROS` |
| Section H2 (members) | `Alunos vinculados` |
| Section subtitle | `Adicione alunos existentes ou convide novos para vincular à instituição. Vincular aqui não matricula em cursos — matrículas são feitas em **Catálogo > Curso > Alunos**.` |
| Add-existing tab label | `Adicionar aluno existente` |
| Add-existing search placeholder | `Buscar por nome ou email…` |
| Add-existing empty (no query) | `Comece a digitar o nome ou email do aluno.` |
| Add-existing empty (no results) | `Nenhum aluno encontrado com esse termo. Talvez seja preciso convidá-lo abaixo.` |
| Invite tab label | `Convidar novo aluno` |
| Invite hint | `Enviaremos um email de convite mencionando **{nome da instituição}**. O aluno define a própria senha ao aceitar.` |
| Members empty state | `Nenhum aluno vinculado ainda.` + `Use os formulários acima para adicionar alunos existentes ou convidar novos.` |
| Per-row promote action | `Promover a gestor` |
| Per-row demote action | `Rebaixar a aluno` |
| Per-row detach action | `Desvincular` |
| Toast — promote success | `{Nome} agora é gestor de {nome da instituição}.{ Pause } {Nome anterior} foi rebaixado(a) a aluno.` (the second sentence is rendered inline only when an auto-demote actually happened — D-07, see §Toasts) |
| Toast — demote success | `{Nome} foi rebaixado(a) a aluno.` |
| Toast — attach success | `{Nome} foi vinculado(a) a {nome da instituição}.` |
| Toast — invite success | `Convite enviado para {email} da instituição {nome da instituição}.` |
| Toast — detach success | `{Nome} foi desvinculado(a) da instituição.` |

### Empty states (progressive — D-13)

| State | Heading | Body |
|-------|---------|------|
| `/gestor` — 0 alunos vinculados | `Nenhum aluno vinculado ainda` | `Para vincular sua equipe à plataforma, entre em contato com a MDHE Consultoria.` + contact card (see §MDHE contact card) |
| `/gestor` — >0 alunos, 0 enrollments | `Sua equipe ainda não tem acesso a nenhum curso` | `Aguarde a MDHE liberar o acesso aos cursos contratados. Você verá o progresso da equipe aqui assim que as matrículas forem realizadas.` |
| `/gestor` — >0 enrollments, 0 certificates (cert section only) | `Nenhum certificado emitido ainda` | `Certificados aparecem aqui quando seus alunos concluírem 100% das aulas de um curso.` |
| `/admin/instituicoes` — 0 institutions | `Nenhuma instituição cadastrada` | `Crie a primeira instituição para começar a vincular alunos B2B.` + `Nova instituição` button |

### MDHE contact card (used inside `/gestor` 0-students empty state, D-13 + specifics §)

Renders inline in the empty-state card:

```
Email:     contato@mdhe.com.br             ← mailto link, text-sky-700 hover:text-sky-800
WhatsApp:  (61) 99999-9999                  ← https://wa.me/55619999XXXX link
```

Both rows use a `Mail` / `Phone` icon (lucide, size 14, `text-slate-400`) inline. **TODO for planner:** confirm the exact MDHE email and WhatsApp number with the project owner before merging — placeholder values OK in scaffolding but the final values come from PROJECT.md context (MDHE Consultoria) and may need a client check.

### Manager dashboard (`/gestor`)

| Element | Copy |
|---------|------|
| Eyebrow (hero card) | `INSTITUIÇÃO` |
| H1 (hero card) | `{nome da instituição}` |
| Hero subtitle | `{N} alunos vinculados · {M} cursos com matrículas` |
| Section eyebrow (matrix) | `EQUIPE` |
| Section H2 (matrix) | `Progresso da equipe` |
| Section subtitle | `Acompanhe o progresso de cada aluno por curso. Matrículas expiradas aparecem em cinza com o histórico preservado.` |
| Matrix column: aluno | `Aluno` |
| Matrix column: course header | course title (slug-safe truncate at ~20 chars with `title` attribute for full name on hover) |
| Matrix cell — no enrollment | `—` (em-dash, `text-slate-300`) |
| Matrix cell — active progress | `{percent}% · {completed}/{total} aulas` (em duas linhas: percent em cima, contagem em `text-xs text-slate-500` embaixo) |
| Matrix cell — expired | same as above but `text-slate-400` + `Expirado` pill below |
| Section eyebrow (certs) | `CERTIFICADOS` |
| Section H2 (certs) | `Certificados emitidos` |
| Section subtitle | `Lista de certificados gerados para alunos da sua equipe.` |
| Certs column: Aluno | `Aluno` |
| Certs column: Curso | `Curso` |
| Certs column: Data | `Data de emissão` |
| Certs column: Código | `Código` |
| Certs cell — code | `{uuid}` rendered in `font-mono text-xs text-slate-700 select-all` (D-15: no link, no download — copyable plain text) |

### Error states

| Element | Copy |
|---------|------|
| Form field validation generic | `Revise os dados informados.` (top-of-form banner; mirrors `user-manager.tsx` and `create-lesson` schema convention) |
| Email already exists (D-06) | `Esse email já está cadastrado em outra conta. Use **Adicionar aluno existente** acima ou peça ao admin para reenviar o convite.` |
| Invite Edge Function failure | `Não foi possível enviar o convite. Tente novamente em alguns instantes.` |
| Promote action failure | `Não foi possível promover o aluno a gestor. Atualize a página e tente novamente.` |
| Demote action failure | `Não foi possível rebaixar o gestor. Atualize a página e tente novamente.` |
| /gestor manager órfão (D-02 — flash on /dashboard after redirect) | `Sua instituição ainda não foi configurada. Entre em contato com a MDHE.` |
| /gestor query failed | `Não foi possível carregar os dados da sua instituição. Atualize a página em alguns instantes.` |

### Destructive confirmations (use `ConfirmationDialog` from `@/components/admin/confirmation-dialog`)

| Action | title | body | confirmLabel |
|--------|-------|------|--------------|
| Promote (only when another manager exists) | `Promover {Nome} a gestor?` | `{Nome anterior} será automaticamente rebaixado(a) a aluno. Apenas um gestor por instituição é permitido. Esta ação pode ser revertida depois.` | `Promover` |
| Demote | `Rebaixar {Nome} a aluno?` | `{Nome} perderá acesso ao painel `/gestor`. O histórico de progresso e os certificados da equipe permanecem.` | `Rebaixar` |
| Detach member | `Desvincular {Nome} da instituição?` | `O aluno mantém o histórico de progresso e os certificados emitidos. Apenas o vínculo com a instituição é removido.` | `Desvincular` |
| Promote (no prior manager) | NO dialog — direct submit (lower friction, no destructive side-effect to surface) | — | — |

**Rule:** confirmation only when the action has an irreversible-feeling side-effect (auto-demote, removal). Plain promote without a prior manager goes straight through — matches existing `course-archive-button` philosophy.

---

## Layout

### Admin pages (`/admin/instituicoes/*`)

Replicate the exact frame used by `/admin/cursos`:

```
<div className="flex min-h-screen flex-col bg-slate-50">
  <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
      <span className="text-base font-semibold text-slate-900">
        Gestão de Incidentes · <span className="font-normal text-slate-500">Área restrita (admin)</span>
      </span>
      <LogoutButton />
    </div>
  </header>
  <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
    <Breadcrumb items={…} />
    <Eyebrow + H1 + subtitle block />
    <Primary CTA row (only on list page) />
    <Content cards (rounded-2xl border border-slate-200 bg-white p-6) />
  </main>
</div>
```

**Add to top admin nav (D-05):** the existing `/dashboard` admin section block (`role === 'admin'`, `Cadastrar nova aula` card) gets a third quick-link button `Gerenciar instituições` next to `Gerenciar cursos` and `Cadastrar usuario`. Same pill style (`border border-slate-300 bg-white text-slate-700`).

### Manager dashboard (`/gestor`)

Replicate the frame used by `/dashboard`, but with a single hero card (institution context) instead of the welcome+overall-progress pair:

```
<div className="flex min-h-screen flex-col bg-slate-50">
  <header … same shape … >
    <div className="flex flex-col">
      <span className="text-base font-semibold text-slate-900">Gestão de Incidentes</span>
      <span className="text-xs text-slate-500">Painel da instituição · Olá, {nome do gestor}</span>
    </div>
    <LogoutButton />
  </header>
  <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Hero — institution name + member/course counts */}
    </section>
    <section className="space-y-4">
      {/* Matrix (Equipe) */}
    </section>
    <section className="space-y-4">
      {/* Certificados emitidos */}
    </section>
  </main>
</div>
```

### Matrix table

**Decision: HTML `<table>`** (not CSS grid). Reasons:
1. Native semantics for assistive tech ("Aluno X, Curso Y, 85%").
2. `<th scope="col">` and `<th scope="row">` give automatic column/row association without ARIA gymnastics.
3. Sticky first column is one CSS line; in CSS grid it is fragile.

```jsx
<div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
  <table className="w-full min-w-[640px] text-sm">
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50">
        <th scope="col" className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Aluno
        </th>
        {courses.map(c => (
          <th key={c.id} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <span title={c.title} className="block max-w-[160px] truncate">{c.title}</span>
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {students.map(s => (
        <tr key={s.id} className="border-b border-slate-100 last:border-b-0">
          <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900">
            {s.full_name}
          </th>
          {courses.map(c => <ProgressCell student={s} course={c} />)}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Mobile / narrow-viewport behavior (gray-area question resolved):**
- Wrapper has `overflow-x-auto` and the table has `min-w-[640px]`. On narrow viewports the table scrolls horizontally; the first column (`Aluno` / student name) is sticky via `sticky left-0` so the gestor never loses the row context while scanning.
- **NOT** stacking to per-student cards on mobile. Reason: the *manager persona* is desktop-first (school admin auditing a roster on a laptop). Stacking would hide the cross-course comparison which is the entire point of the matrix. Mobile users get a known-trade-off horizontal scroll that mirrors any data table convention.
- **TODO downstream:** if usage telemetry later shows >40% mobile traffic on `/gestor`, revisit and add a `lg:` breakpoint that switches to cards. v2.

**Cell content shape (single cell):**

```
Active enrollment, has progress:
┌─────────────────────┐
│ 85%                 │   text-sm font-semibold text-slate-900
│ 17/20 aulas         │   text-xs text-slate-500
└─────────────────────┘

Active enrollment, 0 progress:
┌─────────────────────┐
│ 0%                  │
│ 0/20 aulas          │
└─────────────────────┘

100% complete:
┌─────────────────────┐
│ 100%                │   text-sm font-semibold text-emerald-700
│ 20/20 aulas         │   text-xs text-slate-500
└─────────────────────┘

Expired enrollment:
┌─────────────────────┐
│ 85%                 │   text-sm text-slate-400  (NOT semibold; muted)
│ 17/20 aulas         │   text-xs text-slate-400
│ [Expirado]          │   inline pill, see §Color
└─────────────────────┘

No enrollment in this course:
┌─────────────────────┐
│ —                   │   text-slate-300 text-center
└─────────────────────┘
```

### Certificates section (below matrix)

Plain table (no sticky columns — fewer columns, less data per row). Same `rounded-2xl border bg-white` wrapper. Columns: `Aluno` · `Curso` · `Data de emissão` · `Código`. Sorted by `issued_at DESC`. No row actions (D-15: read-only metadata).

---

## Components

New components introduced by this phase. All file paths absolute under `src/`. Each one mirrors an existing pattern noted in CONTEXT.md `code_context`.

| Component | Path | Mirror | Notes |
|-----------|------|--------|-------|
| `InstitutionManager` (client) | `src/app/admin/instituicoes/institution-manager.tsx` | `course-manager.tsx` (form pattern) + `user-manager.tsx` (invite pattern) | Holds the add-existing search + invite form state; uses `useActionState` |
| `MemberRow` (client) | inside `institution-manager.tsx` | `course-list` rows in `/admin/cursos/page.tsx` | Renders avatar-less row: name, email, role badge, action buttons |
| `MemberRoleBadge` | `src/components/admin/member-role-badge.tsx` | `StatusBadge` (same pill shape) | `manager` (emerald) / `student` (slate); imports `Crown` from lucide |
| `PromoteManagerButton` (client) | inside `institution-manager.tsx` | `course-archive-button.tsx` | Wraps `useTransition` + opens `ConfirmationDialog` only when prior manager exists |
| `MemberSearchAutocomplete` (client) | inside `institution-manager.tsx` | `grant-enrollment-dialog.tsx` (search + selection pattern) | Excludes already-members; "no results" hint differs from "type to search" hint |
| `InstitutionListTable` (RSC) | inside `src/app/admin/instituicoes/page.tsx` | course list in `/admin/cursos/page.tsx` | Plain RSC; no client state needed |
| `ProgressMatrix` (RSC) | `src/app/gestor/progress-matrix.tsx` | NEW — no exact prior; HTML table per §Layout | RSC; reads pre-batched data from `getInstitutionMembersWithProgress` |
| `InstitutionCertificatesTable` (RSC) | `src/app/gestor/institution-certificates-table.tsx` | partial mirror of `MyCertificates` (typography + pill style) but stripped of download buttons | RSC |
| `MdheContactCard` | `src/components/marketing/mdhe-contact-card.tsx` | NEW; reusable for any future empty-state-with-contact | Two link rows with `Mail` / `Phone` icons |
| Toast component | reuse / add | (no toast in repo today — see §Toasts) | See decision below |

### Toast strategy (gray-area question resolved)

**Decision: inline status banner + soft toast — both, depending on context.**

The repo currently has no toast library. Adding `sonner` or `react-hot-toast` is *out of scope* for v1 (no redesign rule). Therefore:

- **Inline status banner** (existing pattern from `user-manager.tsx`): used for the create-institution form, the add-existing form, the invite form, and the promote/demote action result on the detail page. Banner sits directly above the action that triggered it. Color: `border border-emerald-200 bg-emerald-50 text-emerald-700` (success) / `border border-red-200 bg-red-50 text-red-700` (error). `role="status"` with `aria-live="polite"`.
- **Auto-demote disclosure inline** (D-07 + Specifics §): when promote triggers an auto-demote, the success banner spans two sentences — `{Nome} agora é gestor de {nome da instituição}. {Nome anterior} foi rebaixado(a) a aluno.` Renders within the same banner, separated by a sentence break. No floating toast layer needed.
- **`useTransition` pending state on each button** for immediate feedback (button text → pending label, button disabled). Prevents double-submit without needing a toast.

**Rule:** if a future phase introduces toasts globally, this contract is amended. Until then, banners + button states are the official feedback channel.

### Loading states (gray-area question resolved)

**Decision: progressive — RSC suspense + skeleton ONLY for the matrix; spinner for in-action buttons; no full-page loaders.**

| Surface | Pattern |
|---------|---------|
| `/admin/instituicoes` list page | RSC fetches list during render. No skeleton. Cold-start latency is acceptable — same as `/admin/cursos` today. |
| `/admin/instituicoes/[slug]` detail page | RSC fetches institution + members during render. No skeleton. |
| `/gestor` page | RSC. Matrix block wrapped in `<Suspense>` with a skeleton fallback (3 placeholder rows × 4 placeholder columns; pulsing `bg-slate-100`). Hero card and certs block render immediately. Reason: the batched per-student progress query (`getInstitutionMembersWithProgress`) is the slowest leg; isolate its latency. |
| Action buttons (promote / demote / attach / invite) | `useTransition` + button label change + `Loader2` spin icon (`<Loader2 className="h-4 w-4 animate-spin" />`). Same pattern as `grant-enrollment-dialog.tsx`. |
| Search autocomplete | Inline `Loader2` icon while debounced fetch is in flight; otherwise static results list. |

**No global page-level skeleton screens.** The repo has no `loading.tsx` files in `/admin` or `/dashboard` and adding them now would drift visual conventions.

### "Promover a gestor" button visual hierarchy (gray-area question resolved)

**Decision: text button (NOT icon-only, NOT dropdown).**

Per row:
- **When there is no manager yet on this institution:** the button is the *primary* action of that row, rendered with sky background (`bg-sky-600 text-white`), label `Promover a gestor`, no confirmation dialog.
- **When there is already a manager AND this row is NOT the manager:** the button is *secondary*, rendered with `border border-slate-300 bg-white text-slate-700`, label `Promover a gestor`, **opens the confirmation dialog** to disclose the auto-demote.
- **When this row IS the current manager:** the button label flips to `Rebaixar a aluno`, rendered with `border border-amber-300 bg-amber-50 text-amber-700` (visually distinct as the inverse action). Always opens confirmation dialog.

Reasons icon-only and dropdown were rejected:
- Icon-only loses the verb (admin reading 12 rows must guess).
- Dropdown menu adds a click and requires a popover library not in the repo.
- Text button matches the existing `Editar` / `Cadastrar usuario` density of `/admin/cursos`.

The detach action (`Desvincular`) sits to the right of promote/demote as a tertiary text button (`text-red-600 hover:text-red-700 text-sm font-medium`, no border) — matches the visual weight of "remove" actions in destructive-but-recoverable flows.

---

## Forms

### New institution form (`/admin/instituicoes/nova`)

Single column (max-w-2xl card), 3 fields stacked vertically:

```
[ Nome da instituição * ]
   text input — full width

[ Slug * ]
   text input — full width
   hint: "Use apenas letras minúsculas, números e hífens. Será gerado automaticamente — você pode editar antes de salvar."

[ Email do contato comercial ]
   email input — full width
   hint: "Email do contato comercial na instituição (não é o gestor da plataforma)."

[ Telefone (opcional) ]
   tel input — full width

[ Cancelar ] [ Criar instituição ]
   right-aligned, gap-3
```

Slug auto-fill: client-side `slugify(name)` from `@/lib/courses/slugify` while user types in the name field, until user manually edits the slug field. After manual edit, the auto-fill stops (sticky).

### Detail page — Member management section

Two stacked sub-cards inside the page main:

1. **Adicionar aluno (tabbed)** — same shape as `grant-enrollment-dialog.tsx` body but rendered inline (not in a modal), since the detail page is already the dedicated context. Two tabs: `Adicionar aluno existente` | `Convidar novo aluno`. Tab nav uses the same pill-tab pattern as the existing `tab` state in `grant-enrollment-dialog.tsx`.
2. **Lista de alunos** — table-style rows. Columns: `Aluno (nome + email)` · `Vinculado em` · `Função (badge)` · `Ações (promover/rebaixar + desvincular)`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| (no shadcn registry — `components.json` not present) | none | not applicable |
| Internal: `@/components/admin/*` (existing) | `Breadcrumb`, `ConfirmationDialog` | reused as-is; no third-party code introduced |
| Third-party | none declared for this phase | not applicable |

**Statement:** Phase 5 introduces zero third-party UI dependencies. All visual primitives are raw Tailwind utility classes following the project convention. No registry vetting gate required.

---

## Accessibility checklist (delta from existing project baseline)

These are inherited / re-asserted, not invented:

- [x] All buttons have visible focus rings (`focus-visible:outline-2 focus-visible:outline-sky-500`)
- [x] Form inputs use `<label>` with explicit text (no placeholder-only)
- [x] Dialogs use `role="alertdialog"` + `aria-modal="true"` + `aria-labelledby` (already in `ConfirmationDialog`)
- [x] Status banners use `role="status"` + `aria-live="polite"`
- [x] Matrix uses `<th scope="col">` and `<th scope="row">` for AT row/col association
- [x] Course-name truncation has `title` attribute carrying the full text on hover/focus
- [x] Icon-only decoration carries `aria-hidden="true"` (existing repo pattern)
- [ ] Color contrast: emerald-100 on emerald-700 text (badge) — verify ≥4.5:1 with the project's CSS custom property hsl values; if it fails, fall back to emerald-50 on emerald-800. **TODO for the executor's checker step.**

WCAG AA full audit is explicitly v2 (`UX-V2-02`) — not a Phase 5 deliverable.

---

## What's intentionally NOT in this contract

- **Visual redesign of any kind.** No new typography scale, no new color palette, no new component library. v1 rule.
- **Public verification page `/verificar/[code]`** — D-15: out of scope; certificate code is plain monospace text, no link.
- **PDF preview for managers** — D-15 + Deferred §: no manager-side certificate visualization in v1.
- **Toast / notification library** — see §Toasts; no new dependency introduced.
- **Mobile cards layout for `/gestor`** — see §Layout; horizontal scroll is the v1 answer.
- **Multi-institution selector** — D-03: `/gestor` singular, one institution per gestor in v1.
- **Bulk invite UI** — out of scope per ROADMAP v2 (B2B-V2-01).
- **Reorder / sort controls** in any table — keep static-ordered (instituição list by `created_at DESC`, members by `full_name ASC`, certs by `issued_at DESC`).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
