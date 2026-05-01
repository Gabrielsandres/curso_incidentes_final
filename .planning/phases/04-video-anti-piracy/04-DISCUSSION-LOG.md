# Phase 4: Video & Anti-Piracy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 04-video-anti-piracy
**Areas discussed:** Arquitetura do player, Watermark, Schema + admin form, Auto-conclusão no Bunny

---

## Arquitetura do Player

| Option | Description | Selected |
|--------|-------------|----------|
| RSC passa como prop | page.tsx resolve embedUrl server-side, passa como prop. Zero JS extra. URL pode expirar em sessões muito longas. | ✓ |
| API route re-minta em runtime | LessonPlayer faz fetch para /api/video-url ao montar. Mais robusto para sessões longas, mas adiciona request e loading state. | |

**User's choice:** RSC passa como prop

---

| Option | Description | Selected |
|--------|-------------|----------|
| 1 hora | TTL conservador, cobre qualquer aula. AP-02 permite até 4h. | ✓ |
| 4 horas | Limite máximo do requisito AP-02. | |
| Via env (BUNNY_STREAM_TOKEN_TTL_SECONDS) | Override via env, default no código. | |

**User's choice:** 1 hora (TTL default)

---

## Watermark

| Option | Description | Selected |
|--------|-------------|----------|
| Só no Bunny (produção) | Watermark é anti-pirataria real — só faz sentido com conteúdo proprietário. Em dev com YouTube, sem watermark. | ✓ |
| Em ambos (YouTube e Bunny) | Watermark sempre visível. Facilita testar em dev. | |

**User's choice:** Só no Bunny (produção)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Rotatório a cada 30s | Muda entre 4 cantos. Mais efetivo como deterrence. | ✓ |
| Posição fixa | Sempre no mesmo canto. Mais simples, fácil de obscurecer. | |

**User's choice:** Rotatório a cada 30s

---

| Option | Description | Selected |
|--------|-------------|----------|
| Email completo | Ex: fulano@exemplo.com.br. Identificação sem ambiguidade. | ✓ |
| Email parcialmente ofuscado | Ex: fu***@exemplo.com.br. Menos intrusivo visualmente. | |

**User's choice:** Email completo

---

| Option | Description | Selected |
|--------|-------------|----------|
| 10–15% (sutil) | Visível em capturas de tela, não atrapalha leitura. Padrão Udemy. | ✓ |
| 20–25% (mais visível) | Mais chamativo como deterrent, pode incomodar em slides densos. | |

**User's choice:** 10–15% (sutil)

---

## Schema + Admin Form

| Option | Description | Selected |
|--------|-------------|----------|
| Manter video_url + adicionar colunas novas | video_url como fallback legado. Novas colunas video_provider + video_external_id. Zero perda de dados. | ✓ |
| Migrar video_url automaticamente | Script extrai videoId YouTube das URLs existentes. Mais limpo, pode falhar se houver URLs não-YouTube. | |

**User's choice:** Manter video_url e adicionar colunas novas (additive migration)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Select + campo de ID | Dropdown YouTube/Bunny + campo texto para video_external_id. Exatamente o que VID-05 especifica. | ✓ |
| Campo único inteligente | Detecta provider automaticamente pela URL/formato. Menos clicks, mais lógica de parse. | |

**User's choice:** Select + campo de ID

---

## Auto-conclusão no Bunny

| Option | Description | Selected |
|--------|-------------|----------|
| postMessage do iframe Bunny | Bunny emite events via window.postMessage. API oficial, sem SDK extra. | ✓ |
| Só marcar manualmente | Em produção com Bunny, aluno sempre usa botão manual. Simples, sem risco de compatibilidade. | |

**User's choice:** postMessage do iframe Bunny

---

| Option | Description | Selected |
|--------|-------------|----------|
| Botão manual sempre visível | Auto-conclusão é convenience, não bloqueante. Fallback natural. | ✓ |
| Logar no Sentry | Alertar quando postMessage não disparou após 110% da duração estimada. | |

**User's choice:** Botão manual sempre visível

---

## Claude's Discretion

- Estrutura interna de `src/lib/video/` (nomes de arquivos, organização de exports)
- Implementação CSS do overlay rotatório (CSS variables, keyframes ou setInterval JS)
- Formato exato do Bunny embed URL (researcher confirma via documentação)

## Deferred Ideas

- DRM completo — explicitamente fora de escopo
- SDK Bunny Player.js com controles customizados — iframe + postMessage é suficiente
- Token com IP-binding — descartado por CGNAT brasileiro (AP-03)
