---
phase: 02-catalog-crud
plan: "01"
subsystem: database
tags: [supabase, postgres, migrations, rls, typescript]

# Dependency graph
requires: []
provides:
  - "Migration 0014: cursos lifecycle timestamps (published_at/archived_at)"
  - "Migration 0014: soft delete em modules e lessons (deleted_at)"
  - "Migration 0014: metadados de vídeo em lessons (video_provider/video_external_id/workload_minutes)"
  - "Migration 0014: columns UTM em institutional_leads"
  - "Migration 0014: tabela pending_enrollments com RLS + índices de performance"
  - "Migration 0014: RLS policy em courses filtrando archived/unpublished para estudantes"
  - "database.types.ts atualizado com todos os novos campos"
  - "video_url passou a ser nullable em lessons (NOT NULL removido)"
affects:
  - 02-02-PLAN
  - 02-03-PLAN
  - 02-04-PLAN
  - 02-05-PLAN
  - 02-06-PLAN
  - 02-07-PLAN

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotência total em migrations via IF NOT EXISTS + drop policy if exists"
    - "RLS com cláusula OR para admin bypass inline na policy (sem função separada)"
    - "Índices parciais (WHERE deleted_at IS NOT NULL) para soft delete"

key-files:
  created:
    - supabase/migrations/0014_catalog_metadata.sql
  modified:
    - src/lib/database.types.ts
    - src/app/curso/[slug]/lesson-player.tsx
    - src/lib/courses/queries.ts
    - README.md

key-decisions:
  - "video_url tornou-se nullable na migration (NOT NULL dropped) — decisão da fase de research para suportar provedores externos sem URL direta"
  - "pending_enrollments usa Option A (tabela separada) em vez de email + status em enrollments — mantém separação de conceitos"
  - "RLS em courses usa OR clause inline (admin check via subquery em profiles) sem stored procedure — consistente com outras policies do projeto"
  - "Índice em pending_enrollments.email usa lower(email) para busca case-insensitive"

patterns-established:
  - "Migrations idempotentes: todos os ALTER TABLE usam ADD COLUMN IF NOT EXISTS; CREATE TABLE usa IF NOT EXISTS; CREATE INDEX usa IF NOT EXISTS; políticas RLS precedidas de DROP POLICY IF EXISTS"
  - "database.types.ts é mantido manualmente (hand-edit) alinhado ao DDL — padrão do projeto"

requirements-completed: []

# Metrics
duration: 90min (inclui checkpoint humano para aplicação no banco)
completed: 2026-04-28
---

# Fase 02 Plano 01: Migração 0014 — Metadata de Catálogo

**Migração PostgreSQL que adiciona lifecycle timestamps em courses, soft delete em modules/lessons, metadados de vídeo, colunas UTM em institutional_leads, e tabela pending_enrollments com RLS — base obrigatória para todos os planos 02-02 a 02-07.**

## Performance

- **Duration:** ~90 min (inclui tempo do operador no Supabase SQL Editor)
- **Started:** 2026-04-28
- **Completed:** 2026-04-28
- **Tasks:** 2 (Task 1 autônoma + Task 2 checkpoint humano)
- **Files modificados:** 5

## Accomplishments

- Escrita e commit da migration 0014 com 6 seções DDL completas e idempotência total
- Atualização de `database.types.ts` com todos os novos campos e tabela `pending_enrollments`
- Auto-correção de downstream typecheck em `queries.ts` e `lesson-player.tsx` após `video_url` tornar-se nullable
- Migration aplicada ao banco Supabase dev pelo operador com todas as 7 queries de validação (A-G) retornando resultados esperados

## Task Commits

1. **Task 1: Migration 0014 + database.types.ts + README** — `51cf4f4` (feat), `0b73c22` (feat), `724f121` (docs)
2. **Task 2: Checkpoint humano** — sem commit (operador aplicou no Supabase SQL Editor)

## Confirmacao do Operador (Task 2)

O operador confirmou "Tudo ok" — todas as 7 queries de validacao retornaram resultados esperados:

| Query | O que valida | Resultado |
|-------|-------------|-----------|
| A | courses: published_at + archived_at (timestamptz, nullable) | 2 rows OK |
| B | lessons: deleted_at, video_provider, video_external_id, workload_minutes + video_url nullable | 5 rows OK |
| C | modules: deleted_at (nullable) | 1 row OK |
| D | institutional_leads: utm_source, utm_medium, utm_campaign | 3 rows OK |
| E | pending_enrollments table existe | 1 row OK |
| F | 4 indexes de performance existem | 4 rows OK |
| G | RLS habilitado em pending_enrollments | relrowsecurity = true |

Idempotencia confirmada (segunda execucao sem erros).

## Verificacao dos must_haves

| Criterio | Status |
|----------|--------|
| courses tem published_at e archived_at timestamptz (ambos nullable) | Confirmado — query A retornou 2 rows com is_nullable=YES |
| modules tem deleted_at timestamptz (nullable) | Confirmado — query C retornou 1 row com is_nullable=YES |
| lessons tem deleted_at, video_provider, video_external_id, workload_minutes | Confirmado — query B retornou 5 rows |
| lessons.video_url e nullable (NOT NULL removido) | Confirmado — query B mostrou video_url is_nullable=YES |
| institutional_leads tem utm_source, utm_medium, utm_campaign | Confirmado — query D retornou 3 rows |
| pending_enrollments existe com email, course_id, invited_by, expires_at, created_at | Confirmado — query E retornou 1 row |
| RLS habilitado em pending_enrollments com policies admin + service_role | Confirmado — query G retornou relrowsecurity=true |
| RLS policy em courses filtrando archived/unpublished para nao-admins | Presente na migration (secao 6 do DDL) |
| Indices de performance: idx_courses_published_at, idx_lessons_deleted_at, idx_modules_deleted_at, idx_pending_enrollments_email | Confirmado — query F retornou 4 rows |
| database.types.ts reflete todos os novos campos e tabela pending_enrollments | Confirmado — grep retornou 6 ocorrencias de published_at/archived_at |
| README.md lista 0014_catalog_metadata.sql | Confirmado — grep encontrou entrada no README |

## Files Created/Modified

- `supabase/migrations/0014_catalog_metadata.sql` — DDL completo para todas as alteracoes de schema da Fase 2 (6 secoes, idempotente)
- `src/lib/database.types.ts` — Adicionados campos: published_at/archived_at em courses; deleted_at em modules; deleted_at/video_provider/video_external_id/workload_minutes em lessons (video_url agora nullable); utm_source/utm_medium/utm_campaign em institutional_leads; tabela pending_enrollments completa
- `src/app/curso/[slug]/lesson-player.tsx` — Corrigido acesso a video_url apos campo tornar-se nullable (auto-fix Rule 1)
- `src/lib/courses/queries.ts` — Corrigida query que atribuia video_url sem tratar nullable (auto-fix Rule 1)
- `README.md` — Entrada adicionada na lista de migrations

## Decisions Made

- `video_url` passou a ser nullable: decisao documentada no RESEARCH.md — provedores externos (Panda Video, Vimeo) nao exigem URL direta, apenas `video_provider` + `video_external_id`
- `pending_enrollments` como tabela separada (Option A): mantem conceitos de convite pendente e matricula efetivada independentes
- RLS admin bypass via subquery inline em profiles (sem stored procedure): consistente com o resto do projeto

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Correcao de acesso a video_url nullable em lesson-player.tsx**
- **Found during:** Task 1 (verificacao com `npx tsc --noEmit` apos editar database.types.ts)
- **Issue:** `lesson-player.tsx` acessava `lesson.video_url` como string nao-nullable; apos a mudanca no tipo, TypeScript reportou erro de compilacao
- **Fix:** Adicionado optional chaining e fallback `?? ""` no acesso ao campo
- **Files modified:** `src/app/curso/[slug]/lesson-player.tsx`
- **Verification:** `npx tsc --noEmit` retornou 0 erros
- **Committed in:** `51cf4f4` (parte do commit da Task 1)

**2. [Rule 1 - Bug] Correcao de atribuicao de video_url nullable em queries.ts**
- **Found during:** Task 1 (mesma verificacao tsc)
- **Issue:** `src/lib/courses/queries.ts` atribuia `video_url` de um campo do banco para um tipo que esperava `string` nao-nullable; apos a mudanca, TypeScript reportou incompatibilidade de tipos
- **Fix:** Atualizado o tipo da variavel local para aceitar `string | null`
- **Files modified:** `src/lib/courses/queries.ts`
- **Verification:** `npx tsc --noEmit` retornou 0 erros
- **Committed in:** `51cf4f4` (parte do commit da Task 1)

---

**Total deviations:** 2 auto-fixed (ambas Rule 1 — bugs de tipo causados pela mudanca de nullable em video_url)
**Impact on plan:** Necessarias para typecheck passar. Os arquivos `queries.ts` e `lesson-player.tsx` nao estavam na lista `files_modified` do plano — planos 02-02 e 02-03 devem considerar que esses arquivos ja foram tocados.

**Nota para planos subsequentes:** `src/lib/courses/queries.ts` e `src/app/curso/[slug]/lesson-player.tsx` foram modificados como auto-fix neste plano, fora do escopo original. Planos 02-02 e 02-03 que tambem modificam esses arquivos devem revisar o estado atual antes de editar.

## Issues Encountered

Nenhum problema alem das auto-correcoes de tipo documentadas acima. A migration foi escrita corretamente na primeira tentativa e aplicada sem erros pelo operador.

## User Setup Required

None - configuracao de banco de dados e responsabilidade do operador (ja executada).

## Next Phase Readiness

- Todos os planos 02-02 a 02-07 podem comecar imediatamente — as colunas e tabelas necessarias existem no banco
- `database.types.ts` esta sincronizado com o schema aplicado — imports tipados funcionam sem ajustes
- `npx tsc --noEmit` e `npm run lint` passam sem erros
- Planos que modificam `queries.ts` (02-03) e `lesson-player.tsx` (02-03/02-04) devem notar que esses arquivos ja foram tocados neste plano

## Self-Check: PASSED

- `supabase/migrations/0014_catalog_metadata.sql` existe no disco
- `src/lib/database.types.ts` contem 6 ocorrencias de published_at/archived_at
- `README.md` contem entrada para 0014_catalog_metadata.sql
- Commits 51cf4f4, 0b73c22, 724f121 presentes no git log
- Operator confirmou todas as 7 queries de validacao com "Tudo ok"

---
*Phase: 02-catalog-crud*
*Completed: 2026-04-28*
