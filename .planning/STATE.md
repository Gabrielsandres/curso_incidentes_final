---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 5 Plan 07 complete — ready to execute 05-08 (gestor dashboard)
last_updated: "2026-05-03T15:24:11.477Z"
last_activity: 2026-05-03
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 30
  completed_plans: 28
  percent: 93
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-27)

**Core value:** Um aluno (B2C ou B2B) consegue concluir um curso da MDHE — assistir todas as aulas, baixar os materiais, e receber o certificado em PDF — sem friccao operacional para a MDHE.
**Current focus:** Phase --phase — 2

## Current Position

Phase: 5 (b2b-institution-manager) — EXECUTING
Plan: 7 of 9 complete (next: 05-08 gestor dashboard)
Status: Ready to execute
Last activity: 2026-05-03

Progress: [█████████░] 93%

## Performance Metrics

**Velocity:**

- Total plans completed: 5
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 5 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 5 P6 | 5min | 3 tasks | 3 files |
| Phase 5 P07 | 12min | 2 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Schema para institutions/institution_members vai inteiro na Phase 1 (nao na Phase 5) porque ENR-02 (enrollment-based RLS) e INST-03 (helpers SECURITY DEFINER) bloqueiam tudo que vem depois
- Roadmap: Phase 4 (Video) depende apenas da Phase 2 (Catalog) — pode rodar em paralelo com Phase 3 se houver capacidade
- Roadmap: ENR-03 (admin concede acesso) ficou na Phase 2 (Catalog) porque o admin form de enrollment faz sentido construir junto com o CRUD de cursos
- [Phase ?]: Plan 05-06: middleware tests use real NextRequest/NextResponse under Vitest node env (no next/server mock) — preserves coverage of cookie/redirect surface
- [Phase ?]: Plan 05-07: detail page select omits contact_phone — institutions table has no such column (continues 05-03/05-05 schema reality)
- [Phase ?]: Plan 05-07: B-1 fix landed verbatim in InstitutionManager handleInvite — runtime narrows result.data; result.message access on success branch absent

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 4: Spike recomendado em Bunny Player.js evento `ended` antes de comecar a implementacao (MEDIUM confidence no nome exato do evento — ver SUMMARY.md)
- Phase 4: Verificar formato exato do BUNNY_STREAM_CDN_ZONE no painel do Bunny antes de implementar bunny-provider.ts
- Phase 1: Aplicar migration 0012 (institutions + enum) antes de qualquer convite de gestor_instituicao — enum precisa existir antes do trigger de auth

## Deferred Items

Items acknowledged and carried forward:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| B2B | Upload em lote (CSV) de funcionarios | v2 | Roadmap init |
| B2B | Gestor convida seus proprios funcionarios | v2 | Roadmap init |
| Certs | Revogacao de certificado (revoked_at) | v2 | Roadmap init |
| Player | Closed captions (caption_url nullable) | v2 | Roadmap init |

## Session Continuity

Last session: 2026-05-03T15:24:03.322Z
Stopped at: Phase 5 Plan 07 complete — ready to execute 05-08 (gestor dashboard)
Resume file: None

**Planned Phase:** 2 (catalog-crud) — 7 plans — 2026-04-28T09:36:14.895Z
