# Coding Conventions

**Analysis Date:** 2026-04-27

## Naming Patterns

**Files:**
- Schema files: `{feature}/schema.ts` (e.g., `src/lib/lessons/schema.ts`, `src/lib/courses/schema.ts`)
- Test files: `{file}.test.ts` co-located with implementation (e.g., `src/lib/lessons/schema.test.ts`)
- Server Actions: `{action-name}.ts` in `src/app/actions/` (e.g., `src/app/actions/create-lesson.ts`)
- API routes: `route.ts` in `src/app/api/{endpoint}/` (e.g., `src/app/api/lesson-progress/complete/route.ts`)
- Utilities: `{purpose}.ts` in `src/lib/{domain}/` (e.g., `src/lib/logger.ts`, `src/lib/env.ts`)

**Functions:**
- camelCase for all function names
- Server Actions use imperative verb pattern: `createLessonAction`, `updateCourseAction`
- Helper functions prefixed with action intent: `requireAdminUser()`, `buildCoursePayload()`, `validateCertificateFields()`
- Async functions are explicit: `async function` or `export async function`

**Variables:**
- camelCase for all variables (never snake_case except in database column mappings)
- Constants in UPPER_CASE: `UUID_REGEX`, `LOG_LEVEL`
- Private/internal: use appropriate scope (module-level const or function parameter)
- Request payloads explicitly typed: `type CompletionRequestPayload = { lessonId?: string }`

**Types:**
- PascalCase for all types and interfaces
- Suffix pattern: `{Entity}Row` for database rows (e.g., `CourseRow`, `ModuleRow`)
- Suffix pattern: `{Entity}FormState` for Server Action state (e.g., `CreateLessonFormState`)
- Suffix pattern: `{Entity}Input` for validation schema types (e.g., `CreateLessonInput`, `CreateCourseInput`)
- Suffix pattern: `{Entity}WithContent` or `{Entity}WithMaterials` for enriched types

**Zod Schema Naming:**
- Export pattern: `create{Entity}Schema`, `update{Entity}Schema` (e.g., `createLessonSchema`, `updateCourseSchema`)
- Helper preprocessor functions: `optional{Type}`, `normalize{Type}` (e.g., `optionalTrimmedString`, `normalizeOptionalText`)
- Custom refinement helpers: `validate{Field}` (e.g., `validateCertificateFields()`)

## Code Style

**Formatting:**
- ESLint: Next.js core web vitals + TypeScript config
- Config: `eslint.config.mjs` using flat config format
- Strict enforcement: `npm run lint` with `--max-warnings=0` (zero-warning policy)
- No custom prettier config — relies on ESLint

**Linting:**
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Enforced globally on every push (CI: `.github/workflows/ci.yml`)
- Build fails if any lint warnings exist
- Applies to all `.ts` and `.tsx` files except `.next/`, `out/`, `build/`, `next-env.d.ts`

**Language & Locale:**
- Portuguese (pt-BR) for all user-facing strings and error messages
- English comments allowed for technical documentation
- Error messages follow Portuguese convention: "Informe uma URL válida" not "Provide a valid URL"

## Import Organization

**Order:**
1. React and Next.js imports (`import { ... } from "react"`, `import { ... } from "next/..."`)
2. External packages (`import { z } from "zod"`, `import { createServerClient } from "@supabase/ssr"`)
3. Internal absolute path imports (`import { ... } from "@/lib/..."`, `import { ... } from "@/app/..."`)
4. Type-only imports grouped at the top of each section

**Path Aliases:**
- `@/*` resolves to `src/*` (configured in `tsconfig.json`)
- Always use `@/` for internal imports, never relative paths
- Example: `import { createSupabaseServerClient } from "@/lib/supabase/server"`

**Barrel Exports:**
- Avoid index.ts barrel files in feature directories
- Import directly from source file: `import { createLessonSchema } from "@/lib/lessons/schema"`

## Error Handling

**Patterns:**
- Zod validation uses `.safeParse()` for optional/recovery paths (never throw)
- Return validation errors in `fieldErrors` field: `{ success: false, fieldErrors: parsed.error.flatten().fieldErrors }`
- Database errors inspected for code and message: `error.code === "42501"` for permission errors, `error.code === "23505"` for unique violations
- Permission errors checked via code OR message lowercase: `error.code === "42501" || error.message?.toLowerCase().includes("permission denied")`
- Network failures detected via message text: `error.message?.toLowerCase().includes("fetch failed")`
- Unrecoverable errors throw with descriptive message

**Server Action Pattern:**
```typescript
if (!parsed.success) {
  return {
    success: false,
    message: "Revise os dados informados.",
    fieldErrors: parsed.error.flatten().fieldErrors,
  };
}
```

**API Route Pattern:**
```typescript
if (error) {
  logger.error("Human-readable context", { userId, error: error.message, code: error.code });
  return NextResponse.json({ error: "machine_error_code" }, { status: 500 });
}
```

## Logging

**Framework:** Custom `logger` object in `src/lib/logger.ts`

**Patterns:**
- Never use bare `console.log()`, `console.error()` in application code
- Use `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
- Logger respects `LOG_LEVEL` environment variable (default: "info")
- Log context as object, not string concatenation: `logger.error("Failed to create lesson", { lessonId, error: error.message })`
- Include user ID and resource IDs in error logs for debugging

**Example:**
```typescript
logger.error("Falha ao criar aula", {
  lessonId: insertedLesson.id,
  error: materialInsertError.message,
  code: materialInsertError.code,
});
```

## Environment Variables

**Access Pattern:**
- Never use raw `process.env.VARIABLE`
- Always use `getEnv()` for server variables or `getClientEnv()` for client variables
- Both functions defined in `src/lib/env.ts`
- Zod validated with `.safeParse()` on startup, cached in module
- Missing or invalid env vars throw with descriptive error

**Example:**
```typescript
const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getEnv();
```

## Supabase Client Typing

**Pattern:**
- Always use typed Supabase client: `SupabaseClient<Database>`
- Import `Database` type from `@/lib/database.types` (auto-generated)
- Server: `createSupabaseServerClient()` returns typed client
- Admin: `createSupabaseAdminClient()` for service role operations
- Example: `const client = { from: vi.fn(...) } as unknown as SupabaseClient<Database>;`

## Validation Pattern (Zod Schema-First)

**All validation through Zod schemas:**
- Schemas defined in `src/lib/{domain}/schema.ts` files
- Export schema AND inferred type: `export const createLessonSchema = z.object(...); export type CreateLessonInput = z.infer<typeof createLessonSchema>;`
- FormData transformation: key names map snake_case form fields to camelCase schema properties
- Preprocessing for normalization: trim whitespace, convert "on"/"true" to boolean, coerce string numbers
- `.superRefine()` for conditional/cross-field validation (certificate fields required if enabled)
- All `.safeParse()` returns destructured as `{ success, data, error }`

**Example:**
```typescript
const parsed = createLessonSchema.safeParse({
  courseId: formData.get("course_id"),
  moduleId: formData.get("module_id"),
  title: formData.get("title"),
  // ... rest of fields
});

if (!parsed.success) {
  return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
}
```

## Server Actions vs API Routes

**Server Actions** (`"use server"`):
- Used for form submissions with optimistic UI updates
- Location: `src/app/actions/{name}.ts`
- Signature: `async function {name}(prevState: FormState, formData: FormData): Promise<FormState>`
- Returns typed state object with `success`, `message`, and optional `fieldErrors`
- Called via `useFormState` hook or form `action` prop
- Can redirect/revalidate cache
- Example: `src/app/actions/create-lesson.ts`, `src/app/actions/upsert-course.ts`

**API Routes**:
- Used for programmatic JSON endpoints (not form submissions)
- Location: `src/app/api/{endpoint}/route.ts`
- Exports `POST`, `GET`, etc. functions
- Receives `Request`, returns `NextResponse`
- Returns JSON with `error` field (string code) or `ok: true`
- Used by client-side fetch/axios calls
- Example: `src/app/api/lesson-progress/complete/route.ts`

## Comments & Documentation

**JSDoc:**
- Not enforced, minimal overhead for most functions
- Use when: exported types need explanation or complex business logic
- Avoid: obvious single-line functions

**Inline Comments:**
- Explain "why," not "what"
- Used sparingly for non-obvious logic
- Section headers in Zod schemas marked with ASCII comment blocks

**Commit Messages:**
- Imperative mood: "Fix", "Add", "Update", "Refactor"
- Include feature context: "Fix - Hash no token de validação de email"
- Check recent commits for style: `git log --oneline | head -10`

## File Organization

**Module Structure:**
- Schema files contain only Zod definitions and type exports
- Queries (data access) separate: `queries.ts`, `queries.test.ts`
- Business logic in domain modules: `src/lib/{domain}/`
- UI components in `src/components/` or `src/app/`
- Server Actions in `src/app/actions/`

## Special Patterns

**FormData Extraction:**
```typescript
function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
```

**UUID Validation:**
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(lessonId)) {
  return NextResponse.json({ error: "invalid_lesson_id" }, { status: 400 });
}
```

**Slug Validation:**
```typescript
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
z.string().regex(slugRegex, { message: "Use apenas letras minusculas, numeros e hifens no slug." })
```

---

*Convention analysis: 2026-04-27*
