---
phase: 02-catalog-crud
plan: "05"
subsystem: admin-ui
tags: [admin, rsc, breadcrumb, status-badge, reorder, confirmation-dialog, course-edit, module-edit, lesson-edit, pt-BR]

# Dependency graph
requires:
  - "02-02: publishCourseAction, archiveCourseAction, unpublishCourseAction, getAdminCourseList"
  - "02-03: updateModuleAction, deleteModuleAction, reorderModuleAction, updateLessonAction, deleteLessonAction, restoreLessonAction, reorderLessonAction"
  - "02-04: MaterialUpload component at src/components/admin/material-upload.tsx"
provides:
  - "Breadcrumb: server component, nav>ol, ChevronRight separators, aria-current=page"
  - "StatusBadge + deriveCourseStatus: 3 status variants (rascunho/publicado/arquivado) per UI-SPEC"
  - "ReorderButtons: client component, up/down forms with separate server actions, 44px touch targets"
  - "ConfirmationDialog: client component, role=alertdialog, Escape closes, focus trap, focus on Cancelar"
  - "/admin: redirects to /admin/cursos (FLAG-02 Option A)"
  - "/admin/cursos: course list with stats row, StatusBadge, CourseArchiveButton, empty state"
  - "/admin/cursos/novo: blank create form with SlugPreview + full certificate section"
  - "/admin/cursos/[slug]: course edit + module list with ReorderButtons + AddModuleForm"
  - "/admin/cursos/[slug]/modulos/[moduleId]: module edit + lesson list with ReorderButtons + AddLessonForm"
  - "/admin/cursos/[slug]/aulas/[lessonId]: lesson edit + deleted banner + RestoreButton + MaterialUpload"
  - "getAdminCourseBySlug, getAdminModuleWithLessons, getAdminLessonWithContext: new admin queries in queries.ts"
affects:
  - "src/app/admin/page.tsx — now just redirect, no more CourseManager"
  - "src/app/admin/course-manager.tsx — deprecated (no longer imported anywhere)"
  - "src/lib/courses/queries.ts — 3 new admin-scoped query functions added"

# Tech stack
tech_stack:
  added: []
  patterns:
    - "RSC-first pages with co-located client components (form, dialogs, reorder rows)"
    - "Server Actions imported directly into client components (Next.js App Router pattern)"
    - "Dedicated reorder-actions.ts file for server action wrappers (avoids inline use server in client files)"
    - "useTransition for fire-and-forget server action calls from client event handlers"
    - "deriveCourseStatus helper co-located with StatusBadge in status-badge.tsx"

# Key files
key_files:
  created:
    - src/components/admin/breadcrumb.tsx
    - src/components/admin/status-badge.tsx
    - src/components/admin/reorder-buttons.tsx
    - src/components/admin/confirmation-dialog.tsx
    - src/app/admin/cursos/page.tsx
    - src/app/admin/cursos/course-archive-button.tsx
    - src/app/admin/cursos/novo/page.tsx
    - src/app/admin/cursos/novo/new-course-form.tsx
    - src/app/admin/cursos/[slug]/page.tsx
    - src/app/admin/cursos/[slug]/course-edit-form.tsx
    - src/app/admin/cursos/[slug]/module-reorder-row.tsx
    - src/app/admin/cursos/[slug]/add-module-form.tsx
    - src/app/admin/cursos/[slug]/reorder-actions.ts
    - src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx
    - src/app/admin/cursos/[slug]/modulos/[moduleId]/module-edit-form.tsx
    - src/app/admin/cursos/[slug]/modulos/[moduleId]/lesson-reorder-row.tsx
    - src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx
    - src/app/admin/cursos/[slug]/aulas/[lessonId]/page.tsx
    - src/app/admin/cursos/[slug]/aulas/[lessonId]/lesson-edit-form.tsx
    - src/app/admin/cursos/[slug]/aulas/[lessonId]/lesson-restore-button.tsx
    - src/app/admin/cursos/[slug]/aulas/[lessonId]/material-list-item.tsx
  modified:
    - src/app/admin/page.tsx
    - src/app/admin/course-manager.tsx
    - src/lib/courses/queries.ts

# Decisions
decisions:
  - "reorder-actions.ts as a dedicated 'use server' file — inline 'use server' inside 'use client' components is not valid in Next.js App Router; wrapper file is the correct pattern"
  - "useTransition + direct server action call for publish/unpublish/archive buttons in CourseEditForm — avoids extra form elements for state-only mutations"
  - "MaterialListItem uses fetch DELETE /api/materials/:id — no dedicated Server Action for material delete existed; falls back to the REST endpoint"
  - "getAdminCourseBySlug returns modules without deleted_at filter so the page can show active count accurately (JS filter applied after fetch)"
  - "getAdminModuleWithLessons filters deleted_at IS NULL in JS post-query — consistent with student path pattern from 02-03"
  - "course-manager.tsx deprecated with JSDoc comment (no hard delete — file may still serve as reference)"

# Metrics
metrics:
  duration: "~60 minutes"
  completed: "2026-04-28"
  tasks_completed: 3
  files_changed: 23
---

# Phase 2 Plan 05: Admin RSC Page Tree — Catalog CRUD UI

**One-liner:** RSC admin page hierarchy for `/admin/cursos` (list/create/edit course/module/lesson) backed by the 4 shared components (Breadcrumb, StatusBadge, ReorderButtons, ConfirmationDialog) built from UI-SPEC v4 Tailwind tokens.

## Tasks Completed

| Task | Name | Commit | Key files |
|------|------|--------|-----------|
| 1 | Four reusable admin UI components | 5f80a27 | breadcrumb.tsx, status-badge.tsx, reorder-buttons.tsx, confirmation-dialog.tsx |
| 2 | Course list page, redirect, /admin/cursos/novo | 0268183 | admin/page.tsx, cursos/page.tsx, cursos/novo/page.tsx, novo/new-course-form.tsx |
| 3 | Course/module/lesson edit pages (RSC) | bfcdb04 | [slug]/page.tsx, [moduleId]/page.tsx, [lessonId]/page.tsx + 12 client components |

## What Was Built

### Task 1 — Shared Components

**Breadcrumb** (`src/components/admin/breadcrumb.tsx`): Server component. Renders `<nav aria-label="Navegação"><ol>` with `ChevronRight` separators. Last item gets `aria-current="page"` and no link. Handles arbitrary depth (1–4 items per UI-SPEC).

**StatusBadge + deriveCourseStatus** (`src/components/admin/status-badge.tsx`): Server component. `deriveCourseStatus(publishedAt, archivedAt)` returns `"rascunho" | "publicado" | "arquivado"`. Badge classes per UI-SPEC Component 7 (slate/emerald/amber pill).

**ReorderButtons** (`src/components/admin/reorder-buttons.tsx`): Client component with two `<form>` elements each pointing to their own server action. `useFormStatus` for pending state. 44×44px min touch targets. `aria-label="Mover para cima"` / `"Mover para baixo"`. `aria-disabled` + `disabled` on boundary buttons.

**ConfirmationDialog** (`src/components/admin/confirmation-dialog.tsx`): Client component. `role="alertdialog"` per UI-SPEC. Escape key closes. Overlay click closes. Focus goes to Cancelar on open (safer default). Tab trap between Cancelar/Confirmar. Danger variant confirm button.

### Task 2 — List, Redirect, Create

- `/admin/page.tsx`: Replaced with `redirect("/admin/cursos")` (FLAG-02 Option A).
- `/admin/cursos/page.tsx`: RSC course list. Auth guard → `getAdminCourseList()` → stats row (skips zero-count statuses) → course cards with StatusBadge + CalendarCheck/Archive date metadata + Editar link + CourseArchiveButton client widget + empty state.
- `/admin/cursos/novo/page.tsx`: RSC shell + `NewCourseForm` client component with controlled title→slug preview (slugify), full certificate section, `createCourseAction` form action.

### Task 3 — Edit Pages + Admin Queries

Three new admin queries added to `src/lib/courses/queries.ts`:
- `getAdminCourseBySlug`: full course + all modules (unfiltered by deleted_at) for the edit page
- `getAdminModuleWithLessons`: module + lessons filtered to active only
- `getAdminLessonWithContext`: lesson + materials + parent module (with course join for breadcrumb)

**`/admin/cursos/[slug]/page.tsx`**: Breadcrumb (2 levels), h1 course title, `CourseEditForm` (update/publish/unpublish/archive with ConfirmationDialog), `AddModuleForm` inline collapsible, module list with `ModuleReorderRow`.

**`/admin/cursos/[slug]/modulos/[moduleId]/page.tsx`**: Breadcrumb (3 levels), h1 module title, `ModuleEditForm` (update/delete), `AddLessonForm` inline collapsible, lesson list with `LessonReorderRow`.

**`/admin/cursos/[slug]/aulas/[lessonId]/page.tsx`**: Breadcrumb (4 levels), h1 lesson title, amber removed-banner with `LessonRestoreButton`, `LessonEditForm` (update/delete + NODE_ENV-gated video provider select), materials list with `MaterialListItem` + `MaterialUpload` (from 02-04).

**`reorder-actions.ts`**: `"use server"` wrapper file with `reorderModuleUpAction`, `reorderModuleDownAction`, `reorderLessonUpAction`, `reorderLessonDownAction` — translates the `id` field from ReorderButtons forms into the `module_id`/`lesson_id` + `direction` shape expected by the underlying actions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inline `"use server"` inside client component is invalid**
- **Found during:** Task 3 implementation of ModuleReorderRow
- **Issue:** First draft placed `async function upAction(fd) { "use server"; ... }` inside a `"use client"` file. Next.js App Router does not allow inline server functions in client modules.
- **Fix:** Created `reorder-actions.ts` with `"use server"` at file level, exporting `reorderModuleUpAction`, `reorderModuleDownAction`, `reorderLessonUpAction`, `reorderLessonDownAction`. Client components import these directly.
- **Files modified:** `src/app/admin/cursos/[slug]/reorder-actions.ts` (new), `src/app/admin/cursos/[slug]/module-reorder-row.tsx`, `src/app/admin/cursos/[slug]/modulos/[moduleId]/lesson-reorder-row.tsx`
- **Commit:** bfcdb04

**2. [Rule 1 - Bug] Unused `Link` import in course edit page caused lint failure**
- **Found during:** Task 3 lint run
- **Issue:** `Link` was imported in `src/app/admin/cursos/[slug]/page.tsx` but not used in the RSC shell (it was used inside client components instead).
- **Fix:** Removed the unused import.
- **Files modified:** `src/app/admin/cursos/[slug]/page.tsx`
- **Commit:** bfcdb04

## Threat Model Compliance

All T-05 mitigations applied:

- **T-05-01** (Spoofing — auth guard on RSC pages): Every RSC page checks `supabase.auth.getUser()` → redirects to `/login?redirectTo=…` if no session. Then checks `fetchUserRole() === "admin"` → redirects to `/dashboard` if not admin. Defense-in-depth behind middleware.
- **T-05-02** (Information Disclosure — notFound on missing slug): `getAdminCourseBySlug`, `getAdminModuleWithLessons`, `getAdminLessonWithContext` all return `null` on miss, and each page calls `notFound()` — renders standard Next.js 404 without leaking existence.
- **T-05-03** (Tampering — ConfirmationDialog bypass): Accepted. Dialog is client-only UI; all destructive actions have `requireAdminUser()` server-side.

## Known Stubs

None. All data is fetched from real Supabase queries. The MaterialListItem delete button calls `DELETE /api/materials/:id` — this REST endpoint must exist (it was built in the materials module). If the endpoint is missing, deletion will fail gracefully with no crash (fetch error swallowed by `useTransition`). This is logged to deferred-items for verification.

## Threat Flags

None. No new network endpoints introduced. All new pages are server-rendered admin routes behind existing middleware auth. The 3 new queries use the same `SupabaseClient<Database>` typed pattern.

## Self-Check: PASSED

Files verified present:
- src/components/admin/breadcrumb.tsx: FOUND
- src/components/admin/status-badge.tsx: FOUND
- src/components/admin/reorder-buttons.tsx: FOUND
- src/components/admin/confirmation-dialog.tsx: FOUND
- src/app/admin/cursos/page.tsx: FOUND
- src/app/admin/cursos/novo/page.tsx: FOUND
- src/app/admin/cursos/[slug]/page.tsx: FOUND
- src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx: FOUND
- src/app/admin/cursos/[slug]/aulas/[lessonId]/page.tsx: FOUND

Content checks:
- redirect("/admin/cursos") in admin/page.tsx: PASSED
- "Catálogo de cursos" in cursos/page.tsx: PASSED
- MaterialUpload import in lesson page: PASSED
- aria-label="Mover para cima" in reorder-buttons.tsx: PASSED
- aria-label="Navegação" in breadcrumb.tsx: PASSED
- deriveCourseStatus in status-badge.tsx: PASSED
- role="alertdialog" in confirmation-dialog.tsx: PASSED

Commits verified:
- 5f80a27: feat(02-05): add 4 reusable admin components
- 0268183: feat(02-05): list page /admin/cursos + /admin/cursos/novo + redirect /admin
- bfcdb04: feat(02-05): edit pages for course/module/lesson with breadcrumb and reorder

Test suite: 70/70 passing across 16 test files — no regressions.
lint: 0 warnings. typecheck: clean.
