# Phase 4: Video & Anti-Piracy — Validation Strategy

**Phase:** 04-video-anti-piracy
**Framework:** Vitest (node environment — no jsdom)
**Config file:** `vitest.config.ts` (root)
**nyquist_validation:** enabled

---

## Quick-Run Commands

| Scope | Command |
|-------|---------|
| Video module only | `npx vitest run src/lib/video/video.test.ts` |
| Full suite | `npm run test:ci` |
| Lint gate | `npm run lint` |
| Type gate | `npm run typecheck` |

---

## Phase Requirements → Test Map

| Req ID | Behavior Under Test | Test Type | Automated Command | Wave |
|--------|---------------------|-----------|-------------------|------|
| VID-01 | `getPlayableSource` returns correct `PlayableSource` shape (`provider`, `embedUrl`, `watermarkText`, `ttl`) | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| VID-01 | Factory routes `video_provider='bunny'` to Bunny adapter | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| VID-01 | Factory routes `video_provider='youtube'` to YouTube adapter | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| VID-01 | Factory falls back to legacy `video_url` when `video_provider` is null (D-10) | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| VID-01 | Factory throws when both `video_provider` and `video_url` are null | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| VID-02 | YouTube adapter throws in `NODE_ENV=production` | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| VID-02 | YouTube adapter returns valid embedUrl with `enablejsapi=1&rel=0` in dev | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| VID-03 | Bunny adapter produces 64-char hex SHA256 token (not HMAC, not base64) | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| VID-03 | Bunny adapter embed URL contains `token=` and `expires=` query params | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| VID-03 | `BUNNY_STREAM_TOKEN_KEY`, `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_TOKEN_TTL_SECONDS` in serverSchema | static | `npm run typecheck` | Wave 1 (Plan 02) |
| VID-04 | Token signing — structural: `getPlayableSource` called only from RSC import path | static | `npm run lint && npm run typecheck` | Wave 2 (Plan 03) |
| VID-05 | `createLessonSchema` accepts `videoProvider` and `videoExternalId` (not required `videoUrl`) | static | `npm run typecheck` | Wave 1 (Plan 02) |
| VID-05 | Admin create-lesson form submits `video_provider` and `video_external_id` fields | manual | Local dev smoke test — submit create-lesson form, verify DB row | Wave 2 (Plan 04) |
| AP-01 | `WatermarkOverlay` renders `pointer-events:none` and `aria-hidden` | manual | Load lesson page as student, inspect element | Wave 2 (Plan 03) |
| AP-01 | Watermark text equals student email | manual | Inspect watermark text in browser | Wave 2 (Plan 03) |
| AP-02 | Bunny TTL ≤ 14400s (4h) — assertion on `expiresUnix` relative to now | unit | `npx vitest run src/lib/video/video.test.ts` | Wave 0 (Plan 01) |
| AP-02 | Bunny token is re-minted on every RSC page load | manual | Two page loads — verify `expires` differs | Wave 2 (Plan 03) |
| AP-03 | No IP in SHA256 formula — formula is `SHA256(key + videoId + expires)` only | static | Code review: `src/lib/video/bunny-adapter.ts` | Wave 0 (Plan 01) |
| AP-04 | `docs/anti-piracy.md` exists and documents deterrence ceiling | automated | `test -f docs/anti-piracy.md && grep -c "deterrence\|dissuasão" docs/anti-piracy.md` | Wave 3 (Plan 05) |

---

## Behaviors NOT Automatable in This Environment

The following behaviors require visual / browser verification. This is a known constraint from CLAUDE.md:
> "There is no jsdom setup — write tests against pure functions / server logic, not React DOM."

| Behavior | Reason Not Automated | Manual Verification Step |
|----------|----------------------|--------------------------|
| Watermark overlay renders at 10–15% opacity over iframe | React DOM / CSS — no jsdom | Load a lesson with Bunny provider in dev (or with YouTube + mock watermark); confirm overlay is visible but translucent |
| Watermark position rotates between 4 corners every 30 seconds | `setInterval` + React DOM | Watch lesson player for 30s; confirm position changes |
| YouTube option hidden in admin form when `isProduction=true` | React DOM — no jsdom | Toggle `process.env.NODE_ENV=production` locally; confirm YouTube `<option>` absent |
| Video-end auto-completion via postMessage (Bunny) | Browser + actual Bunny player | Load real Bunny video; watch to end; confirm lesson marked complete |
| Video-end auto-completion via postMessage (YouTube) | Browser iframe | Watch YouTube video to end (or use DevTools `window.postMessage(JSON.stringify({event:'infoDelivery',info:{playerState:0}}), '*')`); confirm completion |
| `docs/anti-piracy.md` content honest and accurate | Content review | Read document; confirm deterrence ceiling is documented |

---

## Sampling Rate

| Event | Command |
|-------|---------|
| Per task commit (Plan 01) | `npx vitest run src/lib/video/video.test.ts` |
| Per task commit (Plans 02–04) | `npm run typecheck && npm run lint` |
| Per wave merge | `npm run test:ci` |
| Phase gate (before /gsd-verify-work) | `npm run test:ci && npm run lint && npm run typecheck` |

---

## Wave 0 Gaps (new tests required, do not pre-exist)

- [ ] **Plan 01** — `src/lib/video/video.test.ts`: new file covering VID-01 (shape + routing + fallback + throw), VID-02 (prod guard + dev embedUrl), VID-03 (SHA256 hex correctness + embed URL format), AP-02 (TTL ≤ 14400s assertion), AP-03 (SHA256 formula has no IP — verifiable via unit test that token equals expected hash without IP)

---

## Phase Gate Checklist

Before calling `/gsd-verify-work`, confirm:

- [ ] `npm run test:ci` exits 0 (all tests pass, including Wave 0 tests in video.test.ts)
- [ ] `npm run lint` exits 0 (zero-warning policy)
- [ ] `npm run typecheck` exits 0 (strict TypeScript)
- [ ] Manual: Lesson player renders iframe (not YouTube IFrame API script) in browser
- [ ] Manual: Watermark overlay visible on Bunny lesson (or mock test); position rotates after 30s
- [ ] Manual: Admin create-lesson form shows video section with Bunny/YouTube selector
- [ ] Manual: YouTube postMessage auto-completion works in dev (use DevTools injection)
- [ ] Manual: `docs/anti-piracy.md` reads coherently with honest ceiling statement
