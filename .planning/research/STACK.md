# Technology Stack — Open Decisions

**Project:** Plataforma MDHE — Gestão de Incidentes (Brownfield milestone)
**Researched:** 2026-04-27
**Scope:** Only open decisions. The base stack (Next.js 16, React 19, TypeScript strict, Supabase, Tailwind v4, Sentry, Vitest, Zod, pdf-lib) is locked and not repeated here.

---

## 1. Video Provider in Production: Bunny Stream

**Recommendation: Use Bunny Stream. The user's preference is confirmed as the correct call.**

### Verdict

Bunny Stream is the right choice for this project. Mux has better React DX (native `@mux/mux-player-react`), but charges ~10× more for ingestion + storage at the same volume. Vimeo OTT is a marketing/stofront product, not an API-first platform — wrong category entirely. For a single-consultancy course platform with low-to-medium video volume and a hard budget ceiling, Bunny wins on price, DRM availability, and sign-URL capability.

### Bunny Stream: What You Get

**Token-authenticated playback (embed URLs):**
Token is a SHA256 hex digest of `tokenSecurityKey + videoId + expirationUnixSeconds`, appended as `?token=<hex>&expires=<unix>` to the embed URL. Generation is server-side only (Server Action or API route) — the secret key never reaches the browser. Tokens should be short-lived (15–60 minutes is standard).

Signed embed URL format:
```
https://player.mediadelivery.net/embed/{library_id}/{video_id}?token={sha256_hex}&expires={unix_ts}
```
Legacy domain `iframe.mediadelivery.net` still works but the new player is at `player.mediadelivery.net`. Use the new domain.

**DRM tiers:**
- MediaCage Basic — included at no extra charge. Dynamic encryption applied on the fly. Disables MP4 fallback and Early-Play. Does **not** play on iOS via HLS in some configurations (MediaCage encrypts the stream; FairPlay requires Enterprise tier). Adequate for basic anti-piracy but has the iOS caveat.
- MediaCage Enterprise — Widevine + FairPlay + PlayReady (Hollywood-grade). Starts at $99/month. Out of scope for v1 budget; Basic is sufficient for an educational content producer who is not competing with Netflix.

**Watermark (static, library-level):**
Bunny Stream's native watermark is a static logo overlay uploaded once per library — not per-user. It does **not** support dynamic per-user email overlays natively.

**Per-user dynamic watermark (CSS overlay approach):**
The player renders inside an `<iframe>`. You cannot inject HTML inside the iframe, but you can layer a `<div>` with `position: absolute; inset: 0; pointer-events: none; z-index: 10` over the iframe wrapper containing the student's email in low-opacity text. This is a UI-layer overlay — it is not burned into the stream and can theoretically be removed via dev tools by a technically savvy user. For an educational consultancy, this is an acceptable deterrent level. If burned-in forensic watermarking is required in a future milestone, the correct solution is VdoCipher (which offers server-side per-user watermarking) or a move to MediaCage Enterprise with a custom forensic watermark pipeline. Do not over-engineer this for v1.

**JS player API:**
Bunny Stream embeds support the Player.js open spec. Load `https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js`, instantiate with `new playerjs.Player(iframeElement)`. Events: `ready`, `play`, `pause`, `timeupdate`, `ended`. Methods: `play()`, `pause()`, `seek(seconds)`, volume controls. This is sufficient to fire the lesson-complete event when `ended` fires.

**HLS vs MP4:**
Default delivery is HLS (adaptive bitrate). MP4 direct URLs exist but are disabled when MediaCage Basic is enabled. Use HLS. The iframe player handles adaptive streaming automatically; no HLS.js needed if using the Bunny iframe embed.

**Pricing (as of 2026-04-27):**
- Storage: from $0.01/GB/month
- CDN egress: from $0.005/GB
- Transcoding: free (no per-minute fee unlike Mux's $0.015/min)
- MediaCage Basic DRM: included (no extra charge)
- Monthly minimum: $1
- For a course catalog with 20h of video and 500 students/month: estimated $3–10/month total

**Why not Mux:**
Mux charges $0.015/min stored + $0.04/min to ingest. For 20 hours of video, storage alone is ~$18/month before any egress. Mux's React component (`@mux/mux-player-react`) is excellent but doesn't justify 5–10× the cost for this use case. Mux is the right choice if analytics depth, SLA guarantees, or zero-config React integration outweigh cost — none of those are primary constraints here.

**Why not Vimeo OTT/Pro:**
Vimeo OTT is a storefront product (they sell access to end-users). Vimeo Pro ($20/month) has no token-auth signed URLs and weak DRM. Wrong category.

---

## 2. Video Provider Abstraction Layer

**Recommendation: A thin TypeScript interface with two concrete adapters (YouTube for dev, Bunny for prod).**

The player component must never know which video backend is active. The abstraction is resolved at Server Action level — the component receives only a resolved `VideoSource` and renders it.

### Recommended Interface Shape

```typescript
// src/lib/video/types.ts

export type VideoProvider = 'youtube' | 'bunny';

export interface VideoSource {
  /** Which backend produced this source */
  provider: VideoProvider;
  /**
   * For 'bunny': the signed embed URL, ready to use in <iframe src=...>
   * For 'youtube': the embed URL (youtube.com/embed/{id})
   */
  embedUrl: string;
  /**
   * Optional: for 'bunny', UNIX timestamp when the token expires.
   * Consumer can refresh before expiry if the page is long-lived.
   */
  expiresAt?: number;
}

export interface VideoProviderAdapter {
  /** Returns a VideoSource ready for the player component */
  resolveSource(lessonId: string, videoId: string): Promise<VideoSource>;
}
```

### Concrete Adapters

```typescript
// src/lib/video/bunny-adapter.ts
// src/lib/video/youtube-adapter.ts
```

**Bunny adapter** (server-only — signs tokens):
- Reads `BUNNY_STREAM_LIBRARY_ID` and `BUNNY_STREAM_TOKEN_KEY` from `serverSchema` in `src/lib/env.ts`
- Generates SHA256 token: `createHash('sha256').update(tokenKey + videoId + expires).digest('hex')`
- Returns `{ provider: 'bunny', embedUrl: '...player.mediadelivery.net/embed/...?token=...&expires=...', expiresAt: expires }`
- Token TTL: 60 minutes (configurable via env, default 3600)

**YouTube adapter** (dev only):
- Reads the `video_url` field stored in the `lessons` table (already a YouTube URL)
- Extracts video ID, returns `{ provider: 'youtube', embedUrl: 'https://www.youtube.com/embed/{id}' }`

### Player Component Contract

```typescript
// src/components/player/video-player.tsx
// Props:
interface VideoPlayerProps {
  source: VideoSource;
  /** Student email — rendered as CSS overlay for deterrent watermark */
  studentEmail: string;
  onEnded?: () => void;
}
```

The component renders an `<iframe>` with `source.embedUrl`, wraps it in a `relative` container, and overlays a `pointer-events: none; opacity-10` `<div>` containing `studentEmail` (repeated as a tiled watermark pattern or single line at a corner). Fires `onEnded` via Player.js `ended` event.

### Environment-Based Adapter Selection

```typescript
// src/lib/video/index.ts
import { getEnv } from '@/lib/env';

export function getVideoAdapter(): VideoProviderAdapter {
  const env = getEnv();
  if (env.NODE_ENV === 'production' || env.BUNNY_STREAM_LIBRARY_ID) {
    return new BunnyAdapter();
  }
  return new YouTubeAdapter();
}
```

This keeps the provider switch in one place and respects the existing `getEnv()` pattern from `src/lib/env.ts`.

### New Environment Variables to Add to `src/lib/env.ts`

| Variable | Schema | Required |
|----------|--------|----------|
| `BUNNY_STREAM_LIBRARY_ID` | `serverSchema`, `z.string()` | Required in production |
| `BUNNY_STREAM_TOKEN_KEY` | `serverSchema`, `z.string()` | Required in production |
| `BUNNY_STREAM_TOKEN_TTL_SECONDS` | `serverSchema`, `z.coerce.number().default(3600)` | Optional |

No new `NEXT_PUBLIC_` vars — all Bunny credentials are server-only.

---

## 3. Certificate PDF Generation Strategy

**Recommendation: Keep per-request generation with pdf-lib. Do NOT add a queue or background worker for v1.**

### Rationale

The project is a single-consultancy platform targeting Brazilian schools, with an explicitly stated ceiling of less than 10,000 certificates per year (~27/day average, likely spiky but low). pdf-lib generates a simple 1-page PDF in under 200ms on Node.js. The current architecture (Server Action or API route calling `src/lib/certificates/issuer.ts`) is correct for this volume.

The existing concern in `.planning/codebase/CONCERNS.md` ("Geração de PDF de certificado por requisição (caro se escalar)") is a valid note for future reference but not an actionable problem at the current scale. Adding Supabase Edge Functions, pgmq, or pg_cron for a PDF generator that runs at most a few dozen times per day is over-engineering.

### What to Keep

- `pdf-lib` 1.17.1 — already installed, working, no replacement needed
- `src/lib/certificates/issuer.ts` — keep the per-request generation model
- `certificates` Supabase Storage bucket — store generated PDFs so repeated downloads are a bucket read (signed URL), not a re-generation

### The Idiomatic Pattern for This Stack

Generate-once-then-store is already the correct pattern:

1. User reaches 100% completion
2. `issuer.ts` checks `course_certificates` — if a row already exists with `file_path`, return a signed URL for the existing file (skip regeneration)
3. If no row exists: generate PDF with pdf-lib, upload to `certificates` bucket, insert into `course_certificates`, return signed URL
4. All subsequent requests: return signed URL for the existing stored file

This is already the pattern implied by the `course_certificates` table design. It means each certificate is generated exactly once. Total generation time is bounded by the few-second PDF build + upload; this is acceptable in a Server Action.

### When to Reconsider

If the platform grows to multiple courses with bulk completions (e.g., an institutional client completing a team of 100 simultaneously after a course deadline), the burst could cause timeouts on a slow deployment. At that point, move generation to a Supabase Edge Function triggered by a `lesson_progress` database webhook. This is a v2 concern.

**Do NOT add:** pgmq, pg_cron, Supabase Edge Functions, Bull/BullMQ, or any external queue service for certificate generation in v1.

---

## 4. Email Delivery for B2B Invites

**Recommendation: Replace Supabase's default SMTP with Resend using custom SMTP. Add `resend` npm package for transactional emails beyond auth flows.**

### The Problem with Supabase Default SMTP

The Supabase built-in email service has three documented hard limits that make it unsuitable for production:

1. **Rate limit: 2 emails/hour** on the free default SMTP (30/hour with custom SMTP configuration before you tune the rate limit settings)
2. **No delivery SLA** — documented as "best-effort only, intended for non-production use"
3. **Restricted recipients** — can only send to project team members without a custom SMTP provider configured

For B2B invites (institutional coordinators, team members from contracted schools), these limits are unacceptable. An institutional sale could require sending 20–50 invite emails in a single batch.

### Recommended Solution: Resend

**Why Resend over Postmark:**
- 3,000 emails/month free (Postmark starts at $15/month)
- Official Supabase documentation lists Resend as a supported custom SMTP provider
- React Email 6.x (same team) enables typed, component-based email templates — fits the React 19 + TypeScript codebase
- Modern DX: single API key, JSON responses, straightforward Node.js SDK
- DKIM + SPF verified as part of domain setup (required for B2B deliverability)
- Adequate for the volume: even at 100 invites/day (far above expected), the free tier covers the whole year

**When Postmark would be correct instead:** Postmark has higher deliverability guarantees for transactional email at scale (separate message streams, no shared sending reputation). If the platform grows to sending thousands of transactional emails per month and deliverability complaints emerge, migrate to Postmark. For v1, Resend's free tier and developer ergonomics win.

### New Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `resend` | 6.12.2 | Resend Node.js SDK for custom transactional emails (B2B invites, notifications beyond auth flows) |
| `react-email` | 6.0.1 | Type-safe email templates as React components |

Install:
```bash
npm install resend@6.12.2 react-email@6.0.1
```

### Integration Approach

**Step 1: Configure Supabase Auth to use Resend as custom SMTP**

In Supabase Dashboard → Authentication → SMTP Settings:
- Host: `smtp.resend.com`
- Port: 465 (SSL) or 587 (TLS)
- Username: `resend`
- Password: `<RESEND_API_KEY>`
- From address: `noreply@<verified-domain>`

This immediately upgrades all auth emails (invite, confirm signup, password reset) to Resend's delivery infrastructure. No code changes required for existing auth flows.

**Step 2: Use Resend SDK for custom institutional invite emails**

The existing `src/app/actions/` Server Action pattern is the correct place. Institutional invites beyond Supabase Auth's `inviteUserByEmail` (e.g., custom onboarding emails with course details, institution name, welcome copy in pt-BR) should use the Resend SDK directly:

```typescript
// src/app/actions/invite-institutional-user.ts
import { Resend } from 'resend';
// import InstitutionalInviteEmail from '@/components/emails/institutional-invite';
```

**Step 3: Domain/DNS requirements**

Before production:
- Add a verified sending domain in Resend dashboard (e.g., `mdhe.com.br` or the platform's domain)
- Resend will provide SPF, DKIM, and DMARC DNS records
- These must be added to the domain's DNS before sending — without them, B2B recipients (school admins, IT departments) may block the emails as spam

### New Environment Variables

| Variable | Schema | Required |
|----------|--------|----------|
| `RESEND_API_KEY` | `serverSchema`, `z.string()` | Required in production |
| `EMAIL_FROM` | `serverSchema`, `z.string().email().default('noreply@mdhe.com.br')` | Optional with default |

---

## Summary: What to Add

| Package / Service | Type | Version | Rationale |
|-------------------|------|---------|-----------|
| Bunny Stream | External service | — | Video hosting + anti-piracy; token-auth + DRM |
| `resend` | npm | 6.12.2 | Transactional email SDK; replaces default Supabase SMTP |
| `react-email` | npm | 6.0.1 | Typed email templates in React/TSX |
| `BUNNY_STREAM_LIBRARY_ID` | Env var | — | Server-only, required in prod |
| `BUNNY_STREAM_TOKEN_KEY` | Env var | — | Server-only, required in prod |
| `BUNNY_STREAM_TOKEN_TTL_SECONDS` | Env var | — | Server-only, optional (default 3600) |
| `RESEND_API_KEY` | Env var | — | Server-only, required in prod |
| `EMAIL_FROM` | Env var | — | Server-only, optional with default |

## What NOT to Add

| What | Why Not |
|------|---------|
| `@mux/mux-player-react` or Mux | 5–10× higher cost than Bunny Stream for same features at this volume |
| Vimeo Pro / OTT | Wrong product category; no token auth on Pro tier |
| `@vidstack/react` | Latest stable (0.6.15) is 2 years old; HLS.js (1.6.16) adds ~280KB; not needed since Bunny's iframe player handles adaptive streaming internally |
| `hls.js` | Same reason — adds weight without benefit when using Bunny's iframe embed |
| pgmq / pg_cron / Bull / BullMQ | Queue infrastructure for <10k certificates/year is over-engineering; generate-once-store-then-serve is sufficient |
| Supabase Edge Functions (for certificates) | Unnecessary complexity at current volume; revisit at v2 if burst completion becomes a problem |
| Postmark | $15/month starting cost vs Resend's 3k/month free; overkill for B2B invites at this scale |
| SendGrid | Acquired by Twilio, developer experience has degraded; Resend has better DX and free tier |
| Forensic watermarking service (VdoCipher, etc.) | CSS overlay is sufficient deterrent for educational content; forensic watermarking is v2+ if content piracy becomes a real concern |
| MediaCage Enterprise DRM ($99/month) | Basic DRM is included free and adequate for v1; Enterprise only needed if platform monetizes premium content at scale |

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Bunny Stream pricing | HIGH | Official pricing page (bunny.net/pricing/stream/) verified 2026-04-27 |
| Bunny embed token algorithm | HIGH | Official docs (docs.bunny.net/docs/stream-embed-token-authentication) — SHA256(key + videoId + expires) |
| Bunny dynamic watermark limitation | HIGH | Confirmed absent in docs + review; static logo only natively |
| CSS overlay approach for deterrent watermark | HIGH | Standard web technique; confirmed feasible with iframe wrapper |
| MediaCage Basic DRM iOS caveat | MEDIUM | Mentioned in third-party review (daveswift.com); should be verified with Bunny docs before shipping |
| Mux pricing comparison | HIGH | Official Mux pricing + third-party comparison cross-verified |
| Resend free tier 3k/month | HIGH | Official Resend pricing page verified |
| Supabase default SMTP 2/hour limit | HIGH | Official Supabase rate limits docs + GitHub discussion |
| `resend` npm version 6.12.2 | HIGH | Verified via npm registry |
| `react-email` npm version 6.0.1 | HIGH | Verified via npm registry |
| pdf-lib per-request adequacy at <10k/year | HIGH | Performance is well-understood; 200ms/cert on Node.js is not a bottleneck at this scale |
| Player.js integration with Bunny | MEDIUM | Official blog post confirms spec support; React integration is `useEffect`-based, not a dedicated package |

---

*Stack research: 2026-04-27*
