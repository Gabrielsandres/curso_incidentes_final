---
phase: 02-catalog-crud
plan: "07"
subsystem: marketing
tags: [utm, lead-capture, tdd, landing-page, server-action]
one-liner: "UTM capture flow: URL query params → hidden inputs → Zod schema (max 255) → server action → institutional_leads DB columns"

dependency_graph:
  requires:
    - 02-01  # migration 0014 added utm_source/utm_medium/utm_campaign columns
  provides:
    - UTM attribution data on all institutional_leads rows
    - institutionalLeadSchema with 3 optional UTM fields (max 255, null transform)
  affects:
    - src/lib/marketing/institutional-lead-schema.ts
    - src/app/actions/create-institutional-lead.ts
    - src/app/page.tsx
    - src/components/marketing/institutional-lead-form.tsx

tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN on Zod schema extension
    - Next.js 16 async searchParams (Promise<Record<string, ...>>)
    - Hidden inputs pattern for server-side-injected form metadata
    - null→undefined coercion for absent FormData fields before Zod parse

key_files:
  created:
    - src/app/actions/create-institutional-lead.test.ts
  modified:
    - src/lib/marketing/institutional-lead-schema.ts
    - src/lib/marketing/institutional-lead-schema.test.ts
    - src/app/actions/create-institutional-lead.ts
    - src/app/page.tsx
    - src/components/marketing/institutional-lead-form.tsx

decisions:
  - "Used a dedicated utmString Zod helper (separate from optionalString) with max(255) to enforce the UTM length constraint at schema layer, matching the DB CHECK constraint from migration 0014 (defense in depth)."
  - "Added null→undefined coercion (getString helper) for UTM FormData fields in the action because FormData.get() returns null for absent keys, which Zod's z.string().optional() rejects. Hidden inputs always send empty string from the browser, but the action must also handle programmatic calls without those fields."
  - "InstitutionalLeadForm component now accepts optional utmSource/utmMedium/utmCampaign props with a default empty object — backward compatible, no existing call sites need updating."

metrics:
  duration_minutes: 20
  completed_date: "2026-04-28"
  tasks_completed: 2
  files_changed: 6
---

# Phase 02 Plan 07: UTM Capture (MKT-02) + Landing Preservation (MKT-01) Summary

UTM capture flow: URL query params → hidden inputs → Zod schema (max 255) → server action → institutional_leads DB columns

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | TDD: Extend institutionalLeadSchema with UTM fields | 33d7825 | institutional-lead-schema.ts + schema.test.ts (11 tests green) |
| 2 | Persist UTMs in action + landing page capture | 2adb2db, 9587e23 | create-institutional-lead.ts, create-institutional-lead.test.ts, institutional-lead-form.tsx, page.tsx |

## What Was Built

**Task 1 — Schema extension (TDD)**
- Added `utmString` Zod helper: `z.string().max(255).optional().transform(v => trim+null)`
- Added 3 fields to `institutionalLeadSchema`: `utmSource`, `utmMedium`, `utmCampaign`
- 7 new tests: accepts all 3 UTMs, absent UTMs → null, max(255) rejection for each field, empty string → null transform, regression check
- RED: T1–T6 failed, T7 passed. GREEN: all 11 tests pass.

**Task 2A — Server action (create-institutional-lead.ts)**
- Added `utmSource/utmMedium/utmCampaign` to `rawInput` (with `getString` null→undefined coercion for absent FormData keys)
- Extended insert to write `utm_source/utm_medium/utm_campaign` columns
- 3 action tests: UTMs present (values flow to DB), UTMs absent (nulls in DB), regression success message

**Task 2B — Form component (institutional-lead-form.tsx)**
- Added `InstitutionalLeadFormProps` interface with optional `utmSource/utmMedium/utmCampaign`
- Renders 3 `<input type="hidden">` elements with `name="utmSource/utmMedium/utmCampaign"` and `defaultValue` from props

**Task 2C — Landing page (page.tsx)**
- Made `Home()` an async function accepting `searchParams: Promise<Record<string, string | string[] | undefined>>`
- Awaits and extracts `utm_source/utm_medium/utm_campaign` query params (string guard, empty string fallback)
- Passes `utmSource/utmMedium/utmCampaign` props to `<InstitutionalLeadForm>`

## MKT-01 Smoke Verification (Landing Preservation)

Section count before and after the edit:
- `<section` raw elements: **2** (hero section + finalCta section)
- `<MarketingSection` components: **10** (audience, outcomes, methodology, curriculum, bonus, testimonial, plans, institutional, guarantee, faq)
- **Total: 12 sections** — identical to before the change.

No marketing sections were removed, reordered, or altered. The only addition to the `#atendimento-institucional` section is the UTM props passed to `InstitutionalLeadForm`. MKT-01 is fully preserved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Null→undefined coercion for absent FormData fields**
- **Found during:** Task 2 (writing action tests)
- **Issue:** `FormData.get()` returns `null` for absent keys. `z.string().max(255).optional()` accepts `string | undefined` but rejects `null`, causing Zod validation to fail for UTM fields not present in a form submission. This would fail in production for users without UTM query params.
- **Fix:** Added a `getString` helper in the action that coerces `null → undefined` for the three UTM fields before passing to Zod. Browser forms always send `""` for hidden inputs (which the transform handles), but the action now also handles programmatic/absent fields correctly.
- **Files modified:** `src/app/actions/create-institutional-lead.ts`
- **Commit:** 2adb2db

## Test Results

```
src/lib/marketing/institutional-lead-schema.test.ts  11/11 passed
src/app/actions/create-institutional-lead.test.ts     3/3  passed
Total: 14 tests, 0 failures
```

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. UTM values flow through the existing `submitInstitutionalLead` server action (already in the threat model as T-07-01 and T-07-03). Hidden inputs are visible in DOM DevTools — accepted per T-07-02 (UTM params were already in the URL).

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/lib/marketing/institutional-lead-schema.ts | FOUND |
| src/lib/marketing/institutional-lead-schema.test.ts | FOUND |
| src/app/actions/create-institutional-lead.ts | FOUND |
| src/app/actions/create-institutional-lead.test.ts | FOUND |
| src/app/page.tsx | FOUND |
| src/components/marketing/institutional-lead-form.tsx | FOUND |
| commit 33d7825 (schema TDD) | FOUND |
| commit 2adb2db (action + tests) | FOUND |
| commit 9587e23 (form + page) | FOUND |
