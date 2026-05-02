---
phase: "04-video-anti-piracy"
plan: "05"
subsystem: "docs, anti-piracy"
tags: ["docs", "anti-piracy", "watermark", "bunny-stream", "checkpoint", "phase-complete"]
dependency_graph:
  requires:
    - "04-01 (VideoProvider interface + BunnyStreamAdapter + SHA256 signing)"
    - "04-02 (Env vars Bunny + createLessonSchema migration)"
    - "04-03 (queries video columns + RSC wiring + LessonPlayer + WatermarkOverlay)"
    - "04-04 (add-lesson-form video provider selector)"
  provides:
    - "docs/anti-piracy.md: honest ceiling documentation (AP-04 fulfilled)"
    - "Phase 4 complete: all 9 requirements VID-01 through AP-04 satisfied"
  affects:
    - "docs/anti-piracy.md"
tech_stack:
  added: []
  patterns:
    - "Deterrence-only documentation pattern: explicit statements of what is NOT protected alongside what IS"
key_files:
  created:
    - "docs/anti-piracy.md"
  modified: []
decisions:
  - "docs/anti-piracy.md documenta honestamente que gravacao de tela permanece possivel — overlay e deterrence, nao DRM"
  - "IP-binding foi descartado intencionalmente por causa de CGNAT no Brasil (Claro, Vivo, TIM) — documentado no arquivo"
  - "YouTube disponivel apenas em development (NODE_ENV !== production) — guard no adapter, documentado no arquivo"
metrics:
  duration: "checkpoint plan — Task 1 auto + Task 2 human-verify"
  completed: "2026-04-30"
  tasks_completed: 2
  files_modified: 1
---

# Phase 04 Plan 05: Anti-Piracy Docs + Human Checkpoint — Summary

**One-liner:** docs/anti-piracy.md criado com documentacao honesta do teto de protecao (deterrence, nao DRM, screen recording permanece possivel); checkpoint humano aprovado com admin form, iframe player, postMessage auto-completion e CI gate 131/131 todos passando — Phase 4 concluida.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create docs/anti-piracy.md with honest ceiling documentation | 3476700 |
| 2 | Human checkpoint — full Phase 4 player flow verified | (human approval) |

## Checkpoint Outcome (Task 2)

**Status:** APPROVED

O usuario verificou todos os itens do checklist de checkpoint:

| Item verificado | Resultado |
|----------------|-----------|
| Admin form cria aulas com seletor de provedor de video | OK |
| Lesson player renderiza iframe, sem watermark em YouTube dev mode | OK |
| Auto-completion via postMessage funciona | OK |
| `npm run typecheck` | Passou (zero erros) |
| `npm run lint` | Passou (zero warnings, --max-warnings=0) |
| `npm run test:ci` | 131/131 testes passando em 21 arquivos de teste |

## docs/anti-piracy.md — Conteudo

O arquivo documenta:

1. **O que esta implementado:**
   - Overlay CSS com e-mail do aluno (opacidade ~12%, rotacao de posicao a cada 30s)
   - URLs assinadas Bunny Stream com TTL de 1h (SHA256 server-side, chave nunca exposta ao browser)
   - Protecao de credenciais server-side (RSC somente, enum Zod, YouTube prod guard)

2. **O que NAO esta implementado (teto realista):**
   - Gravacao de tela continua possivel (limitacao mais importante, declarada explicitamente)
   - Sem DRM (Widevine/PlayReady/FairPlay) — descartado do v1 por custo e perfil de risco B2B
   - Sem IP-binding nos tokens — intencional (CGNAT extenso no Brasil, documentado AP-03)
   - Sem deteccao de gravacao de tela

3. **Proposito declarado:** deterrence (dissuasao), nao DRM — identificacao da fonte de vazamento pelo e-mail na gravacao

4. **Recomendacoes operacionais:** rotacao trimestral da TOKEN_KEY, monitoramento de logins simultaneos, comunicacao honesta aos clientes B2B

## Phase 4 Completion Declaration

Todos os 9 requirement IDs da Phase 4 foram satisfeitos:

| Req | Descricao | Satisfeito em |
|-----|-----------|---------------|
| VID-01 | TypeScript VideoProvider interface + PlayableSource type | Plan 01 |
| VID-02 | YouTube prod guard lanca erro se NODE_ENV=production | Plan 01 |
| VID-03 | TTL configuravel via BUNNY_STREAM_TOKEN_TTL_SECONDS (max 14400) | Plans 01 + 02 |
| VID-04 | Token signing exclusivamente server-side (RSC, chave nunca no bundle) | Plans 01 + 03 |
| VID-05 | video_provider/video_external_id nas colunas + forms admin | Plans 02 + 04 |
| AP-01 | CSS overlay com email, pointer-events:none, rotacao 4 cantos/30s | Plan 03 |
| AP-02 | Bunny signed URL com TTL ≤ 4h, re-mintado a cada carregamento | Plans 01 + 03 |
| AP-03 | Sem IP-binding nos tokens (SHA256 de key+videoId+expires apenas) | Plan 01 |
| AP-04 | docs/anti-piracy.md com documentacao honesta do teto de protecao | Este plano |

**Phase 4: Video & Anti-Piracy — COMPLETA**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preprocessing null para undefined em todos os campos opcionais do FormData em createLessonSchema**

- **Found during:** Checkpoint humano (Task 2) — ao testar o fluxo admin completo
- **Issue:** FormData serializa campos vazios como string vazia `""` ou os omite como `null`. O `createLessonSchema` nao tinha preprocessing `.transform()` para campos opcionais como `description`, `title`, `moduleId`, `courseId`, `position` e `videoUrl`, causando falhas de validacao Zod ao submeter o form com campos em branco.
- **Fix:** Adicionado `z.preprocess(val => val === null || val === "" ? undefined : val, ...)` para todos os campos opcionais relevantes no schema. Commits `d8f6c6d` (auto-compute position + courseId opcional) e `0069b7d` (preprocess null→undefined para todos os campos opcionais de FormData).
- **Files modified:** `src/app/actions/create-lesson.ts` (createLessonSchema)
- **Commits:** d8f6c6d, 0069b7d

## Known Stubs

Nenhum — `docs/anti-piracy.md` e um documento completo, nao um stub. Todas as features de video descrita no documento estao implementadas e foram verificadas no checkpoint humano.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-04-14 accept | docs/anti-piracy.md | Documento interno de operacoes; nao contem segredos; disclosure honesta das limitacoes e intencional |

## Self-Check

### Files exist:
- docs/anti-piracy.md — FOUND (commit 3476700)

### Commits exist:
- 3476700 — docs(04-05): create anti-piracy.md with honest ceiling documentation — FOUND
- d8f6c6d — fix(04): auto-compute position and make courseId optional in createLessonSchema — FOUND
- 0069b7d — fix(04): preprocess null→undefined for all optional FormData fields in createLessonSchema — FOUND

### CI gate (final, verificado no checkpoint humano):
- `npm run typecheck` — PASSOU (zero erros)
- `npm run lint` — PASSOU (zero warnings)
- `npm run test:ci` — 131/131 testes passando

## Self-Check: PASSED
