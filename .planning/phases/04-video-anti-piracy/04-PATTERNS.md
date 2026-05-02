# Phase 4: Video & Anti-Piracy — Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 12 new/modified files
**Analogs found:** 11 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/video/types.ts` | utility/types | transform | `src/lib/courses/types.ts` | exact |
| `src/lib/video/bunny-adapter.ts` | service | request-response | `src/lib/certificates/pdf.ts` | role-match |
| `src/lib/video/youtube-adapter.ts` | service | request-response | `src/lib/certificates/pdf.ts` | role-match |
| `src/lib/video/index.ts` | utility | transform | `src/lib/certificates/issuer.ts` | role-match |
| `src/lib/video/video.test.ts` | test | — | `src/lib/certificates/issuer.test.ts` | exact |
| `src/lib/env.ts` (modify) | config | — | `src/lib/env.ts` | exact (self) |
| `src/lib/lessons/schema.ts` (modify) | utility/schema | — | `src/lib/lessons/schema.ts` | exact (self) |
| `src/app/actions/create-lesson.ts` (modify) | service/action | request-response | `src/app/actions/update-lesson.ts` | exact |
| `src/lib/courses/queries.ts` (modify) | service/query | CRUD | `src/lib/courses/queries.ts` | exact (self) |
| `src/components/course/lesson-player.tsx` (modify) | component | event-driven | `src/components/course/lesson-player.tsx` | exact (self) |
| `src/app/curso/[slug]/aula/[lessonId]/page.tsx` (modify) | controller/RSC | request-response | `src/app/curso/[slug]/aula/[lessonId]/page.tsx` | exact (self) |
| `src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx` (modify) | component | request-response | `src/app/admin/cursos/[slug]/aulas/[lessonId]/lesson-edit-form.tsx` | exact |

---

## Pattern Assignments

### `src/lib/video/types.ts` (utility/types)

**Analog:** `src/lib/courses/types.ts`

**Imports pattern** (lines 1-9, courses/types.ts):
```typescript
import type { Database } from "@/lib/database.types";

export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
export type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
```

**Core type pattern** — Plain `type` exports, no classes, no default exports. All domain types co-located in one types file:
```typescript
// src/lib/video/types.ts — new file following courses/types.ts pattern
export type VideoProviderName = "youtube" | "bunny";

export type PlayableSource = {
  provider: VideoProviderName;
  embedUrl: string;
  watermarkText: string | null;  // null = no watermark (YouTube dev mode)
  ttl: number | null;            // seconds; null for YouTube (no expiry)
};

export interface VideoProvider {
  getPlayableSource(
    lesson: { video_external_id: string | null; video_url: string | null },
    user: { email: string }
  ): Promise<PlayableSource> | PlayableSource;
}
```

---

### `src/lib/video/bunny-adapter.ts` (service, request-response)

**Analog:** `src/lib/certificates/pdf.ts`

**Pattern:** Pure server-side function module, no classes, named exports only, uses Node built-ins, no Supabase client.

**Imports pattern** (pdf.ts lines 1-3):
```typescript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
```

Apply to bunny-adapter.ts:
```typescript
import { createHash } from "node:crypto";
import { getEnv } from "@/lib/env";
import type { PlayableSource, VideoProvider } from "@/lib/video/types";
```

**Core pattern** — Exported named function with typed params, no default export:
```typescript
// follows pdf.ts export async function buildCourseCertificatePdf(params: BuildCourseCertificatePdfParams): Promise<Uint8Array>
export function getBunnyPlayableSource(
  lesson: { video_external_id: string | null },
  user: { email: string }
): PlayableSource {
  const env = getEnv();
  const videoId = lesson.video_external_id ?? "";
  const libraryId = env.BUNNY_STREAM_LIBRARY_ID ?? "";
  const tokenKey = env.BUNNY_STREAM_TOKEN_KEY ?? "";
  const ttl = env.BUNNY_STREAM_TOKEN_TTL_SECONDS ?? 3600;

  const expiresUnix = Math.floor(Date.now() / 1000) + ttl;
  const token = createHash("sha256")
    .update(tokenKey + videoId + String(expiresUnix))
    .digest("hex");

  const params = new URLSearchParams({ token, expires: String(expiresUnix) });
  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;

  return { provider: "bunny", embedUrl, watermarkText: user.email, ttl };
}
```

**Error handling pattern** — Throw `new Error(...)` with Portuguese message for fatal config errors (mirrors pdf.ts pattern: `throw new Error("Falha ao baixar template do certificado (${response.status}).")`):
```typescript
if (!tokenKey || !libraryId) {
  throw new Error("Configuracao Bunny Stream incompleta. Verifique BUNNY_STREAM_TOKEN_KEY e BUNNY_STREAM_LIBRARY_ID.");
}
```

---

### `src/lib/video/youtube-adapter.ts` (service, request-response)

**Analog:** `src/lib/certificates/pdf.ts` (same pure function pattern)

**Imports pattern:**
```typescript
import type { PlayableSource, VideoProvider } from "@/lib/video/types";
```

**Core pattern** — Production guard throws RSC-visible error (500 on lesson page = intended):
```typescript
export function getYouTubePlayableSource(
  lesson: { video_external_id: string | null; video_url: string | null }
): PlayableSource {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "YouTubeUnlistedAdapter nao pode ser usado em producao. " +
      "Altere video_provider para 'bunny' antes de publicar."
    );
  }

  // Prefer video_external_id; fall back to extracting from video_url
  const videoId = lesson.video_external_id ?? extractYouTubeVideoId(lesson.video_url ?? "");
  if (!videoId) {
    throw new Error("Nao foi possivel determinar o ID do video YouTube.");
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
  return { provider: "youtube", embedUrl, watermarkText: null, ttl: null };
}
```

---

### `src/lib/video/index.ts` (utility, factory/orchestration)

**Analog:** `src/lib/certificates/issuer.ts`

**Pattern:** Orchestrating module that selects implementation, delegates to sub-functions, handles fallback. The factory function is the single public API.

**Imports pattern** (issuer.ts lines 1-8):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseCertificateRow, CourseRow } from "@/lib/courses/types";
import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildCourseCertificatePdf } from "@/lib/certificates/pdf";
```

Apply to index.ts:
```typescript
import { logger } from "@/lib/logger";
import { getBunnyPlayableSource } from "@/lib/video/bunny-adapter";
import { getYouTubePlayableSource } from "@/lib/video/youtube-adapter";
export type { PlayableSource, VideoProvider, VideoProviderName } from "@/lib/video/types";
```

**Core factory pattern** — Named export, not default. Branches on provider, falls back gracefully:
```typescript
export function getPlayableSource(
  lesson: { video_provider: string | null; video_external_id: string | null; video_url: string | null },
  user: { email: string }
): PlayableSource {
  const provider = lesson.video_provider;

  if (provider === "bunny") {
    return getBunnyPlayableSource(lesson, user);
  }

  if (provider === "youtube") {
    return getYouTubePlayableSource(lesson);
  }

  // Fallback: legacy video_url path (D-10)
  if (lesson.video_url) {
    logger.warn("Aula sem video_provider — usando fallback legacy video_url", { videoUrl: lesson.video_url });
    return getYouTubePlayableSource({ video_external_id: null, video_url: lesson.video_url });
  }

  throw new Error("Aula sem configuracao de video. Configure video_provider e video_external_id.");
}
```

**Error handling** — Mirrors issuer.ts pattern: `logger.error(...)` then `throw new Error(...)` with Portuguese message.

---

### `src/lib/video/video.test.ts` (test)

**Analog:** `src/lib/certificates/issuer.test.ts`

**Pattern:** Vitest `describe/it/expect`, dependency injection via function params (no module mocking), factory functions for test data, no jsdom.

**Imports pattern** (issuer.test.ts lines 1-3):
```typescript
import { describe, expect, it, vi } from "vitest";
import { COURSE_CERTIFICATES_BUCKET, ensureCourseCertificateIssued } from "@/lib/certificates/issuer";
```

Apply to video.test.ts:
```typescript
import { describe, expect, it } from "vitest";
import { getPlayableSource } from "@/lib/video/index";
import { getBunnyPlayableSource } from "@/lib/video/bunny-adapter";
import { getYouTubePlayableSource } from "@/lib/video/youtube-adapter";
```

**Test structure pattern** — Test groups mirror requirements (VID-01, VID-02, VID-03, AP-02):
```typescript
describe("video/bunny-adapter", () => {
  it("produces hex SHA256 token (not base64, not HMAC)", () => { ... });
  it("includes expires within TTL window (AP-02: TTL <= 4h)", () => { ... });
  it("embed URL contains libraryId/videoId/token/expires", () => { ... });
});

describe("video/youtube-adapter", () => {
  it("throws in production (VID-02)", () => {
    const originalEnv = process.env.NODE_ENV;
    // set NODE_ENV=production, expect throw
  });
  it("returns youtube embedUrl in dev", () => { ... });
});

describe("video/index (factory)", () => {
  it("routes bunny provider to bunny adapter", () => { ... });
  it("routes youtube provider to youtube adapter", () => { ... });
  it("falls back to legacy video_url when video_provider is null", () => { ... });
});
```

**Key testing note:** The adapters are pure functions with no Supabase client. No mock client setup needed — unlike issuer.test.ts. Pass `process.env.BUNNY_STREAM_TOKEN_KEY` etc. as direct function args or set via env overrides.

---

### `src/lib/env.ts` (modify — config)

**Analog:** `src/lib/env.ts` (self)

**Pattern:** Add three new vars to `serverSchema.extend()`. Follow the `SUPABASE_SERVICE_ROLE_KEY` pattern exactly for prod-required vars:

**Existing prod-required pattern** (env.ts lines 35-46):
```typescript
SUPABASE_SERVICE_ROLE_KEY: z
  .string()
  .optional()
  .superRefine((v, ctx) => {
    if (process.env.NODE_ENV === "production" && !v) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "SUPABASE_SERVICE_ROLE_KEY is required in production. Set it in your Vercel environment variables.",
      });
    }
  }),
```

**Apply same pattern for Bunny vars** (add inside `serverSchema.extend({})`):
```typescript
BUNNY_STREAM_TOKEN_KEY: z
  .string()
  .optional()
  .superRefine((v, ctx) => {
    if (process.env.NODE_ENV === "production" && !v) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BUNNY_STREAM_TOKEN_KEY is required in production.",
      });
    }
  }),
BUNNY_STREAM_LIBRARY_ID: z
  .string()
  .optional()
  .superRefine((v, ctx) => {
    if (process.env.NODE_ENV === "production" && !v) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BUNNY_STREAM_LIBRARY_ID is required in production.",
      });
    }
  }),
BUNNY_STREAM_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
```

---

### `src/lib/lessons/schema.ts` (modify — schema)

**Analog:** `src/lib/lessons/schema.ts` (self — updateLessonSchema already has new fields)

**What already exists** (schema.ts lines 121-131):
```typescript
export const updateLessonSchema = z.object({
  lessonId: z.string().uuid({ message: "Aula inválida." }),
  title: z.string().trim().min(1, { message: "Título da aula é obrigatório." }),
  description: nullableOptionalString,
  videoProvider: nullableOptionalString,
  videoExternalId: nullableOptionalString,
  workloadMinutes: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
});
```

**What needs to change** — `createLessonSchema` (lines 38-107): replace `videoUrl: z.string().url()` (line 51) with optional provider fields, and make `videoUrl` optional for backward compatibility:
```typescript
// Replace line 51:
//   videoUrl: z.string({ required_error: "Informe a URL do video" }).trim().url({ message: "Informe uma URL valida." }),
// With:
videoProvider: z.string().trim().optional().transform((v) => v && v.length > 0 ? v : null),
videoExternalId: z.string().trim().optional().transform((v) => v && v.length > 0 ? v : null),
videoUrl: z.string().trim().url({ message: "Informe uma URL valida." }).optional().nullable(),
```

Export updated type:
```typescript
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
```

---

### `src/app/actions/create-lesson.ts` (modify — server action)

**Analog:** `src/app/actions/update-lesson.ts`

**Pattern:** "use server" directive, `safeParse` on FormData, `requireAdminUser` helper, Supabase insert with typed columns, `logger.error` + return `{ success: false, message }` on DB error.

**Imports pattern** (update-lesson.ts lines 1-11):
```typescript
"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { LessonFormState } from "@/app/actions/lesson-form-state";
import { fetchUserRole } from "@/lib/auth/roles";
import type { Database } from "@/lib/database.types";
import { deleteLessonSchema, reorderLessonSchema, restoreLessonSchema, updateLessonSchema } from "@/lib/lessons/schema";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
```

**FormData parsing pattern** (update-lesson.ts lines 45-52):
```typescript
const parsed = updateLessonSchema.safeParse({
  lessonId: formData.get("lesson_id"),
  title: formData.get("title"),
  description: formData.get("description"),
  videoProvider: formData.get("video_provider"),
  videoExternalId: formData.get("video_external_id"),
  workloadMinutes: formData.get("workload_minutes"),
});
```

Apply pattern to create-lesson.ts — update the `safeParse` call to use new schema fields:
```typescript
// Replace current: videoUrl: formData.get("video_url"),
// With:
videoProvider: formData.get("video_provider"),
videoExternalId: formData.get("video_external_id"),
```

**DB insert pattern** (create-lesson.ts lines 124-135) — update the insert to write new columns:
```typescript
// Replace: video_url: parsed.data.videoUrl,
// With:
video_provider: parsed.data.videoProvider ?? null,
video_external_id: parsed.data.videoExternalId ?? null,
// Keep video_url: null (not written — existing lessons have null, which is valid per D-09)
```

**Error handling pattern** (update-lesson.ts lines 79-82):
```typescript
if (error) {
  logger.error("Falha ao atualizar aula", { error: error.message });
  return { success: false, message: "Não foi possível salvar a aula. Tente novamente." };
}
```

---

### `src/lib/courses/queries.ts` (modify — query)

**Analog:** `src/lib/courses/queries.ts` (self — add columns to select string)

**Current select string** (queries.ts lines 370-393):
```typescript
.select(
  `
    id,
    module_id,
    title,
    description,
    video_url,
    position,
    created_at,
    materials ( ... )
  `,
)
```

**Required change** — Add `video_provider, video_external_id` after `video_url`:
```typescript
.select(
  `
    id,
    module_id,
    title,
    description,
    video_url,
    video_provider,
    video_external_id,
    position,
    created_at,
    materials ( ... )
  `,
)
```

No other changes to queries.ts. The `LessonRow` type from `database.types.ts` already includes these columns; TypeScript will pick them up automatically once they appear in the select string.

---

### `src/components/course/lesson-player.tsx` (modify — component, event-driven)

**Analog:** `src/components/course/lesson-player.tsx` (self — refactor)

**Pattern preserved:** `"use client"` directive, `useCallback`/`useEffect`/`useState`/`useRef`, manual completion button always rendered, `markLessonAsCompleted` callback with `completionRef` + `savingRef` guards.

**Props type change** — replace raw `lesson: LessonWithMaterials` with explicit pre-resolved props (lines 7-10 currently):
```typescript
// Current:
type LessonPlayerProps = {
  lesson: LessonWithMaterials;
  initialIsCompleted: boolean;
};

// Replace with (D-01, D-05, D-06):
type LessonPlayerProps = {
  embedUrl: string;
  provider: "youtube" | "bunny";
  watermarkText: string | null;
  lessonId: string;
  lessonTitle: string;
  lessonDescription: string | null;
  initialIsCompleted: boolean;
};
```

**Remove entirely** (lines 12-100): All YouTube IFrame API global machinery — `YouTubePlayer`, `YouTubeApi`, `declare global { Window }`, `loadYouTubeIframeApi()`, `playerRef`, `playerElementRef`. Also remove `useMemo`, `youtubeVideoId`, `fallbackEmbedUrl` derivations.

**Replace YouTube API `useEffect` (lines 172-208) with postMessage `useEffect`:**
```typescript
useEffect(() => {
  function handleMessage(event: MessageEvent) {
    // Bunny Stream: Player.js protocol (D-12, verified via Player.js spec)
    if (
      typeof event.data === "object" &&
      event.data !== null &&
      (event.data as Record<string, unknown>).context === "player.js" &&
      (event.data as Record<string, unknown>).event === "ended"
    ) {
      void markLessonAsCompleted("video-end");
      return;
    }

    // YouTube: infoDelivery with playerState 0 (ENDED) (D-14)
    if (typeof event.data === "string") {
      try {
        const parsed = JSON.parse(event.data) as { event?: string; info?: { playerState?: number } };
        if (parsed.event === "infoDelivery" && parsed.info?.playerState === 0) {
          void markLessonAsCompleted("video-end");
        }
      } catch {
        // not a JSON message — ignore
      }
    }
  }

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, [markLessonAsCompleted]);
```

**Add WatermarkOverlay sub-component** (new, co-located in same file or extracted):
```typescript
function WatermarkOverlay({ text }: { text: string }) {
  const [corner, setCorner] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCorner((c) => ((c + 1) % 4) as 0 | 1 | 2 | 3);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const positionClass = [
    "top-3 left-3",
    "top-3 right-3",
    "bottom-12 right-3",
    "bottom-12 left-3",
  ][corner];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${positionClass} select-none text-sm font-semibold text-white transition-opacity duration-500`}
      style={{ opacity: 0.12 }}
    >
      {text}
    </div>
  );
}
```

**Video render block** — replace the two-branch `youtubeVideoId`/`fallbackEmbedUrl` block (lines 218-237) with a single iframe + optional watermark overlay:
```typescript
<div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-black">
  <iframe
    title={lessonTitle}
    src={embedUrl}
    className="h-full w-full"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
    loading="lazy"
  />
  {watermarkText !== null && <WatermarkOverlay text={watermarkText} />}
</div>
```

**Completion fetch pattern** (lines 120-169) — unchanged except `lesson.id` becomes `lessonId` prop.

---

### `src/app/curso/[slug]/aula/[lessonId]/page.tsx` (modify — RSC controller)

**Analog:** `src/app/curso/[slug]/aula/[lessonId]/page.tsx` (self — add server-side resolution)

**Existing auth pattern** (page.tsx lines 23-36): Preserve exactly — `createSupabaseServerClient`, `getUser`, redirect on no user.

**Add import and call** — after `getLessonWithCourseContext`, call `getPlayableSource`:
```typescript
import { getPlayableSource } from "@/lib/video";

// After: const context = await getLessonWithCourseContext(slug, lessonId, supabase, user.id);
// Add:
const playableSource = getPlayableSource(context.lesson, { email: user.email ?? "" });
```

**Update LessonPlayer call** (currently line 79):
```typescript
// Current:
<LessonPlayer lesson={context.lesson} initialIsCompleted={context.lesson.isCompleted} />

// Replace with:
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

**Auth pattern preserved** (page.tsx lines 23-36):
```typescript
const supabase = await createSupabaseServerClient();
const {
  data: { user },
  error,
} = await supabase.auth.getUser();

if (error) {
  logger.error("Failed to load authenticated session", error.message);
}

if (!user) {
  const search = new URLSearchParams({ redirectTo: `/curso/${slug}/aula/${lessonId}` });
  redirect(`/login?${search.toString()}`);
}
```

---

### `src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx` (modify — component)

**Analog:** `src/app/admin/cursos/[slug]/aulas/[lessonId]/lesson-edit-form.tsx`

**Props change** — add `isProduction: boolean` (matches lesson-edit-form.tsx lines 26-32):
```typescript
export function AddLessonForm({
  moduleId,
  courseSlug,
  isProduction,
}: {
  moduleId: string;
  courseSlug: string;
  isProduction: boolean;
}) {
```

**Video section pattern** — copy from lesson-edit-form.tsx lines 100-137 verbatim:
```typescript
<section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
    CONFIGURAÇÃO DE VÍDEO
  </p>

  <label className="flex flex-col gap-2">
    <span className="text-sm font-medium text-slate-700">Plataforma de vídeo</span>
    <div className="relative">
      <select
        name="video_provider"
        defaultValue="bunny"
        className="w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      >
        <option value="bunny">Bunny Stream</option>
        {!isProduction && (
          <option value="youtube">YouTube (apenas dev)</option>
        )}
      </select>
    </div>
    <p className="text-xs text-slate-500">
      Em produção, use Bunny Stream. YouTube é apenas para desenvolvimento.
    </p>
  </label>

  <label className="flex flex-col gap-2">
    <span className="text-sm font-medium text-slate-700">ID do vídeo</span>
    <input
      type="text"
      name="video_external_id"
      placeholder="ID do vídeo no provider selecionado"
      className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
    />
    {state.fieldErrors?.videoExternalId && (
      <p className="text-xs text-red-600">{state.fieldErrors.videoExternalId[0]}</p>
    )}
  </label>
</section>
```

**Remove `video_url` field** — the form currently has no video section at all (add-lesson-form.tsx lines 52-66 only show title). After modification, the video section above replaces the old `video_url` text input that was in older versions; no removal needed since the form never had it in the current codebase.

**State type change** — `state.fieldErrors` may need `videoExternalId` added. The `CreateLessonFormState` type in `create-lesson-state.ts` mirrors `LessonFormState`; it should be checked and updated to include the new field errors.

---

## Shared Patterns

### Server-Only Module Guard
**Source:** Decision D-03 / pattern from `src/lib/env.ts` (serverSchema)
**Apply to:** `src/lib/video/bunny-adapter.ts`, `src/lib/video/index.ts`

All functions in these files call `getEnv()` from `@/lib/env`. This function is server-only (calls `process.env` and caches in module scope). The `"use server"` directive is NOT needed for lib modules — they are server-only by virtue of being imported only from RSC `page.tsx`. Do not add `"use server"` to lib files.

### Zod safeParse + fieldErrors Response
**Source:** `src/app/actions/update-lesson.ts` (lines 54-60)
**Apply to:** `src/app/actions/create-lesson.ts` (modify)
```typescript
if (!parsed.success) {
  return {
    success: false,
    message: "Revise os dados informados.",
    fieldErrors: parsed.error.flatten().fieldErrors,
  };
}
```

### logger.error on DB/system failures
**Source:** `src/lib/certificates/issuer.ts` (lines 120-126, 157-163)
**Apply to:** `src/lib/video/index.ts`, `src/app/actions/create-lesson.ts`
```typescript
logger.error("Falha ao <operação>", {
  userId: params.userId,
  error: error.message,
});
throw new Error("Nao foi possivel <resultado>.");
```

### Admin role check in Server Actions
**Source:** `src/app/actions/update-lesson.ts` (lines 17-39, the `requireAdminUser()` helper)
**Apply to:** `src/app/actions/create-lesson.ts` (already has inline role check — optionally refactor to use `requireAdminUser` from update-lesson.ts, but do not duplicate the helper; import it or keep inline pattern consistent)

### useActionState + SubmitButton via useFormStatus
**Source:** `src/app/admin/cursos/[slug]/aulas/[lessonId]/lesson-edit-form.tsx` (lines 11-24, 33-36)
**Apply to:** `src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx`
```typescript
const [state, formAction] = useActionState<CreateLessonFormState, FormData>(
  createLessonAction,
  initialState,
);
// SubmitButton uses useFormStatus for pending state — do not lift into parent
```

### Success/error banner pattern
**Source:** `src/app/admin/cursos/[slug]/aulas/[lessonId]/lesson-edit-form.tsx` (lines 139-151)
**Apply to:** `src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx`
```typescript
{state.message && (
  <div
    role="status"
    aria-live="polite"
    className={`rounded-lg px-3 py-2 text-sm border ${
      state.success
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-red-200 bg-red-50 text-red-700"
    }`}
  >
    {state.message}
  </div>
)}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `docs/anti-piracy.md` | documentation | — | No docs/ directory exists yet; no analog. RESEARCH.md (AP-04) describes the content requirement: document overlay as deterrence, not DRM, acknowledge screen recording is still possible. |

---

## Key Anti-Patterns (Do Not Apply)

- **Do not HMAC the Bunny token.** Use `createHash('sha256')`, not `createHmac('sha256', key)`.
- **Do not base64 the token.** Use `.digest("hex")`.
- **Do not call `getPlayableSource()` in a Client Component.** It must stay in the RSC `page.tsx`.
- **Do not filter postMessage by `event.origin`.** Use `data.context === 'player.js'` for Bunny; `typeof event.data === 'string'` guard for YouTube.
- **Do not re-use the YouTube IFrame API global** (`window.YT`). Remove it entirely — postMessage replaces it.

---

## Metadata

**Analog search scope:** `src/lib/`, `src/app/actions/`, `src/components/course/`, `src/app/curso/`, `src/app/admin/cursos/`
**Files scanned:** 14 source files read in full
**Pattern extraction date:** 2026-04-30
