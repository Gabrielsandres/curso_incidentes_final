# Technology Stack

**Analysis Date:** 2026-04-27

## Languages

**Primary:**
- TypeScript 5 - All source code; strict mode enabled
- JavaScript/JSX - React components via TSX

**Secondary:**
- SQL - Supabase database migrations in `supabase/migrations/`
- CSS - Tailwind v4 (via PostCSS)

## Runtime

**Environment:**
- Node.js 20 (specified in `.github/workflows/ci.yml`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16 (16.0.10) - App Router only
- React 19 (19.2.3) - Client and server components
- Tailwind CSS 4 (via `@tailwindcss/postcss` v4) - Styling

**Testing:**
- Vitest 4.0.4 - Unit and integration testing
- Config: `vitest.config.ts`
- Environment: Node (no jsdom)
- Test files: `src/**/*.test.{ts,tsx}`

**Build/Dev:**
- TypeScript 5 - Compilation and type checking
- ESLint 9 - Code linting
  - Config: `eslint.config.mjs` (flat config format)
  - Extends: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
  - Policy: `--max-warnings=0` (zero-warning enforcement)
- PostCSS - CSS processing
  - Config: `postcss.config.mjs`
  - Plugin: `@tailwindcss/postcss` v4

## Key Dependencies

**Critical:**
- `@supabase/ssr` (0.7.0) - Server-side Supabase client with cookie handling
- `@supabase/supabase-js` (2.76.1) - Core Supabase JavaScript SDK
- `zod` (3.24.1) - Schema validation for all user input and environment variables
- `@sentry/nextjs` (10.22.0) - Error tracking and observability

**Infrastructure:**
- `pdf-lib` (1.17.1) - PDF generation for certificates
- `lucide-react` (0.462.0) - Icon library
- `next` (16.0.10) - Full-stack framework
- `react-dom` (19.2.3) - React DOM utilities

**Development:**
- `@types/node` (20) - Node.js type definitions
- `@types/react` (19) - React type definitions
- `@types/react-dom` (19) - React DOM type definitions

## Configuration

**Environment:**

Client-safe (public) variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (required)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (required)
- `NEXT_PUBLIC_APP_URL` - App base URL (default: `http://localhost:3000`)
- `NEXT_PUBLIC_CHECKOUT_URL_ESSENCIAL` - Stripe/payment URL for Essential plan (optional)
- `NEXT_PUBLIC_CHECKOUT_URL_PRO` - Stripe/payment URL for Pro plan (optional)
- `NEXT_PUBLIC_CHECKOUT_URL_INSTITUCIONAL` - Stripe/payment URL for Institutional plan (optional)

Server-only secrets (validated in `src/lib/env.ts`):
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations (optional)
- `SUPABASE_JWT_SECRET` - JWT signing secret (optional)
- `SENTRY_DSN` - Sentry error tracking DSN (optional; enables Sentry if present)
- `SENTRY_ENVIRONMENT` - Sentry environment tag (defaults to `NODE_ENV`)
- `LOG_LEVEL` - Logging verbosity: `debug`, `info`, `warn`, `error` (default: `info`)

Validation: `src/lib/env.ts` uses Zod to validate all environment variables at startup. Server-only secrets use `serverSchema`, client variables use `clientSchema`. Parsed result is cached in `cachedEnv`.

**Build:**
- `next.config.ts` - Minimal Next.js configuration (no webpack overrides currently)
- `tsconfig.json` - TypeScript configuration
  - Target: ES2017
  - Path alias: `@/*` → `src/*`
  - Strict mode: enabled
- `vitest.config.ts` - Test runner configuration
  - Alias resolution mirroring TypeScript
  - Environment: `node`

## Platform Requirements

**Development:**
- Node.js 20
- npm
- TypeScript strict mode enforced
- ESLint zero-warning policy (blocks CI/build if warnings exist)

**Production:**
- Node.js 20 runtime
- Supabase backend (hosted)
- Environment variables provided at runtime

## Build & Deployment

**Scripts:**
```bash
npm run dev          # Dev server (Next.js + Webpack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (--max-warnings=0)
npm run typecheck    # tsc --noEmit
npm run test         # Vitest watch mode
npm run test:ci      # Vitest single-pass (used in CI)
```

**CI/CD:**
- GitHub Actions (`.github/workflows/ci.yml`)
- Node.js 20, npm cache
- Pipeline: `npm install` → `npm run lint` → `npm run test -- --run` → `npm run build`
- Runs on push to `main` and pull requests

## Next.js Configuration

- **App Router:** Enabled (no Pages Router)
- **Webpack:** Used explicitly in dev/build via `--webpack` flag
- **Build output:** Standard `.next/` directory
- **Middleware:** `middleware.ts` at root level
  - Matcher: `/dashboard/:path*`, `/curso/:path*`, `/admin/:path*`, `/login`

---

*Stack analysis: 2026-04-27*
