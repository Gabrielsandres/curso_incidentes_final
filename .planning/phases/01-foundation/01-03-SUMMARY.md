---
phase: 01-foundation
plan: 03
subsystem: database
tags: [postgres, supabase, rls, migrations, institutions, enrollments, b2b]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: env hardening e Sentry wrapper (pré-requisito para novos recursos de schema)
provides:
  - "Migration 0012: valor institution_manager no enum user_role"
  - "Migration 0013: tabelas institutions e institution_members, colunas B2B em enrollments, helper is_member_of_institution SECURITY DEFINER STABLE, RLS completo em 3 tabelas, backfill de admin"
  - "database.types.ts atualizado com tipos para todas as novas tabelas/enum"
affects:
  - 01-04
  - 01-05
  - phase-2
  - phase-3
  - phase-4
  - phase-5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migração de enum em arquivo isolado (0012) antes da migração que referencia o valor (0013) — regra de transação do Postgres"
    - "ALTER TABLE ADD COLUMN IF NOT EXISTS como estratégia aditiva (D-20) para tabelas já existentes"
    - "SECURITY DEFINER STABLE helper criado antes das policies que o chamam"
    - "ON CONFLICT (user_id, course_id) DO NOTHING para backfill idempotente"

key-files:
  created:
    - supabase/migrations/0012_add_institution_manager_role.sql
    - supabase/migrations/0013_institutions_enrollments.sql
  modified:
    - src/lib/database.types.ts
    - README.md

key-decisions:
  - "D-06: dois arquivos de migração (0012 enum-only, 0013 schema completo) exigidos pela restrição de transação de enum do Postgres"
  - "D-20: enrollments já existia desde 0001; estratégia aditiva ALTER ADD COLUMN preserva colunas legadas (status, order_id)"
  - "D-07: backfill somente para admins (admin × courses cross-product); usuários comuns recebem grants via UI do Phase 2"
  - "D-08: enrollments.expires_at nullable + política ENR-04 (expires_at IS NULL OR expires_at > now()) para controle de acesso expirado"
  - "INST-04: todas as policies de INSERT/UPDATE têm USING + WITH CHECK"

patterns-established:
  - "Migrações de enum value SEMPRE em arquivo separado, aplicado e confirmado antes do arquivo que referencia o valor"
  - "Helper SECURITY DEFINER declarado antes das RLS policies que o invocam dentro do mesmo arquivo"
  - "Backfill idempotente com ON CONFLICT DO NOTHING ao final de cada migração que insere dados iniciais"

requirements-completed:
  - ENR-01
  - ENR-02
  - ENR-04
  - INST-01
  - INST-02
  - INST-03
  - INST-04

# Metrics
duration: bloqueado por checkpoint humano (migração manual no Supabase SQL Editor)
completed: 2026-04-28
---

# Phase 01 Plan 03: Schema B2B — Instituições, Matrículas e RLS Summary

**Schema B2B completo: enum institution_manager, tabelas institutions/institution_members, colunas de matrícula com source/expires_at/institution_id, helper is_member_of_institution SECURITY DEFINER STABLE, RLS em 3 tabelas e backfill de admin — aplicados ao Supabase e validados com 7 queries de verificação**

## Performance

- **Duration:** Execução em 2 waves (Task 1 autônoma + checkpoint human-action para aplicação SQL)
- **Started:** 2026-04-28T03:54:00Z
- **Completed:** 2026-04-28
- **Tasks:** 2 (1 autônoma + 1 checkpoint confirmado pelo operador)
- **Files modified:** 4

## Accomplishments

- Dois arquivos de migração SQL criados e aplicados ao Supabase: 0012 (enum value) e 0013 (schema completo com 11 RLS policies)
- `database.types.ts` atualizado manualmente com os novos tipos: tabelas `institutions`, `institution_members`, colunas `enrollments` estendidas, enum `enrollment_source`, valor `institution_manager` em `user_role`
- Backfill de 8 linhas de matrícula para admins (cross-product admin × cursos) confirmado pelo operador via query F

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Write migration files 0012 and 0013 + update database.types.ts + README** — vários commits
   - `51ad2ac` feat(01-03): add migration 0012 (institution_manager enum value)
   - `7030ee9` feat(01-03): add migration 0013 (institutions, institution_members, enrollments alter, RLS, backfill)
   - `e48cff4` feat(01-03): update database.types.ts for new schema
   - `f866318` docs(01-03): add migrations 0012/0013 to README migration list

2. **Task 2: [BLOCKING] Aplicar migrações ao Supabase** — ação manual do operador; sem commit de código (arquivos SQL já estavam commitados)

## Files Created/Modified

- `supabase/migrations/0012_add_institution_manager_role.sql` — ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'institution_manager' (isolado por restrição de transação do Postgres)
- `supabase/migrations/0013_institutions_enrollments.sql` — enum enrollment_source, helper is_member_of_institution SECURITY DEFINER STABLE, tabelas institutions e institution_members, ALTER aditivo em enrollments (D-20), 11 RLS policies, backfill admin
- `src/lib/database.types.ts` — adicionados tipos: Enums.enrollment_source, Enums.user_role com institution_manager, Tables.institutions, Tables.institution_members, colunas novas em Tables.enrollments (source, granted_at, expires_at, institution_id)
- `README.md` — lista de migrações atualizada com entradas 0012 e 0013

## Validação pelo Operador (Post-Apply)

Todas as 7 queries de verificação retornaram resultados esperados:

| Query | Verificação | Resultado |
|-------|------------|-----------|
| A | enum user_role inclui institution_manager | student, admin, institution_manager — CONFIRMADO |
| B | enum enrollment_source existe | admin_grant, b2b_invite, b2c_purchase — CONFIRMADO |
| C | tabelas institutions e institution_members existem | 2 tabelas — CONFIRMADO |
| D | colunas novas em enrollments existem | source, granted_at, expires_at, institution_id — CONFIRMADO |
| E | helper is_member_of_institution com STABLE + SECURITY DEFINER | is_member_of_institution / s / true — CONFIRMADO |
| F | backfill de admin rodou | 8 linhas (admin × cursos cross-product) — CONFIRMADO |
| G | RLS habilitado nas 3 tabelas | enrollments=true, institution_members=true, institutions=true — CONFIRMADO |

## Must-Haves — Verificação

| Critério | Status |
|----------|--------|
| `enum user_role` inclui `institution_manager` (migration 0012 aplicada) | SATISFEITO — query A confirmou |
| Tabelas `institutions` e `institution_members` existem no banco | SATISFEITO — query C confirmou |
| `enrollments` tem colunas novas: `source`, `granted_at`, `expires_at`, `institution_id` | SATISFEITO — query D confirmou |
| `is_member_of_institution(uuid)` existe como STABLE SECURITY DEFINER | SATISFEITO — query E confirmou (provolatile='s', prosecdef=true) |
| RLS habilitado em `enrollments`, `institutions`, `institution_members` com USING+WITH CHECK em INSERT/UPDATE | SATISFEITO — query G + revisão das 11 policies |
| Admin accounts têm enrollment rows para todos os cursos existentes (backfill) | SATISFEITO — query F: 8 linhas |
| `database.types.ts` reflete o novo schema — typecheck passa | SATISFEITO — `npm run typecheck` exits 0 |
| `README.md` lista inclui 0012 e 0013 | SATISFEITO — commit f866318 |
| Usuário sem enrollment ativo não consegue SELECT em `lesson_progress` via cliente autenticado padrão | SATISFEITO — políticas ENR-02/ENR-04 verificadas no texto SQL; teste de smoke (query H) foi opcional pois não há usuário de teste sem matrícula configurado |
| `SELECT unnest(enum_range(NULL::user_role))` inclui 'institution_manager' após 0012 | SATISFEITO — query A confirmou |
| `is_member_of_institution` tem `provolatile='s'` e `prosecdef=true` | SATISFEITO — query E confirmou |

## Decisões Tomadas

- **D-06 aplicada**: dois arquivos de migração por restrição de transação de enum do Postgres — 0012 aplicado e confirmado ANTES de 0013
- **D-20 aplicada**: enrollments já existia desde 0001; usou ALTER TABLE ADD COLUMN IF NOT EXISTS sem remover colunas legadas (`status`, `order_id`, `created_at`)
- **D-07 aplicada**: backfill somente para perfis com `role = 'admin'`; ON CONFLICT DO NOTHING para idempotência
- **INST-04 aplicada**: todas as 5 policies de INSERT/UPDATE/FOR ALL têm tanto USING quanto WITH CHECK

## Deviations from Plan

None - plano executado exatamente como escrito. A estratégia aditiva de D-20 funcionou sem conflitos. Colunas legadas preservadas conforme planejado. O checkpoint human-action seguiu o fluxo normal de migração manual.

## Threat Surface Scan

Nenhum novo surface de segurança além do coberto pelo `<threat_model>` do plano:
- T2 (Elevation of Privilege): todas as policies de INSERT/UPDATE têm USING + WITH CHECK — MITIGADO
- T3 (DoS via recursão RLS): helper SECURITY DEFINER STABLE + EXCEPTION block retorna false — MITIGADO
- T6 (Over-grant no backfill): WHERE p.role = 'admin' + ON CONFLICT DO NOTHING — ACEITO conforme registrado

## Issues Encountered

None - execução sem problemas. A separação em dois arquivos de migração (restrição de enum do Postgres) funcionou conforme previsto em D-06.

## Next Phase Readiness

- Schema B2B completo e validado no banco de dados Supabase de desenvolvimento
- Todos os tipos TypeScript atualizados — fases 2-5 podem referenciar `Database["public"]["Tables"]["institutions"]`, `institution_members`, e as colunas novas de `enrollments` com segurança de tipos completa
- RLS em vigor: usuários sem matrícula ativa não têm acesso via cliente autenticado padrão
- Phase 2 (admin UI para gerenciar matrículas e criar instituições) pode começar imediatamente

---
*Phase: 01-foundation*
*Completed: 2026-04-28*

## Self-Check: PASSED

- [x] `supabase/migrations/0012_add_institution_manager_role.sql` — EXISTS
- [x] `supabase/migrations/0013_institutions_enrollments.sql` — EXISTS
- [x] `src/lib/database.types.ts` — institution_manager: 1 ocorrência confirmada
- [x] `README.md` — 0012_add_institution_manager_role.sql: 1 ocorrência confirmada
- [x] Commits 51ad2ac, 7030ee9, e48cff4, f866318 — FOUND em git log
- [x] `npm run typecheck` — exits 0
