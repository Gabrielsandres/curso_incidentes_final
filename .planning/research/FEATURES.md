# Feature Landscape

**Domain:** Online course platform — B2C + B2B corporate safety training (single-tenant: MDHE)
**Researched:** 2026-04-27
**Confidence:** HIGH for categorization (domain well-understood); MEDIUM for Bunny watermark specifics (see notes)

---

## Already Shipped (Do Not Re-Implement)

Per `.planning/PROJECT.md` Validated section — excluded from this document:

- Auth flows (login, password reset, email confirmation, accept-invite)
- Middleware 3-ring RBAC
- Lesson player with progress marking (`/api/lesson-progress/complete`)
- Materials upload + signed URL download
- Marketing landing page + institutional lead capture
- Admin: lesson creation form, user manager, invite resend

---

## Table Stakes

Features where absence causes the product to feel broken or incomplete for the stated v1 goal ("aluno completa curso, recebe certificado, sem fricção operacional para a MDHE").

### A. Catalog / Multi-Course CRUD (Admin)

| Attribute | Value |
|-----------|-------|
| Category | Table Stakes |
| Complexity | M |
| Depends On | — (foundation for all other features) |

**Why table stakes:** The app currently has a single-lesson creation form. Without course-level CRUD (create/edit/delete course, reorder modules and lessons, manage materials per lesson), the MDHE admin cannot operate the platform without SQL. This is the first blocker to going live.

**What it includes:**
- Course CRUD: name, slug, description, cover image, certificate config (hours, signer info, template)
- Module CRUD: name, order within course; reorder via drag or up/down buttons
- Lesson CRUD: title, description, video URL/provider, order within module — currently the form exists (`/dashboard/aulas/nova`) but is not wired to a course/module selector in a full admin flow
- Material management per lesson: attach/remove files already in Storage; the upload route exists, it needs to be surfaced in the full course editor
- Bulk-order: at minimum, order fields editable inline (full drag-and-drop is a differentiator, not table stakes)

**Scope boundary (v1):** No bulk import, no SCORM. Single-tenant; no per-student enrollment visibility needed in catalog management (that is feature B/D).

---

### B. Student Progress Dashboard (% per Course)

| Attribute | Value |
|-----------|-------|
| Category | Table Stakes |
| Complexity | S |
| Depends On | A (courses must exist with lessons before progress can be shown) |

**Why table stakes:** `/dashboard` already exists but shows courses without completion percentage. Showing "0 de 12 aulas concluídas (0%)" is the minimum bar — without it the student cannot tell if they are enrolled in a course or what is left to do.

**What it includes:**
- Progress rollup (lessons completed / total lessons) per course — query infrastructure already in `src/lib/courses/queries.ts`
- Visual indicator (progress bar or percentage text) on the course card in `/dashboard`
- "Continuar" link that resumes at the last incomplete lesson (nice-to-have, but dramatically improves UX — promote to table stakes given the low complexity)

**Scope boundary:** No per-module breakdown needed in v1. No gamification points or streaks.

---

### C. Auto Certificate on 100% Completion

| Attribute | Value |
|-----------|-------|
| Category | Table Stakes |
| Complexity | S (infrastructure already ~80% built) |
| Depends On | B (must track completion to know when 100% is reached) |

**Why table stakes:** This is the explicit output the B2B client (the school) purchases. No certificate = no credible training record. The issuer logic, PDF generation, storage, and signed-URL route are already in `src/lib/certificates/` and `src/app/api/certificates/`. What remains is:

- Triggering issuance automatically when the final lesson is marked complete (today it requires the student to manually click a "Baixar certificado" button that calls the API; the eligibility check exists but the trigger is reactive, not automatic)
- Surfacing "Meus certificados" on `/dashboard` — `src/components/certificates/my-certificates.tsx` exists but needs to be wired into the dashboard page
- Certificate code visible on the PDF (for verification by schools)

**Scope boundary:** Trigger is "student clicks complete on the last lesson → certificate issued in the background on the same API call." No real-time push notification. No verification portal in v1.

---

### E. Video Player Abstraction (YouTube unlisted ↔ Bunny Stream)

| Attribute | Value |
|-----------|-------|
| Category | Table Stakes |
| Complexity | M |
| Depends On | A (lessons need a `video_provider` field + `video_id` stored per lesson) |

**Why table stakes:** Without this, deploying to production requires manually rewriting every lesson's player component. The abstraction is the precondition for going live. The current `lesson-player.tsx` is assumed to render a hardcoded YouTube embed.

**What it includes:**
- `VideoPlayer` component accepting `{ provider: "youtube" | "bunny", videoId: string, token?: string }` props
- YouTube branch: iframe embed with `youtube-nocookie.com` (no cookies, no tracking sidebar)
- Bunny Stream branch: Bunny's iframe embed with embed token authentication (signed token + expiry in query params)
- `video_provider` + `video_id` columns on the `lessons` table (migration 0012)
- Admin form updated to accept provider + video ID when creating/editing a lesson

**Scope boundary:** No custom HTML5 player in v1. Use Bunny's own player iframe for Bunny Stream (it handles HLS, adaptive bitrate). Custom player is a v2 concern if Bunny player UX is insufficient.

---

## Differentiators

Features that make the MDHE platform distinctly competitive for the B2B corporate safety training niche and justify the proprietary approach over Hotmart/Coursify.

### D. Institution Entity + Manager (gestor_instituicao) Role

| Attribute | Value |
|-----------|-------|
| Category | Differentiator (essential for B2B revenue; not needed for B2C) |
| Complexity | L |
| Depends On | A (courses), B (progress data), C (certificates) |

**Why differentiator:** Hotmart and Eduzz are B2C-first and treat "teams" as an afterthought. MDHE's primary commercial channel is contracting with schools that need accountability for their staff's training completion. The gestor_instituicao dashboard transforms a content delivery tool into a compliance reporting tool — that is the product school managers are actually buying.

**What it includes:**

*Schema changes (migration):*
- `institutions` table: id, name, contract_start, contract_end, admin-managed
- `institution_memberships` table: institution_id, user_id, role (`member` | `manager`)
- Existing `profiles.role` enum extended: add `gestor_instituicao`

*Middleware + RBAC:*
- New protected route `/gestor` (or `/instituicao`)
- Middleware array updated: `MANAGER_ROUTES = ["/gestor"]`, role check `role === "gestor_instituicao"`
- Manager cannot access `/admin` or `/dashboard/aulas/nova`

*Manager dashboard:*
- Lists all students in their institution only (RLS policy: manager can read progress rows for users in their institution)
- Per-student: name, courses enrolled, % completion, certificate issued date (or "pendente")
- Filter by course, filter by completion status
- Export to CSV — this is the feature school coordinators will screenshot in every sales call; LOW complexity to add (`Blob` download of a JS-generated CSV from the already-fetched data), HIGH value

*Admin:*
- Admin assigns institution to a user when creating/inviting them (single field in user creation form)
- Admin creates institution records (simple CRUD, no self-service by manager in v1)

**Scope boundary:** Manager cannot invite users, cannot see students from other institutions, cannot modify any content. MDHE admin retains full control. Per Out of Scope in PROJECT.md: no bulk CSV invite in v1.

---

### F. Anti-Piracy in Production (Token Auth + Dynamic Watermark)

| Attribute | Value |
|-----------|-------|
| Category | Differentiator (also client-mandated priority) |
| Complexity | M |
| Depends On | E (Bunny Stream player must exist first) |

**Why differentiator:** MDHE content is academically validated (UnB, EAPE/SEDF) and represents the core IP. Leaking videos to non-paying users directly undermines the revenue model. Platforms like Hotmart use their own CDN and watermark; a custom Bunny Stream integration is the equivalent for a proprietary platform.

**What it includes:**

*Bunny Stream token auth (embed-level):*
- Server-side generates a signed embed URL per lesson per request using: `SHA256( securityKey + videoLibraryId + expiration )` encoded as Base64, appended as `?token=...&expires=...`
- Expiry: 2–4 hours (long enough for a lesson session, short enough to limit link sharing)
- Implemented in a server utility `src/lib/video/bunny-token.ts` called from the lesson page server component
- Requires new env vars: `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_EMBED_TOKEN_KEY`

*Dynamic email watermark (CSS overlay, NOT Bunny's encoded watermark):*

> **Important distinction:** Bunny's built-in watermark feature (`Add Watermark` API) encodes a static logo image into the video at upload time — it cannot show per-student dynamic text. To overlay the student's email as text, a CSS/HTML overlay is required on top of the Bunny iframe.

- `WatermarkOverlay` client component: absolutely-positioned `<div>` rendered over the video iframe, containing the student's email in low-opacity text
- Overlay is non-interactive (pointer-events: none) so it does not block playback controls
- Text moves position every N seconds (floating watermark) to prevent corner-cropping attacks
- Email is passed as a prop from the server component (already authenticated — not client-fetchable)
- Overlay cannot be removed by disabling JavaScript (the iframe itself is blocked by the embed token); removing the overlay means losing the embed token flow

**Confidence note (MEDIUM):** Bunny's documentation confirms token auth for embed URLs. The dynamic email overlay via CSS is a well-established pattern (VdoCipher, Presto Player use the same approach). Bunny's `MediaCage` DRM is available as an additional layer but is out of scope for v1 — token auth + CSS watermark is sufficient for the stated threat model (casual sharing, not sophisticated bypass).

**Scope boundary:** No server-side video re-encoding with burned-in watermark. No DRM (Widevine/FairPlay) in v1. Bunny's MediaCage can be added in v2 if screen recording becomes a real threat.

---

## Anti-Features

Features common in Brazilian course platforms that this product should deliberately NOT build, with justification for this specific niche.

### Quiz / Avaliação Intermediária com Nota

**Why not:** Out of Scope in PROJECT.md with documented rationale. Deeper justification for this niche: safety training for school staff is compliance-driven, not knowledge-testing-driven. The coordinator who contracted MDHE needs to show the school board that "100% of the security team completed the training" — not scores. Adding quizzes introduces friction (students retake to pass), support burden (grading disputes), and content authoring overhead (MDHE must write questions). The certificate-by-completion model is intentional.

### Prova Final / Aprovação por Nota Mínima

**Why not:** Same as above. If a school demands this in v2, it is an explicit product expansion, not a default behavior. Defaulting to note-based approval raises the bar to "100%" in a way the market has not asked for.

### Gamificação (Badges, Pontos, Ranking)

**Why not:** This niche consumes training content under obligation, not curiosity. Gamification is designed for consumer edtech (Duolingo model) where intrinsic motivation is low and competition is a substitute. A school security coordinator completing a "Gestão de Incidentes" course does not need a badge — they need a PDF certificate for HR. Gamification would cheapen the credential perception.

### Fórum / Comunidade entre Alunos

**Why not:** Hotmart's "Sparkle" community feature adds value in B2C knowledge products where learner-to-learner exchange is content itself. In corporate safety training, the content is prescriptive and procedural. Peer discussion forums create liability (wrong advice shared between schools) and community moderation overhead that MDHE cannot support with a small team. Not building it is a feature.

### Checkout / Pagamento Self-Service no App

**Why not:** Out of Scope with documented rationale. The commercial flow is consultative (MDHE sells to schools via relationship), not self-serve. Adding Stripe/Hotmart adds PCI compliance surface, subscription management UI, refund workflows, and fiscal nota fiscal integration — none of which MDHE is staffed to operate in v1.

### Upload em Lote de Funcionários (CSV)

**Why not:** Out of Scope. Admin invites 1-to-1 in v1. The school provides a list of 5–20 people; this is operationally manageable per contract. CSV upload introduces parsing edge cases (encoding issues with accented names, duplicate emails, validation UX) for a marginal gain when the volume is low.

### Multi-Tenant (Outras Consultorias)

**Why not:** Out of Scope. The product is MDHE's IP and MDHE's brand. Architecting multi-tenancy now (separate schemas per tenant, tenant resolution in middleware, tenant-scoped storage) would triple the infrastructure complexity for a hypothetical future need that has not been validated.

---

## Feature Dependencies (Build Order)

```
A (Catalog CRUD)
    └── B (Progress Dashboard) — needs courses + lessons to exist
        └── C (Auto Certificate) — needs progress to reach 100%
            └── D (Institution Manager) — needs certificates to surface in manager dashboard
E (Video Abstraction)
    └── F (Anti-Piracy) — Bunny token auth + watermark require Bunny player to exist
```

**Cross-dependency:** D depends on B and C being shipped first. F depends on E. A and E can be built in parallel.

---

## Commonly Missed Features in Brazilian Course Platforms (Proactive Flags)

These are features not explicitly in the A–F scope but commonly needed in this type of product. Flagged with a recommendation level.

### 1. UTM / Tracking de Origem no Lead Institucional

**What:** Capture `utm_source`, `utm_medium`, `utm_campaign` query parameters when the institutional lead form is submitted; store in `institutional_leads`.

**Why missed:** The landing page already captures leads to `institutional_leads` via the admin client. But without UTM data, MDHE cannot know whether leads came from LinkedIn ads, Google Ads, email campaigns, or organic. For a B2B consultancy spending on digital marketing, this is immediately actionable.

**Recommendation: HIGH — add to v1.** Complexity: XS. The landing page URL already supports query params; `institutional-lead-schema.ts` just needs 3 optional string fields.

---

### 2. Data de Expiração de Acesso por Enrollment (Enrollment Expiry)

**What:** Each enrollment (student ↔ course) has an `expires_at` date. After expiry, the student loses access to the course (middleware or page-level check). The admin sets the expiry when inviting/enrolling the student, defaulting to the contract end date of the institution.

**Why missed:** All major B2B LMS platforms (TalentLMS, LearnDash Groups, LearnWorlds) treat expiration as a core feature. Without it, a school that contracted a 1-year license has no technical enforcement of that contract. MDHE's admin would need to manually revoke users when contracts expire.

**Recommendation: HIGH — add to v1.** Complexity: S. Requires an `enrollments` table (or `expires_at` column on the existing implicit course access table), a middleware/query check, and an admin UI field. This is also the data model needed to properly gate course access in a multi-course catalog rather than assuming all auth'd users see all courses.

> **Note:** The current schema (migration 0011 + RLS policies) assumes enrolled students can see courses, but the explicit enrollment model with expiry is not visible in the codebase documentation. This should be verified against `0011_courses_and_certificates.sql` before implementing.

---

### 3. Legendas / Closed Captions nos Vídeos

**What:** YouTube and Bunny Stream both support VTT/SRT subtitle tracks. For safety training content (fire evacuation procedures, lockdown protocols), captions serve two purposes: accessibility for hearing-impaired staff (required for public schools under Brazilian accessibility law Decreto 5.626/2005) and comprehension in noisy environments (school corridors, cafeterias).

**Why missed:** Platforms treat captions as a media production concern, not a platform feature. But a platform that makes it easy to attach a `.vtt` file to a lesson (stored in Supabase Storage alongside materials) and passes the track URL to the video player has a concrete accessibility story.

**Recommendation: MEDIUM — defer to after core v1, but design the lesson schema to support a `caption_url` nullable field now.** Complexity: S for the data model, M for the UI (caption file upload in lesson editor).

---

### 4. NPS / Avaliação de Curso pós-Conclusão

**What:** A short (1–2 question) satisfaction survey triggered when the student receives their certificate. "Nota de 1 a 5: Como você avalia o curso?" + optional comment. Results visible to admin.

**Why missed:** Hotmart, Coursify, and virtually all Brazilian platforms surface course ratings. For MDHE, the NPS is less about marketing ("4.8 stars") and more about consultancy feedback loops — school coordinators who buy training for 50 people and find it mediocre will not renew. Capturing this programmatically is cheaper than a follow-up phone call.

**Recommendation: LOW for v1 (out of scope), MEDIUM urgency for v1.1.** Complexity: S. A single `course_reviews` table, a post-certificate survey modal, and an admin view.

---

### 5. "Retomar de Onde Parou" / Last Watched Lesson Redirect

**What:** When a student clicks "Continuar" (or opens a course they've started), they are taken directly to their last incomplete lesson rather than the course overview page.

**Why missed:** Most platforms implement this correctly; it is easy to skip in an initial build. The query logic (`getCourseWithContent` already returns `lesson_progress`) has the data; it is purely a redirect in the course overview page.

**Recommendation: HIGH — include in Feature B (Progress Dashboard).** Complexity: XS (2–3 lines of logic on `/curso/[slug]/page.tsx`). Removing friction from resuming is disproportionately valuable for compliance training where sessions are short and interrupted.

---

## Feature Summary Table

| ID | Feature | Category | Complexity | Ships in v1 |
|----|---------|----------|------------|-------------|
| A | Catalog/multi-course CRUD | Table Stakes | M | Yes |
| B | Student progress dashboard | Table Stakes | S | Yes |
| C | Auto certificate on 100% | Table Stakes | S | Yes |
| D | Institution + manager role | Differentiator | L | Yes |
| E | Video player abstraction | Table Stakes | M | Yes |
| F | Anti-piracy (token + watermark) | Differentiator | M | Yes |
| — | UTM on lead form | Table Stakes | XS | Yes (add to v1) |
| — | Enrollment expiry | Table Stakes | S | Yes (add to v1) |
| — | Resume last lesson | Table Stakes | XS | Yes (bundle with B) |
| — | Captions/subtitles | Differentiator | S (schema), M (UI) | Design schema in v1, UI in v1.1 |
| — | NPS post-certificate | Nice-to-have | S | v1.1 |

---

## Sources

- [Bunny Stream Embed Token Authentication — docs.bunny.net](https://docs.bunny.net/docs/stream-embed-token-authentication)
- [Bunny Stream Security Overview — support.bunny.net](https://support.bunny.net/hc/en-us/articles/4414548058258-Understanding-Bunny-Stream-Security-options)
- [Bunny Add Watermark API reference — docs.bunny.net](https://docs.bunny.net/reference/videolibrarypublic_addwatermark)
- [Dynamic Watermarking — VdoCipher](https://www.vdocipher.com/dynamic-watermarking/) — confirms CSS overlay pattern for per-user text watermarks
- [Enrollment Expiration (TalentLMS) — help.talentlms.com](https://help.talentlms.com/hc/en-us/articles/360014572494) — confirms industry standard for B2B expiry model
- [Hotmart Progress API — developers.hotmart.com](https://developers.hotmart.com/docs/pt-BR/v1/club/get-lessons-club/) — confirms Brazilian market standard for progress tracking
- [Acessibilidade em vídeos (Libras/Legendas) — handtalk.me](https://www.handtalk.me/br/blog/acessibilidade-em-videos-para-surdos/) — confirms legal/regulatory context for Brazilian accessibility
- [Decreto 5.626/2005] — Brazilian accessibility requirement for Libras in educational content for public institutions
