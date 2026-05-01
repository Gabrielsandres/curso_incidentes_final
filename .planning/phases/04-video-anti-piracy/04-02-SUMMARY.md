---
phase: "04-video-anti-piracy"
plan: "02"
subsystem: "env-schema, lessons"
tags: ["env", "bunny-stream", "schema", "server-action", "video-provider"]
dependency_graph:
  requires: []
  provides:
    - "BUNNY_STREAM_TOKEN_KEY in serverSchema (prod-required)"
    - "BUNNY_STREAM_LIBRARY_ID in serverSchema (prod-required)"
    - "BUNNY_STREAM_TOKEN_TTL_SECONDS in serverSchema (default 3600)"
    - "createLessonSchema with videoProvider + videoExternalId (optional)"
    - "createLessonAction writes video_provider + video_external_id to DB"
  affects:
    - "src/lib/env.ts"
    - "src/lib/lessons/schema.ts"
    - "src/app/actions/create-lesson.ts"
tech_stack:
  added: []
  patterns:
    - "Zod superRefine for prod-required env vars (mirrors SUPABASE_SERVICE_ROLE_KEY pattern)"
    - "z.preprocess to coerce null from formData.get() to undefined before z.string().optional()"
key_files:
  created: []
  modified:
    - "src/lib/env.ts"
    - "src/lib/lessons/schema.ts"
    - "src/app/actions/create-lesson.ts"
    - "src/lib/env.test.ts"
    - "src/lib/lessons/schema.test.ts"
    - "src/app/actions/create-lesson.test.ts"
decisions:
  - "videoUrl kept as optional/nullable in createLessonSchema (legacy fallback per D-09) — not removed"
  - "videoProvider and videoExternalId use z.preprocess to handle null from formData.get()"
  - "createLessonAction DB insert writes video_provider + video_external_id; no video_url column"
metrics:
  duration: "580 seconds (~10 minutes)"
  completed: "2026-04-30"
  tasks_completed: 2
  files_modified: 6
---

# Phase 04 Plan 02: Env & Schema Extension for Video Provider — Summary

**One-liner:** Bunny Stream env vars added to serverSchema with prod guards; createLessonSchema migrated from required videoUrl to optional videoProvider/videoExternalId with null-safe preprocessing.

## Tasks Completed

| Task | Description | Commits |
|------|-------------|---------|
| 1 | Add Bunny env vars to serverSchema | e2a64af (RED), 675560d (GREEN) |
| 2 | Replace videoUrl with videoProvider/videoExternalId in schema + action | 1a08daf (RED), 0d38451 (GREEN), 8803ecb (fix) |

## Changes Per File

### src/lib/env.ts

Three new fields added inside `serverSchema.extend({})` after `LOG_LEVEL`:

- `BUNNY_STREAM_TOKEN_KEY`: `z.string().optional().superRefine(...)` — optional in dev/test, required in production (same pattern as `SUPABASE_SERVICE_ROLE_KEY`).
- `BUNNY_STREAM_LIBRARY_ID`: `z.string().optional().superRefine(...)` — optional in dev/test, required in production.
- `BUNNY_STREAM_TOKEN_TTL_SECONDS`: `z.coerce.number().int().positive().default(3600)` — defaults to 1 hour. Configurable without code change.

All three vars remain in `serverSchema` only — never cross to `clientSchema` or `getClientEnv()`.

### src/lib/lessons/schema.ts

`createLessonSchema` changes:

- **Removed** `videoUrl: z.string({ required_error: "Informe a URL do video" }).trim().url(...)` (hard-required field).
- **Added** `videoProvider` and `videoExternalId` using `z.preprocess(null→undefined, z.string().trim().optional().transform(empty→null))`. The preprocess step is required because `formData.get()` returns `null` for absent keys, and `z.string().optional()` only accepts `string | undefined`.
- **Added** `videoUrl: z.string().trim().url(...).optional().nullable()` — kept for legacy compatibility (D-09: existing lessons still have `video_url`; this field can be passed from old forms without breaking validation).

**Exact schema shape for new fields:**
```typescript
videoProvider: z.preprocess(
  (v) => (v === null || v === undefined ? undefined : v),
  z.string().trim().optional().transform((v) => (v && v.length > 0 ? v : null)),
),
videoExternalId: z.preprocess(
  (v) => (v === null || v === undefined ? undefined : v),
  z.string().trim().optional().transform((v) => (v && v.length > 0 ? v : null)),
),
videoUrl: z.string().trim().url({ message: "Informe uma URL valida." }).optional().nullable(),
```

### src/app/actions/create-lesson.ts

Two changes:

1. **safeParse call** — replaced `videoUrl: formData.get("video_url")` with:
   ```typescript
   videoProvider: formData.get("video_provider"),
   videoExternalId: formData.get("video_external_id"),
   ```

2. **DB insert** — replaced `video_url: parsed.data.videoUrl` with:
   ```typescript
   video_provider: parsed.data.videoProvider ?? null,
   video_external_id: parsed.data.videoExternalId ?? null,
   ```
   New lessons no longer write `video_url` to the DB. Legacy lessons with `video_url` set are unaffected (fallback per D-10).

### Position handling note

The `add-lesson-form.tsx` does NOT send a `position` field in the form. The current schema requires `position` (z.coerce.number min 1). Inspecting the actual form confirms it does not have a position input — this means creation via this form always fails the position validation. This is a **pre-existing behavior** (not introduced by Plan 02); it was not changed. The form is a minimal quick-add form and the position field issue will be addressed in Plan 04 when the full video section UI is added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Null handling for formData.get() in new schema fields**

- **Found during:** Task 2 GREEN phase (full test suite run)
- **Issue:** `z.string().trim().optional().transform()` does not accept `null` — but `formData.get()` returns `null` when a key is absent. This caused schema validation failures ("Expected string, received null") for `videoProvider` and `videoExternalId` whenever the admin form didn't include those fields.
- **Fix:** Wrapped both fields in `z.preprocess((v) => (v === null || v === undefined ? undefined : v), ...)` to coerce `null` to `undefined` before Zod type-checking.
- **Files modified:** `src/lib/lessons/schema.ts`
- **Commit:** 8803ecb

**2. [Rule 1 - Bug] Updated create-lesson.test.ts to match new DB contract**

- **Found during:** Task 2 GREEN phase (same test run)
- **Issue:** `create-lesson.test.ts` had `makeValidFormData()` sending `video_url` and asserting the DB insert contained `video_url`. After the schema change this test was testing the old contract.
- **Fix:** Updated `makeValidFormData()` to send `video_provider` + `video_external_id`; updated the insert assertion to expect `video_provider` + `video_external_id` columns.
- **Files modified:** `src/app/actions/create-lesson.test.ts`
- **Commit:** 8803ecb

## Known Stubs

None — no stub patterns found in modified files.

## Threat Flags

No new threat surface introduced. `BUNNY_STREAM_TOKEN_KEY` is in `serverSchema` only (T-04-05 mitigated). `video_provider` and `video_external_id` pass through Zod validation before reaching DB (T-04-06 mitigated). `video_external_id` is non-secret (T-04-07 accepted).

## Self-Check

### Files exist:
- src/lib/env.ts — FOUND
- src/lib/lessons/schema.ts — FOUND
- src/app/actions/create-lesson.ts — FOUND

### Commits exist:
- e2a64af — test(04-02): RED phase env tests
- 675560d — feat(04-02): Bunny env vars implementation
- 1a08daf — test(04-02): RED phase schema tests
- 0d38451 — feat(04-02): schema + action implementation
- 8803ecb — fix(04-02): null handling fix + test updates

### Verification results:
- `npm run test:ci` — 116/116 tests passing across 20 test files
- `npm run typecheck` — clean (no errors)
- `npm run lint` — clean (zero warnings, --max-warnings=0)

## Self-Check: PASSED
