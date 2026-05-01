---
phase: "04-video-anti-piracy"
plan: "03"
subsystem: "video, lesson-player, courses-query"
tags: ["video", "lesson-player", "watermark", "postmessage", "bunny-stream", "youtube"]
dependency_graph:
  requires:
    - "getPlayableSource factory from 04-01 (src/lib/video/index.ts)"
    - "video_provider + video_external_id columns in lessons table (migration 0014, 04-02)"
  provides:
    - "getLessonWithCourseContext now selects video_provider and video_external_id"
    - "RSC page.tsx resolves PlayableSource server-side via getPlayableSource (D-01 fulfilled)"
    - "LessonPlayer accepts 7 flat props — no lesson object"
    - "WatermarkOverlay renders over iframe when watermarkText !== null (D-04 through D-08)"
    - "postMessage handler covers Bunny (player.js protocol) and YouTube (infoDelivery)"
    - "YouTube IFrame API entirely removed from codebase"
  affects:
    - "src/app/curso/[slug]/aula/[lessonId]/page.tsx"
    - "src/components/course/lesson-player.tsx"
    - "src/lib/courses/queries.ts"
tech_stack:
  added: []
  patterns:
    - "window.addEventListener('message') for both Bunny and YouTube postMessage completion events"
    - "WatermarkOverlay sub-component co-located in lesson-player.tsx — not exported"
    - "RSC resolves embedUrl server-side; client component receives pre-resolved props only"
key_files:
  created: []
  modified:
    - "src/lib/courses/queries.ts"
    - "src/app/curso/[slug]/aula/[lessonId]/page.tsx"
    - "src/components/course/lesson-player.tsx"
decisions:
  - "provider prop is accepted in LessonPlayerProps type (for caller interface) but not destructured in component body — postMessage handler is provider-agnostic, branching by data shape not by provider name"
  - "WatermarkOverlay co-located in lesson-player.tsx, not exported — single-use sub-component"
  - "Video unavailable fallback (embedUrl empty string) renders red dashed border with Portuguese error message"
  - "UI copy updated to proper pt-BR with accents per UI-SPEC copywriting contract"
metrics:
  duration: "294 seconds (~5 minutes)"
  completed: "2026-05-01"
  tasks_completed: 2
  files_modified: 3
---

# Phase 04 Plan 03: Wire Video Module into Lesson Player — Summary

**One-liner:** getLessonWithCourseContext query extended with video_provider/video_external_id; RSC page.tsx now resolves PlayableSource server-side; LessonPlayer refactored to flat props with WatermarkOverlay and postMessage auto-completion replacing the YouTube IFrame API.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add video_provider + video_external_id to getLessonWithCourseContext SELECT | 65bd847 |
| 2 | Wire getPlayableSource into page.tsx RSC; refactor LessonPlayer with WatermarkOverlay + postMessage | ff36932 |

## Changes Per File

### src/lib/courses/queries.ts

Added two columns to the `.select(...)` string inside `getLessonWithCourseContext` (lines 377–378):
```
video_provider,
video_external_id,
```
Inserted immediately after `video_url,` and before `position,`. No other queries modified. TypeScript picks up the new columns automatically from `database.types.ts` (migration 0014 already added them to `LessonRow`).

### src/app/curso/[slug]/aula/[lessonId]/page.tsx

Two changes:

1. Added import at line 12:
   ```typescript
   import { getPlayableSource } from "@/lib/video";
   ```

2. Added `getPlayableSource` call after `getLessonWithCourseContext` (line 46):
   ```typescript
   const playableSource = getPlayableSource(context.lesson, { email: user.email ?? "" });
   ```

3. Replaced `<LessonPlayer lesson={context.lesson} initialIsCompleted={...} />` with the 7-prop spread (lines 82–89):
   ```typescript
   <LessonPlayer
     embedUrl={playableSource.embedUrl}
     provider={playableSource.provider}
     watermarkText={playableSource.watermarkText}
     lessonId={context.lesson.id}
     lessonTitle={context.lesson.title}
     lessonDescription={context.lesson.description ?? null}
     initialIsCompleted={context.lesson.isCompleted}
   />
   ```

Auth section (lines 23–36), metadata, nav, header, LessonMaterials — all preserved unchanged.

### src/components/course/lesson-player.tsx

Complete refactor — 319 lines → 222 lines:

**Removed entirely:**
- `YouTubePlayer`, `YouTubePlayerStateEvent`, `YouTubePlayerOptions`, `YouTubeApi` types
- `declare global { interface Window { YT?, onYouTubeIframeAPIReady?, __youtubeIframeApiPromise? } }`
- `loadYouTubeIframeApi()` function (lines 45–100)
- `playerRef`, `playerElementRef` refs
- `youtubeVideoId` and `fallbackEmbedUrl` useMemo derivations
- YouTube IFrame API `useEffect` (former lines 172–208)
- `extractYouTubeVideoId()` and `buildYouTubeEmbedUrl()` helper functions
- `useMemo` and `LessonWithMaterials` imports

**Added:**
- `WatermarkOverlay` sub-component (lines 15–41) — rotates 4 corners every 30 seconds via `setInterval`, `pointer-events:none`, `aria-hidden="true"`, opacity 0.12
- postMessage `useEffect` (lines 108–135) — handles Bunny (`data.context === 'player.js' && data.event === 'ended'`) and YouTube (`infoDelivery + playerState === 0`)
- Single `iframe` render block with optional `WatermarkOverlay`
- Video unavailable fallback (empty `embedUrl`) with red dashed border and Portuguese error

**Preserved:**
- `markLessonAsCompleted` callback body exactly — only `lesson.id` → `lessonId` prop
- `completionRef`, `savingRef`, `isCompleted`, `isSaving`, `completionError`, `showCompletionBanner` state
- Completion banner JSX, manual button JSX, status badge JSX, error paragraph JSX
- `useCallback`, `useEffect`, `useRef`, `useState` imports

## Provider Prop Usage

The `provider` prop is present in `LessonPlayerProps` (type contract for `page.tsx`) but is **not destructured** in the component body. The postMessage handler is provider-agnostic — it branches by `data.context` and `data.event` shape, not by provider name. This avoids an ESLint `no-unused-vars` warning while maintaining the prop in the public interface. Future plans (e.g., showing a provider badge) can destructure it.

## Video Unavailable Fallback

Implemented. When `embedUrl` is an empty string (should not occur in normal flow since `getPlayableSource` always returns a non-empty URL or throws), renders:
```
Não foi possível carregar o vídeo desta aula. Verifique se o ID de vídeo salvo é válido.
```
Red dashed border (`border-dashed border-red-200 bg-red-50 text-red-700`).

## Requirements Status

All 9 requirement IDs from the plan frontmatter:

| Req | Description | Status |
|-----|-------------|--------|
| VID-01 | TypeScript VideoProvider interface, PlayableSource type | Satisfied (04-01) |
| VID-02 | YouTube prod guard throws | Satisfied (04-01) |
| VID-03 | TTL configurable via BUNNY_STREAM_TOKEN_TTL_SECONDS | Satisfied (04-01, 04-02) |
| VID-04 | Bunny token key never in client bundle | Satisfied (04-01 server-only + D-01 RSC call) |
| AP-01 | Watermark overlay renders with email over iframe | Satisfied (this plan — WatermarkOverlay) |
| AP-02 | Bunny signed URL expires within TTL | Satisfied (04-01 bunny-adapter) |
| AP-03 | No IP binding in token | Satisfied (04-01 — SHA256 of key+videoId+expires only) |
| AP-04 | Anti-piracy documentation | Deferred to Plan 04 or 05 (docs/anti-piracy.md not yet created) |

VID-05 (admin form with provider selector) — addressed in Plan 04 (add-lesson-form.tsx modification per PATTERNS.md).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `provider` prop ESLint no-unused-vars**

- **Found during:** Task 2 lint check
- **Issue:** Destructuring `provider` as `provider: _provider` or `provider: _` still triggered `@typescript-eslint/no-unused-vars` warning because `eslint-config-next` does not configure `argsIgnorePattern` to allow `_` prefixed destructured names.
- **Fix:** Omit `provider` from the destructuring entirely — TypeScript accepts partial destructuring of object parameters. The `provider` field remains in `LessonPlayerProps` for the caller interface; the component simply does not use it internally (postMessage is provider-agnostic).
- **Files modified:** `src/components/course/lesson-player.tsx`
- **Commit:** ff36932

## Known Stubs

None — no stub patterns found. `embedUrl` comes from a real `getPlayableSource` call; `watermarkText` is either a real email or `null`; all UI copy uses real values.

## Threat Flags

No new threat surface beyond what the plan's threat model covers:

- T-04-08 (email in watermarkText prop): accepted — email already available on page, no new exposure
- T-04-09 (postMessage spoofing): mitigated — Bunny branch requires `context === 'player.js' && event === 'ended'`; YouTube requires exact `infoDelivery + playerState === 0` shape
- T-04-10 (YouTube in production): mitigated by `getPlayableSource` → `getYouTubePlayableSource` throwing if `NODE_ENV === 'production'`
- T-04-11 (watermark CSS bypass): accepted per AP-04 ceiling

## Self-Check

### Files exist:
- src/lib/courses/queries.ts — FOUND
- src/app/curso/[slug]/aula/[lessonId]/page.tsx — FOUND
- src/components/course/lesson-player.tsx — FOUND

### Commits exist:
- 65bd847 — feat(04-03): add video_provider and video_external_id to getLessonWithCourseContext query
- ff36932 — feat(04-03): wire getPlayableSource into RSC page and refactor LessonPlayer

### Verification results:
- `npm run typecheck` — clean (no errors)
- `npm run lint` — clean (zero warnings, --max-warnings=0)
- `npm run test:ci` — 131/131 tests passing across 21 test files

## Self-Check: PASSED
