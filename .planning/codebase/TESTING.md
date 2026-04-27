# Testing Patterns

**Analysis Date:** 2026-04-27

## Test Framework

**Runner:**
- Vitest 4.0.4
- Config: `vitest.config.ts`
- Environment: `node` (no jsdom, no browser globals)
- Globals enabled: `true` (no need to import `describe`, `it`, `expect`)

**Assertion Library:**
- Vitest built-in expect (compatible with Jest)

**Run Commands:**
```bash
npm test                  # Watch mode (default)
npm run test:ci          # CI mode with verbose reporter
npm run test             # Equivalent to npm test
```

**Test Discovery:**
- Pattern: `src/**/*.test.{ts,tsx}`
- All test files co-located with source code
- Example: `src/lib/lessons/schema.test.ts` next to `src/lib/lessons/schema.ts`

## Test File Organization

**Location:**
- Co-located pattern: test file placed in same directory as implementation
- Example structure:
  ```
  src/lib/lessons/
  ├── schema.ts        (Zod schemas + types)
  └── schema.test.ts   (Validation tests)
  
  src/app/actions/
  ├── create-lesson.ts      (Server Action)
  └── create-lesson.test.ts  (Integration tests)
  
  src/lib/courses/
  ├── queries.ts        (Database queries)
  └── queries.test.ts   (Query behavior tests)
  ```

**Naming:**
- Pattern: `{filename}.test.ts`
- Test files use same base name as implementation

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it, vi } from "vitest";

describe("createLessonSchema", () => {
  it("valida payload completo e normaliza descricao vazia", () => {
    const result = createLessonSchema.safeParse({
      courseId: "22222222-2222-4222-8222-222222222222",
      moduleId: "11111111-1111-4111-8111-111111111111",
      title: "  Aula 1  ",
      description: "   ",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      position: "2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Aula 1");
      expect(result.data.description).toBeNull();
      expect(result.data.position).toBe(2);
    }
  });
});
```

**Patterns:**
- Use `describe()` for grouping test cases by function/feature
- Use `it()` for individual test case (not `test()`)
- Assertion library: Vitest's built-in `expect()`
- Conditional assertions inside `if (result.success)` guards for type narrowing
- No special setup/teardown beyond `beforeEach` for state reset

## Mocking

**Framework:** Vitest's `vi` module (part of Vitest)

**Patterns:**

**Module Mocking:**
```typescript
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
```

**Function Mocking (after mock is declared):**
```typescript
vi.mocked(createSupabaseServerClient).mockResolvedValue(
  supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
);
```

**Spy Usage:**
```typescript
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
// ... test code ...
consoleSpy.mockRestore();
```

**What to Mock:**
- External dependencies: Supabase client, logger, auth providers
- Next.js functions: `redirect()`, `revalidatePath()` (must throw in tests)
- Any I/O: database, file system, HTTP calls
- Redirects: `redirect()` mocked to throw special error, test catches it

**What NOT to Mock:**
- Zod validation schemas (test real behavior)
- Utility functions from `@/lib/` (unless they have side effects)
- Helper functions within same module

**Example: Mocking Next.js redirect:**
```typescript
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// In test:
await expect(createLessonAction(initialState, makeValidFormData())).rejects.toThrow(
  "NEXT_REDIRECT:/curso/curso-seguro",
);
```

## Fixtures and Factories

**Test Data Patterns:**

**Helper Function Factories:**
```typescript
function makeValidFormData() {
  const formData = new FormData();
  formData.set("course_id", "22222222-2222-4222-8222-222222222222");
  formData.set("module_id", "11111111-1111-4111-8111-111111111111");
  formData.set("title", "Aula de teste");
  formData.set("description", "");
  formData.set("video_url", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  formData.set("position", "1");
  return formData;
}
```

**Mock Response Builders:**
```typescript
function makeQuery(response: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
}

// Usage:
const query = makeQuery({
  data: { id: "lesson-1", title: "Aula 1" },
  error: null,
});
```

**Location:**
- Fixtures defined at top of test file (after imports, before describe)
- Factory functions defined as helpers before describe blocks
- UUIDs use pattern: "11111111-1111-4111-8111-111111111111" for modules, "22222222-2222-4222-8222-222222222222" for courses

## Coverage

**Requirements:** Not enforced (no coverage threshold configured)

**View Coverage:**
```bash
npm test -- --coverage    # If coverage reporting configured
```

**Current State:**
- No coverage.json or threshold in `vitest.config.ts`
- Tests written for critical paths (validation, Server Actions, API routes)

## Test Types

**Unit Tests (Validation):**
- Scope: Zod schema validation behavior
- Location: `src/lib/{domain}/schema.test.ts`
- Tests: valid input parsing, normalization, error conditions
- Example: `src/lib/lessons/schema.test.ts` — 3 tests covering success + 2 error cases
- Approach: Parse sample data, assert on `success`, `data` fields, and error messages

**Unit Tests (Environment):**
- Scope: `getEnv()` and `getClientEnv()` functions
- Location: `src/lib/env.test.ts`
- Tests: successful parsing, client-only exposure, missing variables
- Example: 3 tests for server vars, client safety, missing mandatory vars

**Integration Tests (Server Actions):**
- Scope: Form data → Zod → Supabase operation → state return
- Location: `src/app/actions/{action}.test.ts`
- Tests: permission checks, database errors, redirect behavior
- Example: `src/app/actions/create-lesson.test.ts` — 3 tests for role check, success+redirect, validation errors
- Approach: Mock Supabase client, verify query builder chain calls, assert return state

**Integration Tests (API Routes):**
- Scope: HTTP request → validation → Supabase → HTTP response
- Location: `src/app/api/{endpoint}/route.test.ts`
- Tests: authentication (401), authorization (403), success (200), error handling (500)
- Example: `src/app/api/certificates/signed-url/route.test.ts` — 4 tests for auth, role, eligibility, success
- Approach: Construct mock Request, call POST/GET handler, assert status + JSON response

**Integration Tests (Queries):**
- Scope: Database query functions with Supabase mocks
- Location: `src/lib/{domain}/queries.test.ts`
- Tests: error recovery (empty list), null normalization, full context assembly
- Example: `src/lib/courses/queries.test.ts` — 3 tests for error handling, null normalization, context assembly
- Approach: Mock query builder chain, pass typed Supabase client, verify result structure

## Test Examples

**Schema Validation Test:**
```typescript
it("valida payload completo e normaliza descricao vazia", () => {
  const result = createLessonSchema.safeParse({
    courseId: "22222222-2222-4222-8222-222222222222",
    moduleId: "11111111-1111-4111-8111-111111111111",
    title: "  Aula 1  ",
    description: "   ",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    position: "2",
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.title).toBe("Aula 1");
    expect(result.data.description).toBeNull();
    expect(result.data.position).toBe(2);
  }
});
```

**Server Action Test (with mocks):**
```typescript
it("redireciona para o curso quando admin cria aula com sucesso", async () => {
  const modulesQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "module-id", course_id: "course-id", courses: { slug: "curso-seguro" } },
      error: null,
    }),
  };

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "modules") return modulesQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  };

  vi.mocked(createSupabaseServerClient).mockResolvedValue(
    supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
  );
  vi.mocked(fetchUserRole).mockResolvedValue("admin");

  await expect(createLessonAction(initialState, makeValidFormData())).rejects.toThrow(
    "NEXT_REDIRECT:/curso/curso-seguro",
  );
});
```

**API Route Test:**
```typescript
it("retorna 401 quando usuario nao esta autenticado", async () => {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

  const response = await POST(makeRequest({ courseId: COURSE_ID }));

  expect(response.status).toBe(401);
});
```

## Common Patterns

**Async Testing:**
```typescript
it("awaits async operations and checks results", async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

**Error Testing (Validation):**
```typescript
it("retorna erro quando moduleId nao eh uuid", () => {
  const result = createLessonSchema.safeParse({
    // ... invalid data
    moduleId: "modulo-invalido",
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.flatten().fieldErrors.moduleId).toBeDefined();
  }
});
```

**Error Testing (Type Guard):**
```typescript
if (!result.success) {
  expect(result.error.flatten().fieldErrors.email).toBeDefined();
}
```

**Conditional Assertion Pattern:**
Always guard before accessing narrowed type properties:
```typescript
expect(result.success).toBe(true);
if (result.success) {
  // result.data is now properly typed
  expect(result.data.position).toBe(2);
}
```

**Setup/Teardown:**
```typescript
import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
  resetEnvCache();
});

afterEach(() => {
  vi.clearAllMocks();
});
```

## CI/CD Integration

**GitHub Actions:** `.github/workflows/ci.yml`

**Test Stage:**
```yaml
- name: Test
  run: npm run test:ci -- --run
```

**Test Flow:**
1. Install dependencies (npm install)
2. Lint code (npm run lint with --max-warnings=0)
3. Run tests (npm run test:ci with --run flag)
4. Build app (npm run build)

**Failure Behavior:**
- Any lint warning fails build (zero-warning policy)
- Any test failure fails build
- Build only proceeds if tests pass

---

*Testing analysis: 2026-04-27*
