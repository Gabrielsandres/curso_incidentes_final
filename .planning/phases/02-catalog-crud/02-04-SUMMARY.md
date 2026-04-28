---
phase: 02-catalog-crud
plan: "04"
subsystem: materials-upload-validation
tags: [mime-whitelist, file-upload, server-validation, tdd, admin-ui]
dependency_graph:
  requires: [02-01]
  provides: [ALLOWED_MATERIAL_MIME_TYPES, assertUploadable, MaterialUpload-component]
  affects: [src/lib/materials/storage.ts, src/lib/materials/upload.ts, src/app/api/materials/upload/route.ts, src/components/admin/material-upload.tsx]
tech_stack:
  added: []
  patterns: [discriminated-union-validation, tdd-red-green, mime-whitelist-set, defense-in-depth]
key_files:
  created:
    - src/lib/materials/storage.test.ts
    - src/components/admin/material-upload.tsx
  modified:
    - src/lib/materials/storage.ts
    - src/lib/materials/upload.ts
    - src/app/api/materials/upload/route.ts
decisions:
  - "Removed 'zip' from ALLOWED_MATERIAL_EXTENSIONS to match CAT-04 whitelist (PDF/Word/Excel/PPT/PNG/JPEG only)"
  - "Empty file.type skips MIME check — extension already validated by validateMaterialFile; avoids false rejects from browsers that omit MIME"
  - "assertUploadable added to upload.ts (not just route.ts) for defense-in-depth — both layers enforce the whitelist"
  - "lesson-materials.tsx unchanged — student-side component has no dependency on MIME whitelist logic"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-28"
  tasks_completed: 3
  files_changed: 5
---

# Phase 2 Plan 04: MIME Whitelist Validation + Admin Upload Component Summary

**One-liner:** MIME type whitelist (9 types) enforced server-side via `assertUploadable()` in storage.ts + upload route; admin `MaterialUpload` component wires `accept=` to the same constant.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | MIME whitelist in storage.ts + TDD tests | 3478fd2 | storage.ts, storage.test.ts |
| 2 | Wire assertUploadable in upload route and upload.ts | 5b3a332 | route.ts, upload.ts, storage.test.ts (typecheck fix) |
| 3 | Admin MaterialUpload component | e7ecfb8 | src/components/admin/material-upload.tsx |

## What Was Built

### Task 1 — MIME Whitelist + TDD (RED → GREEN)

`src/lib/materials/storage.ts` extended with:

- `ALLOWED_MATERIAL_MIME_TYPES` — `Set<string>` with 9 MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `image/png`, `image/jpeg`
- `isAllowedMaterialMimeType(mime)` helper
- `assertUploadable(file)` — runs `validateMaterialFile` (size + extension) first, then MIME check; returns `{ ok: false, message: "Tipo de arquivo não suportado..." }` for disallowed MIME; empty `file.type` skips MIME check

`src/lib/materials/storage.test.ts` created with 9 test cases covering the full behavior matrix.

### Task 2 — Upload Route + upload.ts

- `src/app/api/materials/upload/route.ts`: imports and calls `assertUploadable` before `uploadLessonMaterialFile`; returns `{ error: <pt-BR message> }` with status 400 for disallowed MIME
- `src/lib/materials/upload.ts`: replaced `validateMaterialFile` call with `assertUploadable` for consistent enforcement at the library layer too

### Task 3 — Admin MaterialUpload Component

`src/components/admin/material-upload.tsx` — new `"use client"` component:
- Props: `lessonId: string`, `onUploaded?: (material: MaterialRow) => void`
- `accept=` built from `ALLOWED_MATERIAL_MIME_TYPES` (T5 client-layer mitigation, advisory only)
- Upload states: idle / uploading / success / error with pt-BR inline messages
- Helper text: "Tipos aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG · Máx 20 MB"
- POSTs `FormData` to `/api/materials/upload`; surfaces server error messages directly to user

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test used disallowed file extension for MIME rejection test**
- **Found during:** Task 1 GREEN phase
- **Issue:** Test used `archive.zip` (extension `zip`) for MIME rejection test. After removing `zip` from `ALLOWED_MATERIAL_EXTENSIONS`, the extension check fired first returning "nao permitido" (old message without accent), failing the `/não suportado/i` match
- **Fix:** Changed test file to `disguised.pdf` (valid extension, disallowed MIME `application/zip`) to correctly test the MIME-check code path
- **Files modified:** src/lib/materials/storage.test.ts
- **Commit:** 5b3a332

**2. [Rule 1 - Bug] TypeScript discriminated union narrowing in tests**
- **Found during:** Task 2 typecheck
- **Issue:** `result.message` accessed without narrowing on `result.ok === false`; TypeScript correctly rejected access on the `{ ok: true }` union branch
- **Fix:** Added `if (!result.ok)` guards around `.message` assertions
- **Files modified:** src/lib/materials/storage.test.ts
- **Commit:** 5b3a332

**3. [Rule 2 - Missing critical functionality] assertUploadable also added to upload.ts**
- **Found during:** Task 2 implementation review
- **Issue:** Plan said to update only `route.ts`, but `upload.ts` still called `validateMaterialFile` — callers invoking `uploadLessonMaterialFile` directly would bypass the MIME check
- **Fix:** Updated `upload.ts` import and call to use `assertUploadable` for defense-in-depth
- **Files modified:** src/lib/materials/upload.ts
- **Commit:** 5b3a332

**4. lesson-materials.tsx — no changes needed**
- Plan listed `src/components/course/lesson-materials.tsx` under `files_modified`. After review, the student-side component has no dependency on MIME validation logic and required no changes. Documented here; file left untouched.

## Threat Surface

No new network endpoints or auth paths introduced. The `assertUploadable` function adds server-side enforcement to the existing `/api/materials/upload` route (already behind admin auth). Client `accept=` attribute is advisory per T-02-T5 threat register entry.

## Verification

All success criteria met:

- `ALLOWED_MATERIAL_MIME_TYPES` exported from storage.ts with 9 MIME types
- `assertUploadable()` validates size first (delegates to validateMaterialFile), then MIME
- Upload route uses assertUploadable; returns pt-BR error for disallowed types
- `src/components/admin/material-upload.tsx` created with `accept=` wired to whitelist
- `npx vitest run src/lib/materials/storage.test.ts` — 9/9 tests green
- `npm run test:ci` — 70/70 tests passing across 16 test files
- `npm run lint` — 0 warnings
- `npx tsc --noEmit` — clean
- No changes to STATE.md or ROADMAP.md (per instructions)

## Self-Check

Files exist:
- src/lib/materials/storage.ts — modified
- src/lib/materials/storage.test.ts — created
- src/app/api/materials/upload/route.ts — modified
- src/lib/materials/upload.ts — modified
- src/components/admin/material-upload.tsx — created

Commits verified: 3478fd2, 5b3a332, e7ecfb8
