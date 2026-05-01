---
phase: "04-video-anti-piracy"
plan: "04"
subsystem: "admin-forms, lessons"
tags: ["admin", "video-provider", "bunny-stream", "create-lesson", "form"]
dependency_graph:
  requires:
    - "04-02 (createLessonSchema with videoProvider + videoExternalId)"
  provides:
    - "AddLessonForm with isProduction prop + controlled provider state + video section"
    - "module page.tsx passes isProduction to AddLessonForm"
  affects:
    - "src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx"
    - "src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx"
tech_stack:
  added: []
  patterns:
    - "Controlled select for dynamic placeholder — deviation from defaultValue pattern documented inline"
    - "isProduction prop from RSC (process.env.NODE_ENV server-evaluated) — same pattern as lesson-edit-form.tsx"
key_files:
  created: []
  modified:
    - "src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx"
    - "src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx"
decisions:
  - "Controlled select (value + onChange) used instead of uncontrolled defaultValue because the video_external_id placeholder must change dynamically based on selected provider"
  - "Video section uses space-y-3 and gap-1 (create form shorter variant) per UI-SPEC copywriting contract"
metrics:
  duration: "180 seconds (~3 minutes)"
  completed: "2026-05-01"
  tasks_completed: 1
  files_modified: 2
---

# Phase 04 Plan 04: Admin Create-Lesson Form — Video Provider Selector — Summary

**One-liner:** AddLessonForm extended with controlled provider select (Bunny default, YouTube dev-only) and video_external_id input, wired via isProduction prop from the RSC module page.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add video provider section to add-lesson-form.tsx + isProduction prop from page.tsx | 4da479e |

## Changes Per File

### src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx

Three changes:

1. **Props** — Added `isProduction: boolean` to the destructure and type annotation:
   ```typescript
   export function AddLessonForm({
     moduleId,
     courseSlug,
     isProduction,
   }: {
     moduleId: string;
     courseSlug: string;
     isProduction: boolean;
   })
   ```

2. **State** — Added `const [provider, setProvider] = useState<"bunny" | "youtube">("bunny")` immediately after `const [open, setOpen] = useState(false)`. Controlled state is required here (not `defaultValue`) because the `video_external_id` placeholder must change dynamically when the user switches provider. Documented inline with a comment explaining the deviation from the simpler uncontrolled pattern.

3. **JSX section** — Inserted a `<section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">` block after the title `<label>` and before the `{state.message && ...}` feedback block. The section contains:
   - Section label: `"VÍDEO"` (create-form shorter variant per UI-SPEC)
   - Provider select: `name="video_provider"`, controlled (`value={provider}` + `onChange`), YouTube option guarded by `{!isProduction && ...}`
   - Video ID input: `name="video_external_id"`, dynamic placeholder based on `provider` state
   - Field error display for `state.fieldErrors?.videoExternalId`

### src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx

One line changed at line 109:

```typescript
// Before:
<AddLessonForm moduleId={moduleId} courseSlug={courseSlug} />

// After:
<AddLessonForm moduleId={moduleId} courseSlug={courseSlug} isProduction={process.env.NODE_ENV === "production"} />
```

`process.env.NODE_ENV` is evaluated server-side in the RSC — the value never reaches the browser as a raw env var.

### lesson-edit-form.tsx verification

Confirmed the edit form at `src/app/admin/cursos/[slug]/aulas/[lessonId]/lesson-edit-form.tsx` already has the `isProduction` prop (line 28–31) and the video configuration section (lines 100–137). No corrections were needed.

## Deviations from Plan

None — plan executed exactly as written. The controlled select deviation was pre-documented in the plan's `<action>` block and in the UI-SPEC (PATTERNS.md reference).

## Known Stubs

None — both form fields (`video_provider`, `video_external_id`) are wired to `createLessonAction` which writes them to the DB (Plan 02). No placeholder/mock data in the UI path.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-04-12 mitigated | add-lesson-form.tsx | video_provider select value validated by createLessonSchema before reaching DB |
| T-04-13 mitigated | add-lesson-form.tsx | YouTube option rendered only when isProduction=false (server-evaluated NODE_ENV); even if forged POST submitted, createLessonAction admin-only route checks role |

## Self-Check

### Files exist:
- src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx — FOUND
- src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx — FOUND

### Commits exist:
- 4da479e — feat(04-04): add video provider selector to admin create-lesson form

### Verification results:
- `npm run typecheck` — clean (no errors)
- `npm run lint` — clean (zero warnings, --max-warnings=0)
- `npm run test:ci` — 131/131 tests passing across 21 test files

## Self-Check: PASSED
