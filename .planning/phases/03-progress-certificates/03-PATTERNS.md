# Phase 3: Progress & Certificates - Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 7
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/courses/queries.ts` | service/query | CRUD (read+transform) | itself (`getCourseWithContent` deleted_at filter) | exact |
| `src/lib/courses/types.ts` | model/type | — | itself (`ProgressStats` extension pattern) | exact |
| `src/app/api/lesson-progress/complete/route.ts` | API route handler | request-response | itself (current `issueCertificateBestEffort` pattern) | exact |
| `src/components/course/lesson-player.tsx` | client component | event-driven | itself (existing `showCompletionBanner` state slot) | exact |
| `src/app/dashboard/page.tsx` | RSC page | request-response | itself (existing course card `Link` block) | exact |
| `src/app/admin/cursos/[slug]/course-edit-form.tsx` | client form component | request-response | itself (existing `lifecycleFeedback` controlled-state pattern) | exact |
| `src/lib/courses/schema.ts` | validation/schema | — | itself (no changes needed — all cert fields already present) | exact |

---

## Pattern Assignments

### `src/lib/courses/types.ts` (model, type extension)

**Analog:** itself — `ProgressStats` definition (line 12–16) and `CourseSummary` (line 18)

**Current type shape** (lines 12–18):
```typescript
export type ProgressStats = {
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
};

export type CourseSummary = CourseRow & ProgressStats;
```

**Required change — add `nextLessonId` to `ProgressStats`:**
```typescript
export type ProgressStats = {
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  nextLessonId: string | null;      // ← new field (D-05)
};
```

**Why ProgressStats, not CourseSummary directly:** `buildProgressStats` in `queries.ts` (line 55–58) returns `ProgressStats`. Adding `nextLessonId` there keeps the type and its builder in sync. The `getLessonWithCourseContext` consumer spreads `buildProgressStats(0, 0)` — after this change it must also supply `nextLessonId: null` explicitly.

**Cascade consumer that needs a fix — `getLessonWithCourseContext` return** (lines 410–417 of `queries.ts`):
```typescript
return {
  course: {
    ...course,
    ...buildProgressStats(0, 0),   // ← TypeScript will error: nextLessonId missing
  },
  module: lessonModule,
  lesson: normalizedLesson,
};
```
Fix: pass `nextLessonId: null` into `buildProgressStats` call site OR add it explicitly to the spread:
```typescript
return {
  course: {
    ...course,
    ...buildProgressStats(0, 0),
    nextLessonId: null,             // ← explicit fix for the context-only path
  },
  module: lessonModule,
  lesson: normalizedLesson,
};
```

---

### `src/lib/courses/queries.ts` (service, CRUD read+transform)

**Analog:** itself — `getCourseWithContent` deleted_at filter pattern (lines 241–255) and `getAvailableCourses` (lines 91–160)

**Imports pattern** (lines 1–20): no new imports needed; all types and utilities already imported.

**Change 1 — `CourseSummaryQueryResult` type** (line 31): extend to include `position` and `deleted_at` on both modules and lessons:
```typescript
// Before (line 31):
type CourseSummaryQueryResult = CourseRow & {
  modules: ({ lessons: Pick<LessonRow, "id">[] | null } & Pick<ModuleRow, "id">)[] | null;
};

// After:
type CourseSummaryQueryResult = CourseRow & {
  modules: ({
    lessons: Pick<LessonRow, "id" | "position" | "deleted_at">[] | null;
  } & Pick<ModuleRow, "id" | "position">)[] | null;
};
```

**Change 2 — Supabase select string in `getAvailableCourses`** (lines 111–116):
```typescript
// Before:
modules (
  id,
  lessons (
    id
  )
)

// After:
modules (
  id,
  position,
  lessons (
    id,
    position,
    deleted_at
  )
)
```

**Change 3 — D-12: filter soft-deleted lessons before building `lessonIds`** (lines 129–132):
```typescript
// Before:
const lessonsByCourse = courses.map((course) => ({
  course,
  lessonIds: (course.modules ?? []).flatMap((module) => (module.lessons ?? []).map((lesson) => lesson.id)),
}));

// After:
const lessonsByCourse = courses.map((course) => ({
  course,
  lessonIds: (course.modules ?? []).flatMap((module) =>
    (module.lessons ?? [])
      .filter((lesson) => !lesson.deleted_at)           // D-12
      .map((lesson) => lesson.id)
  ),
}));
```

**Change 4 — add `nextLessonId` computation after `completedLessons`** (inside the `.map` callback at lines 137–158):

The `computeNextLessonId` helper follows the same in-memory sort pattern used in `getAdminModuleWithLessons` (lines 538–540):
```typescript
// Analog for in-memory sort: getAdminModuleWithLessons lines 538–540
.filter((lesson) => !lesson.deleted_at)
.sort((a, b) => a.position - b.position),
```

New helper function (add near `buildProgressStats`):
```typescript
function computeNextLessonId(
  modules: Array<{
    id: string;
    position: number;
    lessons: Array<{ id: string; position: number; deleted_at: string | null }> | null;
  }>,
  progressMap: Map<string, { status: string }>,
): string | null {
  const orderedLessons = modules
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap((module) =>
      (module.lessons ?? [])
        .filter((lesson) => !lesson.deleted_at)
        .slice()
        .sort((a, b) => a.position - b.position),
    );

  const firstIncomplete = orderedLessons.find(
    (lesson) => progressMap.get(lesson.id)?.status !== "COMPLETED",
  );

  return firstIncomplete?.id ?? null;
}
```

Updated `buildProgressStats` signature (or keep as-is and pass `nextLessonId` separately — the cleanest approach to avoid overloading the helper):
```typescript
// Option A: extend buildProgressStats
function buildProgressStats(
  totalLessons: number,
  completedLessons: number,
  nextLessonId: string | null = null,
): ProgressStats {
  const completionPercentage = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;
  return { totalLessons, completedLessons, completionPercentage, nextLessonId };
}
```

Updated return object in `getAvailableCourses` map callback:
```typescript
return lessonsByCourse.map(({ course, lessonIds }) => {
  const completedLessons = lessonIds.reduce((total, lessonId) => {
    const status = progressByLessonId.get(lessonId)?.status;
    return total + (status === "COMPLETED" ? 1 : 0);
  }, 0);

  const nextLessonId = completedLessons === 0
    ? null
    : computeNextLessonId(course.modules ?? [], progressByLessonId);

  return {
    id: course.id,
    slug: course.slug,
    // ... all other existing fields unchanged ...
    ...buildProgressStats(lessonIds.length, completedLessons, nextLessonId),
  };
});
```

**Error handling pattern** — unchanged; follows existing `logger.error` + `return []` pattern at lines 123–126:
```typescript
if (error) {
  logger.error("Falha ao carregar cursos disponiveis", error.message);
  return [];
}
```

---

### `src/app/api/lesson-progress/complete/route.ts` (API route handler, request-response)

**Analog:** itself — `issueCertificateBestEffort` (lines 147–161) and main handler success paths (lines 94–97, 107–110)

**Auth pattern** (lines 20–33): unchanged — `createSupabaseServerClient().auth.getUser()` + 401 on no user.

**Change 1 — `issueCertificateBestEffort` return type** (lines 147–161):
```typescript
// Before (returns void):
async function issueCertificateBestEffort(userId: string, courseId: string) {
  try {
    const result = await ensureCourseCertificateIssued({ userId, courseId });
    if (result.status === "issued") {
      logger.info("Certificado emitido automaticamente apos concluir aula", { userId, courseId, certificateId: result.certificate.id });
    }
  } catch (error) {
    logger.warn("Falha no modo best effort para emissao de certificado", {
      userId, courseId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// After (returns Promise<boolean>):
async function issueCertificateBestEffort(userId: string, courseId: string): Promise<boolean> {
  try {
    const result = await ensureCourseCertificateIssued({ userId, courseId });
    if (result.status === "issued") {
      logger.info("Certificado emitido automaticamente apos concluir aula", { userId, courseId, certificateId: result.certificate.id });
    }
    return result.status === "issued" || result.status === "already_issued";
  } catch (error) {
    logger.warn("Falha no modo best effort para emissao de certificado", {
      userId, courseId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;  // best-effort: never block main response
  }
}
```

**Change 2 — capture return value + include in response** (both success paths at lines 94–97 and 107–110):
```typescript
// Normal path (was line 94–97):
if (!error) {
  const isCourseCompleted = await issueCertificateBestEffort(user.id, courseId);
  return NextResponse.json({ ok: true, isCourseCompleted });
}

// Admin fallback path (was lines 107–110):
if (!adminError) {
  logger.warn("Fallback com service role para atualizar progresso de aula", { userId: user.id, lessonId });
  const isCourseCompleted = await issueCertificateBestEffort(user.id, courseId);
  return NextResponse.json({ ok: true, isCourseCompleted });
}
```

**Error handling pattern** — unchanged; all error paths (lines 119, 126–130, 141–144) keep their existing `NextResponse.json({ error: ... }, { status: 5xx })` shape.

---

### `src/components/course/lesson-player.tsx` (client component, event-driven)

**Analog:** itself — existing `useState` / `useCallback` / fetch pattern (lines 102–165, 234–254)

**Imports** (line 3): no new imports needed; `useState` already imported.

**Change 1 — add `showCompletionBanner` state** (after line 105, alongside existing state declarations):
```typescript
const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
const [isSaving, setIsSaving] = useState(false);
const [completionError, setCompletionError] = useState<string | null>(null);
const [showCompletionBanner, setShowCompletionBanner] = useState(false);  // ← new (D-03)
```

**Change 2 — parse success response body and set banner flag** (inside `markLessonAsCompleted` `try` block, replacing lines 148–149):
```typescript
// Before:
completionRef.current = true;
setIsCompleted(true);

// After — restructure the response handling:
if (!response.ok) {
  const responseBody = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
  const apiMessage = responseBody?.message?.trim();
  const fallbackMessage =
    response.status === 401
      ? "Sua sessao expirou. Faca login novamente."
      : "Nao foi possivel marcar a aula como concluida. Tente novamente.";
  throw new Error(apiMessage && apiMessage.length > 0 ? apiMessage : fallbackMessage);
}

// Parse success body (error path always throws, so body is not consumed):
const responseBody = (await response.json().catch(() => null)) as { ok: boolean; isCourseCompleted?: boolean } | null;
completionRef.current = true;
setIsCompleted(true);
if (responseBody?.isCourseCompleted === true) {
  setShowCompletionBanner(true);
}
```

**Change 3 — banner markup in JSX** (inside `<div className="space-y-2">` at line 234, BEFORE the `<div className="flex flex-wrap items-center gap-3">` button row):
```tsx
<div className="space-y-2">
  {showCompletionBanner ? (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700"
    >
      Curso concluído!{" "}
      <a
        href="/dashboard"
        className="font-semibold underline hover:text-emerald-800"
      >
        Seu certificado está disponível no painel.
      </a>
    </div>
  ) : null}
  <div className="flex flex-wrap items-center gap-3">
    {/* existing button row unchanged */}
  </div>
  <p className="text-xs text-slate-500">Ao terminar o video, a aula e marcada automaticamente como concluida.</p>
  {completionError ? <p className="text-xs text-red-600">{completionError}</p> : null}
</div>
```

**Styling reference** — the emerald banner matches the existing success feedback pattern in `course-edit-form.tsx` (lines 232–242):
```tsx
className={`rounded-lg px-3 py-2 text-sm border ${
  state.success
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700"
}`}
```

---

### `src/app/dashboard/page.tsx` (RSC page, request-response)

**Analog:** itself — existing course card `<Link>` block (lines 192–197) and admin section multi-button layout (lines 114–139)

**Change 1 — replace single `<Link>` with conditional button states** (lines 192–197):

The multi-button pattern to copy from is the admin section at lines 114–139 (primary + secondary button in a flex-wrap container):
```tsx
<div className="flex flex-wrap items-center gap-2">
  <Link
    href="/admin"
    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
  >
    Gerenciar cursos
  </Link>
  <Link
    href="..."
    className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
  >
    Cadastrar aula
  </Link>
</div>
```

**Required replacement** (copy button class tokens verbatim from existing card `<Link>` and admin section):
```tsx
<div className="mt-4 flex flex-wrap items-center gap-2">
  {course.completedLessons === 0 ? (
    /* State A: no progress */
    <Link
      href={`/curso/${course.slug}`}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
    >
      Entrar no curso
    </Link>
  ) : course.completedLessons >= course.totalLessons && course.totalLessons > 0 ? (
    /* State C: 100% complete */
    <>
      {course.certificate_enabled && (
        <Link
          href="#certificados"
          className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Meus Certificados
        </Link>
      )}
      <Link
        href={`/curso/${course.slug}`}
        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Rever curso
      </Link>
    </>
  ) : (
    /* State B: partial progress */
    <>
      <Link
        href={`/curso/${course.slug}/aula/${course.nextLessonId}`}
        className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
      >
        Continuar de onde parei
      </Link>
      <Link
        href={`/curso/${course.slug}`}
        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Ver curso
      </Link>
    </>
  )}
</div>
```

**Change 2 — add `id="certificados"` wrapper around `<MyCertificates>`** (line 143):
```tsx
// Before (line 143):
{role !== "admin" ? <MyCertificates certificates={studentCertificates} /> : null}

// After:
{role !== "admin" ? (
  <section id="certificados">
    <MyCertificates certificates={studentCertificates} />
  </section>
) : null}
```

---

### `src/app/admin/cursos/[slug]/course-edit-form.tsx` (client form component, request-response)

**Analog:** itself — `lifecycleFeedback` controlled state pattern (lines 57, 244–256) and `slugTouched` boolean state pattern (lines 48, 132)

**Change 1 — add `certificateEnabled` controlled state** (after line 57, alongside existing state declarations):
```typescript
// Existing pattern to copy:
const [lifecycleFeedback, setLifecycleFeedback] = useState<{ success: boolean; message: string } | null>(null);

// New state (same pattern — boolean from course prop):
const [certificateEnabled, setCertificateEnabled] = useState(course.certificate_enabled ?? false);
```

**Change 2 — convert `defaultChecked` to controlled `checked`** (lines 165–172 — the certificate_enabled checkbox):
```tsx
// Before (line 165–170):
<input
  type="checkbox"
  name="certificate_enabled"
  defaultChecked={course.certificate_enabled}
  className="h-4 w-4 rounded border-slate-300"
/>

// After:
<input
  type="checkbox"
  name="certificate_enabled"
  checked={certificateEnabled}
  onChange={(e) => setCertificateEnabled(e.target.checked)}
  className="h-4 w-4 rounded border-slate-300"
/>
```

**Change 3 — add explanatory paragraph** (immediately after the checkbox `<label>` block, before `<FieldError>`):
```tsx
<p className="text-xs text-slate-500">
  O certificado é emitido automaticamente quando o aluno conclui 100% das aulas.
  Adicionar novas aulas não invalida certificados já emitidos.
</p>
```

**Change 4 — wrap the four dependent fields in a visibility container** (wrapping the two `<div className="grid gap-4 md:grid-cols-2">` blocks at lines 175–228):

The `hidden` class pattern matches Tailwind v4 — use `className={certificateEnabled ? "" : "hidden"}`:
```tsx
<div className={certificateEnabled ? "" : "hidden"}>
  {/* grid with template URL + workload hours (lines 175–201) */}
  {/* grid with signer name + signer role (lines 203–227) */}
</div>
```

**Change 5 — add hint text to template URL field** (after the existing `<input>` for `certificate_template_url`, before its `<FieldError>`):
```tsx
<p className="text-xs text-slate-500">
  Faça upload da imagem no bucket público do Supabase Storage e cole a URL aqui.
  Formato recomendado: PNG landscape 1754×1240 px.
</p>
```

**No action or schema changes:** `updateCourseAction` (in `src/app/actions/upsert-course.ts`) already reads all five certificate fields from `FormData` and persists them. `updateCourseSchema` in `src/lib/courses/schema.ts` already validates them (lines 69–155 of schema.ts). The `<form action={formAction}>` wiring (line 100) is unchanged.

---

### `src/lib/courses/schema.ts` (validation, no changes needed)

**No modifications required.** All certificate fields are already present in `baseCourseSchema` (lines 81–95) and validated by `validateCertificateFields` (lines 98–143). `updateCourseSchema` extends `baseCourseSchema` and calls the validator.

The `certificateEnabledSchema` (lines 18–33) correctly handles the HTML checkbox `"on"` string value from `FormData`, so the controlled `checked` change in the form does not affect schema validation.

---

## Shared Patterns

### Controlled boolean state from prop
**Source:** `src/app/admin/cursos/[slug]/course-edit-form.tsx` lines 47–57
**Apply to:** `certificateEnabled` state addition in `course-edit-form.tsx`
```typescript
const [lifecycleFeedback, setLifecycleFeedback] = useState<{ success: boolean; message: string } | null>(null);
// Pattern: initialize useState directly from a prop; update via setter in event handler
```

### Inline success/error feedback banner (emerald/red)
**Source:** `src/app/admin/cursos/[slug]/course-edit-form.tsx` lines 230–256
**Apply to:** `showCompletionBanner` in `lesson-player.tsx`
```tsx
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
```

### Best-effort async function that never throws
**Source:** `src/app/api/lesson-progress/complete/route.ts` lines 147–161
**Apply to:** same file — the refactored `issueCertificateBestEffort`
```typescript
async function issueCertificateBestEffort(userId: string, courseId: string) {
  try { /* ... */ }
  catch (error) {
    logger.warn("...", { error: error instanceof Error ? error.message : String(error) });
    // never re-throw — keeps main response clean
  }
}
```

### In-memory sort + filter on query results
**Source:** `src/lib/courses/queries.ts` lines 538–540 (`getAdminModuleWithLessons`)
**Apply to:** `computeNextLessonId` helper in `queries.ts`
```typescript
(moduleData.lessons ?? [])
  .filter((lesson) => !lesson.deleted_at)
  .sort((a, b) => a.position - b.position),
```

### Supabase mock client for unit tests
**Source:** `src/lib/courses/queries.test.ts` lines 16–43
**Apply to:** new test cases in `queries.test.ts` for `nextLessonId` computation
```typescript
function makeQuery(response: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
}

const client = {
  from: vi.fn(() => coursesQuery),
} as unknown as SupabaseClient<Database>;
```

For `getAvailableCourses` tests, the mock must chain `.not()`, `.is()`, and `.order()`:
```typescript
const coursesQuery = {
  select: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [...], error: null }),
};
```

### `resolveClient` pattern (optional client injection)
**Source:** `src/lib/courses/queries.ts` lines 47–53
**Apply to:** all query function signatures — pass `client?` for testability
```typescript
async function resolveClient(client?: SupabaseServerClient) {
  if (client) return client;
  return createSupabaseServerClient();
}
// Usage: const supabase = await resolveClient(client);
```

### Auth guard in RSC page
**Source:** `src/app/dashboard/page.tsx` lines 21–34
**Apply to:** no new pages in Phase 3; existing guard unchanged
```typescript
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) {
  const search = new URLSearchParams({ redirectTo: "/dashboard" });
  redirect(`/login?${search.toString()}`);
}
```

---

## Test Patterns

### Pattern for `nextLessonId` unit tests (new cases in `queries.test.ts`)

Copy the fixture shape from the existing `getAvailableCourses` test (lines 46–83) but add `position` and `deleted_at` to module/lesson objects. Use a two-round-trip mock (courses query + progress query):

```typescript
// The progress query mock needs: .select().eq().in() → resolves data
const progressQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockResolvedValue({ data: [/* progress rows */], error: null }),
};

const client = {
  from: vi.fn((table: string) => {
    if (table === "courses") return coursesQuery;
    if (table === "lesson_progress") return progressQuery;
    throw new Error(`Unexpected table: ${table}`);
  }),
} as unknown as SupabaseClient<Database>;
```

Fixture module shape (with new fields):
```typescript
const modules = [
  {
    id: "module-1",
    position: 1,
    lessons: [
      { id: "lesson-a", position: 1, deleted_at: null },
      { id: "lesson-b", position: 2, deleted_at: null },
    ],
  },
];
```

---

## No Analog Found

No files in Phase 3 lack a codebase analog. All seven files are modifications to existing files, and each has a directly readable existing version that establishes the pattern.

---

## Metadata

**Analog search scope:** `src/lib/courses/`, `src/app/api/lesson-progress/`, `src/components/course/`, `src/app/dashboard/`, `src/app/admin/cursos/[slug]/`
**Files read:** 7 source files + 1 test file (queries.test.ts)
**Pattern extraction date:** 2026-04-30
