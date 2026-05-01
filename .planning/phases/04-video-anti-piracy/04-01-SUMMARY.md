---
phase: "04-video-anti-piracy"
plan: "01"
subsystem: "video"
tags: ["video", "bunny-stream", "sha256", "tdd", "server-only", "youtube-adapter"]
dependency_graph:
  requires:
    - "BUNNY_STREAM_TOKEN_KEY in serverSchema (provided by 04-02)"
    - "BUNNY_STREAM_LIBRARY_ID in serverSchema (provided by 04-02)"
    - "BUNNY_STREAM_TOKEN_TTL_SECONDS in serverSchema (provided by 04-02)"
  provides:
    - "getPlayableSource(lesson, user) factory — routes by video_provider, falls back to legacy video_url (D-10)"
    - "getBunnyPlayableSource — SHA256_HEX(key+videoId+expiresUnix) signed embed URL"
    - "getYouTubePlayableSource — embed URL builder + prod guard (VID-02)"
    - "VideoProvider interface, PlayableSource type, VideoProviderName union"
  affects:
    - "src/app/curso/[slug]/aula/[lessonId]/page.tsx (will call getPlayableSource in 04-03)"
    - "src/components/course/lesson-player.tsx (will receive embedUrl/provider/watermarkText props in 04-03)"
tech_stack:
  added: []
  patterns:
    - "node:crypto createHash('sha256').update(key+videoId+expires).digest('hex') for Bunny token signing"
    - "resetEnvCache() in beforeEach/afterEach for tests that call getEnv()"
    - "process.env.NEXT_PUBLIC_SUPABASE_* required in test beforeEach because serverSchema extends clientSchema"
key_files:
  created:
    - "src/lib/video/types.ts"
    - "src/lib/video/bunny-adapter.ts"
    - "src/lib/video/youtube-adapter.ts"
    - "src/lib/video/index.ts"
    - "src/lib/video/video.test.ts"
  modified: []
decisions:
  - "SHA256 plain hash (not HMAC) for Bunny token — SHA256_HEX(key+videoId+expiresUnix)"
  - "getEnv() used in bunny-adapter.ts — never reads process.env directly for Bunny credentials (CLAUDE.md rule)"
  - "process.env.NODE_ENV read directly in youtube-adapter.ts — accepted exception (Next.js framework constant, not application secret)"
  - "Test beforeEach must set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY because serverSchema.extend(clientSchema) requires them"
  - "No 'use server' on lib files — server-only by import location (RSC only)"
metrics:
  duration: "271 seconds (~5 minutes)"
  completed: "2026-05-01"
  tasks_completed: 3
  files_modified: 5
---

# Phase 04 Plan 01: Video Module (TDD) — Summary

**One-liner:** SHA256-signed Bunny Stream adapter + YouTube dev adapter + factory function via TDD, with `getEnv()` for credential isolation and full test coverage of signing correctness, TTL bounds, and prod guard.

## Tasks Completed

| Task | Description | Commits |
|------|-------------|---------|
| RED | Write failing tests for bunny-adapter, youtube-adapter, factory | 3ec259a |
| GREEN | Create types.ts, bunny-adapter.ts, youtube-adapter.ts, index.ts | 1762601 |
| REFACTOR | Lint + typecheck — zero violations on first run | (no commit needed) |

## TDD Gate Compliance

- RED gate: `test(04-01):` commit `3ec259a` — import errors confirmed (module not found)
- GREEN gate: `feat(04-01):` commit `1762601` — 15/15 tests passing
- REFACTOR: `npm run lint` and `npm run typecheck` both exit 0; no code changes needed

## Changes Per File

### src/lib/video/types.ts (new)

- `VideoProviderName`: `"youtube" | "bunny"` union type
- `PlayableSource`: `{ provider, embedUrl, watermarkText: string | null, ttl: number | null }`
- `VideoProvider`: interface with `getPlayableSource(lesson, user)` returning `Promise<PlayableSource> | PlayableSource`

### src/lib/video/bunny-adapter.ts (new)

- `getBunnyPlayableSource(lesson, user): PlayableSource`
- Reads `BUNNY_STREAM_TOKEN_KEY`, `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_TOKEN_TTL_SECONDS` via `getEnv()` — never via `process.env` directly
- Token: `createHash('sha256').update(tokenKey + videoId + String(expiresUnix)).digest('hex')` — plain SHA256 (NOT HMAC, NOT base64)
- Embed URL: `https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token={token}&expires={expiresUnix}`
- Returns `watermarkText: user.email` and `ttl` in seconds
- Throws Portuguese error messages for missing config or missing `video_external_id`

### src/lib/video/youtube-adapter.ts (new)

- `getYouTubePlayableSource(lesson): PlayableSource`
- Production guard: throws if `process.env.NODE_ENV === 'production'` (VID-02)
- Resolves videoId from `video_external_id` first, falls back to parsing `video_url`
- Embed URL: `https://www.youtube.com/embed/{videoId}?enablejsapi=1&rel=0`
- Returns `watermarkText: null` and `ttl: null` (no watermark in dev, no expiry)
- Internal `extractYouTubeVideoId()` handles `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/` formats

### src/lib/video/index.ts (new)

- `getPlayableSource(lesson, user)` factory — single public entry point
- Routes `video_provider === 'bunny'` → `getBunnyPlayableSource`
- Routes `video_provider === 'youtube'` → `getYouTubePlayableSource`
- Falls back to legacy `video_url` when `video_provider` is null (D-10) — logs `logger.info` message
- Throws when both `video_provider` and `video_url` are null
- Re-exports `PlayableSource`, `VideoProvider`, `VideoProviderName` types

### src/lib/video/video.test.ts (new)

15 tests across 3 describe groups:
- **video/bunny-adapter** (6 tests): hex token format, SHA256 correctness vs HMAC, TTL <= 14400s, embed URL structure, watermarkText, provider field
- **video/youtube-adapter** (5 tests): prod guard throw, embedUrl format, watermarkText null, videoId from external_id, fallback from video_url
- **video/index factory** (4 tests): bunny routing, youtube routing, legacy video_url fallback, throw on null config

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test beforeEach missing NEXT_PUBLIC_SUPABASE_* vars**

- **Found during:** GREEN phase (first test run)
- **Issue:** `getEnv()` calls `serverSchema.safeParse(process.env)` and `serverSchema` extends `clientSchema`, which requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The plan's `beforeEach` template only set the three Bunny vars, causing `getEnv()` to throw "Missing or invalid environment variables" for all Bunny adapter tests.
- **Fix:** Added `process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"` to both `beforeEach` blocks (bunny-adapter group and factory group). Added matching `delete` calls in `afterEach`.
- **Files modified:** `src/lib/video/video.test.ts`
- **Commit:** 1762601 (included in GREEN commit)

## Known Stubs

None — no stub patterns found. All functions return real computed values (SHA256 token, embed URLs).

## Threat Flags

No new threat surface beyond what the plan's threat model already covers:

- `BUNNY_STREAM_TOKEN_KEY` is read via `getEnv()` (serverSchema only) — T-04-01 mitigated
- TTL defaults to 3600s, max test asserts <= 14400s — T-04-02 mitigated
- No IP in SHA256 formula — T-04-03 accepted per AP-03
- YouTube prod guard throws — T-04-04 mitigated

## Self-Check

### Files exist:
- src/lib/video/types.ts — FOUND
- src/lib/video/bunny-adapter.ts — FOUND
- src/lib/video/youtube-adapter.ts — FOUND
- src/lib/video/index.ts — FOUND
- src/lib/video/video.test.ts — FOUND

### Commits exist:
- 3ec259a — test(04-01): RED phase
- 1762601 — feat(04-01): GREEN phase implementation

### Verification results:
- `npx vitest run src/lib/video/video.test.ts` — 15/15 passing
- `npm run typecheck` — clean (no errors)
- `npm run lint` — clean (zero warnings, --max-warnings=0)

## Self-Check: PASSED
