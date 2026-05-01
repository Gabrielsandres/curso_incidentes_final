# Phase 4: Video & Anti-Piracy - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Abstrair o provider de vídeo (YouTube no dev, Bunny Stream em prod) com interface TypeScript única, fazer token signing server-side para Bunny, e exibir watermark CSS com o email do aluno sobre o player em produção. O admin form de aula ganha seletor de provider. Não inclui DRM completo — overlay é deterrence, documentado honestamente.

</domain>

<decisions>
## Implementation Decisions

### Arquitetura do Player

- **D-01:** RSC (`page.tsx`) resolve o embed URL server-side via `VideoProvider.getPlayableSource()` e passa como prop para `LessonPlayer`. Zero API route extra no client, loading state eliminado.
- **D-02:** TTL da URL assinada Bunny: **1 hora** (3600s). Cobre qualquer aula sem problema. Valor default no código, configurável via `BUNNY_STREAM_TOKEN_TTL_SECONDS` env (VID-03 já especifica essa variável).
- **D-03:** Chave `BUNNY_STREAM_TOKEN_KEY` nunca vai para o client — signing acontece exclusivamente no RSC/Server Action (VID-04).

### Watermark

- **D-04:** Watermark aparece **apenas em produção com provider Bunny**. Em dev com YouTube, sem watermark.
- **D-05:** Posição **rotatória a cada 30 segundos** entre os 4 cantos do player. Mais efetivo como deterrence.
- **D-06:** Texto: **email completo** do aluno (ex: `fulano@exemplo.com.br`). Identificação sem ambiguidade em caso de vazamento.
- **D-07:** Opacidade: **10–15%** (sutil). Visível em capturas de tela, não atrapalha leitura de conteúdo.
- **D-08:** Implementado como overlay CSS absoluto sobre o `div` do iframe, com `pointer-events: none` para não bloquear interação com o player.

### Schema & Admin Form

- **D-09:** Migração **additive**: manter `video_url` como fallback legado (nullable) e adicionar colunas `video_provider` (`youtube` | `bunny`) e `video_external_id` (string). Aulas existentes continuam funcionando via `video_url` até serem editadas pelo admin.
- **D-10:** Player usa `video_provider` + `video_external_id` quando preenchidos; cai para `video_url` como fallback se as novas colunas estiverem nulas.
- **D-11:** Admin form de aula (criar e editar) ganha **select dropdown** com opções `YouTube` / `Bunny Stream` + campo de texto para `video_external_id`. VID-05.

### Auto-conclusão no Bunny

- **D-12:** Detecção de fim de vídeo Bunny via **`window.postMessage`** — o Bunny Player emite `{ event: 'ended' }` quando o vídeo termina. LessonPlayer escuta com `addEventListener('message')` filtrado por origem Bunny.
- **D-13:** Botão manual "Marcar aula como concluída" permanece **sempre visível** independente do provider. Auto-conclusão é convenience, não bloqueante — se postMessage não disparar, o aluno usa o botão.
- **D-14:** YouTube mantém auto-conclusão via IFrame API `PlayerState.ENDED` (comportamento atual preservado).

### Claude's Discretion

- Estrutura interna de `src/lib/video/` (nomes de arquivos, exports) — Claude decide seguindo os padrões de `src/lib/courses/` e `src/lib/certificates/`.
- Implementação CSS exata do overlay rotatório (CSS variables, keyframes ou `setInterval` JS) — Claude escolhe a abordagem mais simples.
- Formato do Bunny embed URL — Claude consulta documentação Bunny para confirmar o padrão de signed URL (`iframe.mediadelivery.net/embed/...`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements (Phase 4)
- `.planning/REQUIREMENTS.md` §Video Provider Abstraction (VID-01 a VID-05) — contratos TypeScript, signing, TTL, prod-guard
- `.planning/REQUIREMENTS.md` §Anti-Piracy (AP-01 a AP-04) — overlay, TTL, no IP-binding, documentação de ceiling

### Player existente (ponto de partida)
- `src/components/course/lesson-player.tsx` — Client Component atual (YouTube IFrame API hardcoded); será refatorado
- `src/app/curso/[slug]/aula/[lessonId]/page.tsx` — RSC que instancia o player; aqui entra o `getPlayableSource()`

### Admin forms (modificar)
- `src/app/admin/cursos/[slug]/aulas/[lessonId]/lesson-edit-form.tsx` — form de edição de aula; adicionar seletor de provider
- `src/app/admin/cursos/[slug]/modulos/[moduleId]/add-lesson-form.tsx` — form de criação de aula; adicionar seletor de provider

### Schema & tipos
- `src/lib/database.types.ts` — atualizar após migration com `video_provider` e `video_external_id`
- `supabase/migrations/` — próxima migration numerada (0015 ou seguinte)

### Padrões de referência no codebase
- `src/lib/certificates/` — padrão de módulo lib com types, queries, lógica de negócio; seguir mesma estrutura em `src/lib/video/`
- `src/lib/env.ts` — onde adicionar `BUNNY_STREAM_TOKEN_KEY` e `BUNNY_STREAM_TOKEN_TTL_SECONDS` ao `serverSchema`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/env.ts` — adicionar vars Bunny aqui (`BUNNY_STREAM_TOKEN_KEY`, `BUNNY_STREAM_TOKEN_TTL_SECONDS`, `BUNNY_STREAM_CDN_ZONE`); padrão já estabelecido com `serverSchema`
- `src/lib/supabase/server.ts` — RSC client disponível na page de aula para buscar dados do usuário (email já carregado em `page.tsx`)
- `src/lib/logger.ts` — usar para logs de erro no signing server-side

### Established Patterns
- Server Actions e RSC como caminho de mutação/fetch preferido — signing deve ocorrer no RSC (`page.tsx`), não em API route
- Zod para validação de qualquer input novo (ex: `video_external_id` no admin form)
- `src/lib/*/types.ts` + `src/lib/*/queries.ts` — padrão de organização que `src/lib/video/` deve seguir

### Integration Points
- `page.tsx` (`/curso/[slug]/aula/[lessonId]`) → ponto onde `getPlayableSource()` será chamado e o resultado passado para `LessonPlayer`
- `LessonPlayer` → será refatorado para aceitar `embedUrl` como prop ao invés de extrair videoId de `video_url`
- Admin forms de aula (criar + editar) → recebem os novos campos `video_provider` e `video_external_id`
- `supabase/migrations/` → próxima migration additive para as novas colunas

</code_context>

<specifics>
## Specific Ideas

- **Spike recomendado (STATE.md blocker):** Verificar o nome exato do evento postMessage do Bunny Player (`ended` vs outro nome) antes de implementar — confiança MEDIUM na documentação pública. O researcher deve confirmar isso.
- **Verificar formato do BUNNY_STREAM_CDN_ZONE** no painel do Bunny antes de hardcodar o padrão de URL embed — pode ser numérico (ex: `12345`) ou string slug.
- **No IP-binding** nos tokens Bunny (AP-03) — Brasil tem CGNAT extenso em Claro/Vivo/TIM; tokens não devem incluir IP do cliente.
- **Docs anti-pirataria** (`docs/`): AP-04 exige que a documentação descreva honestamente o ceiling da proteção (overlay é deterrence, screen recording continua possível).

</specifics>

<deferred>
## Deferred Ideas

- SDK Bunny Player.js com controles customizados — iframe simples + postMessage é suficiente para o v1
- DRM completo (Widevine/PlayReady) — explicitamente fora de escopo (ver REQUIREMENTS.md §Out of Scope)
- Token com IP-binding — descartado por incompatibilidade com CGNAT brasileiro (AP-03)
- Suporte a múltiplos providers além de YouTube e Bunny — v1 tem exatamente dois; extensão futura se necessário

</deferred>

---

*Phase: 04-video-anti-piracy*
*Context gathered: 2026-04-30*
