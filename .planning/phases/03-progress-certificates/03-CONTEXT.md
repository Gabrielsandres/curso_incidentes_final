# Phase 3: Progress & Certificates — Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Aluno consegue acompanhar seu progresso por curso, retomar de onde parou, e receber o certificado em PDF automaticamente ao concluir 100% das aulas.

9 v1 requirements: PROG-01, PROG-02, PROG-03, PROG-04, CERT-01, CERT-02, CERT-03, CERT-04, CERT-05.

Out of scope: provider de vídeo (Phase 4), gestor de instituição (Phase 5), admin UI para gerenciar certificados emitidos por aluno.

</domain>

<brownfield_reality>
## What Already Exists (Phase 3 Inherits)

A maior parte da infraestrutura de Phase 3 já existe no codebase. Phase 3 é principalmente UI delta + pequenas extensões, não uma construção do zero.

### Já funcionando (não tocar, só confirmar nos testes):
- **`/api/lesson-progress/complete`** — upsert idempotente em `lesson_progress`, chama `ensureCourseCertificateIssued` em best-effort após cada marcação. PROG-03 está operacional.
- **`ensureCourseCertificateIssued`** (`src/lib/certificates/issuer.ts`) — checa progresso, emite PDF, salva em Storage, insere em `course_certificates`. Idempotente via `already_issued` check. CERT-01, CERT-02, CERT-05 já implementados.
- **`buildCourseCertificatePdf`** (`src/lib/certificates/pdf.ts`) — gera PDF com fonte que suporta ç/ã/õ, data em America/Sao_Paulo, código de verificação UUID. CERT-03 já implementado.
- **`/api/certificates/signed-url`** — gera signed URL com TTL curto para download. CERT-04 já implementado.
- **`MyCertificates`** component — exibe certificados por curso, botões "Gerar e baixar" / "Baixar", states ISSUED/ELIGIBLE/IN_PROGRESS. CERT-04 UI já existe.
- **Dashboard `/dashboard`** — mostra `completionPercentage` por curso, lista certificados via `MyCertificates`. PROG-01 já implementado.
- **`LessonPlayer`** — botão "Marcar aula como concluída" + marcação automática ao fim do vídeo YouTube. PROG-03 UI já existe.
- **`getAvailableCourses`** — retorna `totalLessons`, `completedLessons`, `completionPercentage` por curso.
- **`getUserCertificatesByCourseId`** — mapa courseId → CourseCertificateRow.

### O que falta (Phase 3 constrói):
1. **PROG-02**: Query `nextLessonId` + botão "Continuar de onde parei" no dashboard
2. **PROG-04**: Banner inline no `LessonPlayer` quando detectar 100% de conclusão
3. **CERT-03 (admin UI)**: Seção "Certificado" na página `/admin/cursos/[slug]` para editar campos de certificado por curso

</brownfield_reality>

<decisions>
## Implementation Decisions

### PROG-04 — Banner de conclusão de curso (success criterion 3)

- **D-01:** Quando o aluno marca a última aula, o `LessonPlayer` exibe um **banner inline** (não toast, não redirect) abaixo da área do botão. Banner verde com texto "Curso concluído! Seu certificado está disponível." e link para o dashboard (`href="/dashboard"`). O aluno permanece na página da aula — não há redirect automático.

- **D-02:** O player detecta 100% via **flag `isCourseCompleted` na resposta da API**. A rota `/api/lesson-progress/complete` já chama `ensureCourseCertificateIssued` e sabe o resultado. Quando o resultado for `"issued"` ou `"already_issued"` (e o curso estava a 0 aulas restantes), a rota inclui `{ ok: true, isCourseCompleted: true }` na resposta. O player usa esse flag para acionar `setShowCompletionBanner(true)`.

  **Alternativa descartada**: passar `totalLessons` e `completedLessons` como props para o player e calcular localmente — descartada porque o player não tem visão do total de aulas do curso, só da aula atual. Teria que passar dados extras pela prop-chain sem necessidade.

- **D-03:** O banner é renderizado dentro do próprio `LessonPlayer` (já é `"use client"`). Estado local `showCompletionBanner: boolean`, inicializado como `false` e setado para `true` quando `isCourseCompleted === true` retorna da API. Banner não some automaticamente (aluno deve clicar o link para navegar).

### PROG-02 — Botão "Continuar de onde parei" (success criterion 2)

- **D-04:** O botão aparece **somente no dashboard** (`/dashboard`), em cada card de curso. A página do curso (`/curso/[slug]`) não ganha esse botão — o `ModuleList` já destacra aulas pendentes vs. concluídas e o aluno pode navegar diretamente. Manter o escopo mínimo.

- **D-05:** A query para `nextLessonId` é adicionada a **`getAvailableCourses`** (`src/lib/courses/queries.ts`). A query já carrega os lesson IDs por curso; basta incluir `position` e `module_id` + posição do módulo para determinar a primeira aula não concluída em ordem de `(module.position, lesson.position)`. O tipo `CourseSummary` ganha `nextLessonId: string | null`.

  - `nextLessonId = null` quando o aluno ainda não iniciou (0 aulas concluídas) → botão não aparece; apenas "Começar curso"
  - `nextLessonId = null` quando o curso está 100% concluído → botão não aparece; apenas "Rever curso" (ou link para MyCertificates se certificado habilitado)
  - `nextLessonId = <uuid>` quando há progresso parcial → botão "Continuar de onde parei" com href `/curso/{slug}/aula/{nextLessonId}`

- **D-06:** No card de curso do dashboard, os estados do botão principal:
  - Sem progresso (`completedLessons === 0`): um botão "Entrar no curso" → `/curso/{slug}`
  - Com progresso parcial (`completedLessons > 0 && completedLessons < totalLessons`): dois botões — "Continuar de onde parei" (primário) e "Ver curso" (secundário)
  - 100% concluído + certificado habilitado: um botão "Meus Certificados" → ancora para `#certificados` ou direto para a seção MyCertificates; também "Rever curso" como secundário

### CERT-03 (admin UI) — Configuração de certificado por curso

- **D-07:** A seção de configuração de certificado vive na **página `/admin/cursos/[slug]`** (Phase 2 já construiu essa página), como uma nova seção abaixo dos dados do curso e acima da lista de módulos. Nenhuma nova rota ou página criada.

- **D-08:** Campos editáveis na seção:
  - Toggle `certificate_enabled` (checkbox/switch)
  - `certificate_template_url` — input text; admin cola a URL pública da imagem (PNG no Supabase Storage public bucket ou CDN). Sem componente de upload — admin faz upload manual no Supabase Studio se necessário. Incluir dica de texto explicando isso.
  - `certificate_signer_name` — input text
  - `certificate_signer_role` — input text (cargo/função)
  - `certificate_workload_hours` — input number (inteiro positivo)
  
  Os campos de template/assinatura só ficam visíveis/editáveis quando `certificate_enabled = true` (mostrar/ocultar com CSS, não condicional de renderização — evita jank).

- **D-09:** A ação de salvar a seção de certificado reusa a **`upsertCourseAction`** (ou cria uma `updateCourseCertificateConfigAction` separada se o planner preferir isolar). Validação Zod em `src/lib/courses/schema.ts` com novos campos opcionais. Admin pode salvar a seção independentemente dos outros campos do curso (botão "Salvar configuração de certificado" próprio).

- **D-10:** CERT-05 não precisa de código: `ensureCourseCertificateIssued` já tem o check `already_issued` antes de qualquer cálculo de progresso, garantindo que adicionar aulas não invalida o certificado existente. Apenas documentar esse comportamento nos testes de `issuer.ts` se ainda não coberto.

### Sem migrações de schema

- **D-11:** Phase 3 **não precisa de nenhuma migration SQL nova**. Todos os campos necessários (`course_certificates`, `lesson_progress`, `certificate_enabled`, `certificate_template_url`, `certificate_workload_hours`, `certificate_signer_name`, `certificate_signer_role`) já existem de phases anteriores. Phase 3 é puramente TypeScript/React delta.

### Filtragem de soft-deleted em cálculos de progresso

- **D-12:** `getAvailableCourses` atualmente conta todos os lesson IDs sem filtrar `deleted_at`. O plan deve corrigir isso para consistência com `getCourseWithContent` (que já filtra). Lições soft-deleted não devem entrar no denominador de progresso.

</decisions>

<code_context>
## Existing Code Insights

### Arquivos que Phase 3 modifica
- `src/app/api/lesson-progress/complete/route.ts` — adicionar `isCourseCompleted: boolean` à resposta (D-02). Detectar quando `ensureCourseCertificateIssued` retorna `"issued"` para o flag.
- `src/components/course/lesson-player.tsx` — adicionar estado `showCompletionBanner` + banner inline (D-01, D-03). Player já é `"use client"`.
- `src/lib/courses/queries.ts` — estender `getAvailableCourses` com `nextLessonId` e corrigir filtragem de `deleted_at` (D-05, D-12). Atualizar tipo `CourseSummary` em `src/lib/courses/types.ts`.
- `src/app/dashboard/page.tsx` — atualizar card de curso para usar `nextLessonId` e exibir botão "Continuar" contextual (D-04, D-06).
- `src/app/admin/cursos/[slug]/page.tsx` — adicionar seção de certificado com 5 campos (D-07, D-08, D-09).
- `src/lib/courses/schema.ts` — estender schema de update de curso com campos de certificado (D-09).

### Arquivos que Phase 3 NÃO toca (já pronto)
- `src/lib/certificates/issuer.ts` — completo
- `src/lib/certificates/pdf.ts` — completo
- `src/app/api/certificates/signed-url/route.ts` — completo
- `src/components/certificates/my-certificates.tsx` — completo
- `src/lib/courses/queries.ts` → `getUserCertificatesByCourseId` — completo

### Padrões relevantes existentes
- `LessonPlayer` já usa state local + fetch manual para `markLessonAsCompleted` — o banner segue o mesmo padrão: state local `showCompletionBanner`, setado no `try` após response OK.
- `getAvailableCourses` já faz dois round-trips (cursos + progress em batch) — estender o segundo round-trip para incluir `position` e `module_id` sem round-trip adicional.
- Admin page de curso (`/admin/cursos/[slug]/page.tsx`) já tem form RSC + server action via `useActionState`. A seção de certificado segue o mesmo padrão do form de dados do curso.

</code_context>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — single-tenant MDHE, pt-BR, Server Actions, Zod-first
- `.planning/REQUIREMENTS.md` — PROG-01..04, CERT-01..05
- `.planning/ROADMAP.md` — Phase 3 goal + 5 success criteria
- `CLAUDE.md` — Zod, typed Supabase, lint zero-warning, Vitest node env, pt-BR

### Phase 2 deliverables que Phase 3 consome
- `src/app/admin/cursos/[slug]/page.tsx` — página do curso onde a seção de certificado será adicionada
- `src/app/admin/cursos/[slug]/` — padrões de form + server action a reutilizar

### Brownfield já existente (ler antes de implementar)
- `src/lib/certificates/issuer.ts` — `ensureCourseCertificateIssued`, `isCertificateEligible`
- `src/lib/certificates/pdf.ts` — `buildCourseCertificatePdf`
- `src/app/api/lesson-progress/complete/route.ts` — `issueCertificateBestEffort`, estrutura atual da resposta
- `src/components/course/lesson-player.tsx` — `markLessonAsCompleted`, estrutura atual do component
- `src/lib/courses/queries.ts` — `getAvailableCourses`, `getCourseWithContent`
- `src/app/dashboard/page.tsx` — card de curso atual, consumo de `CourseSummary`
- `src/components/certificates/my-certificates.tsx` — UI existente de certificados

</canonical_refs>

<specifics>
## Specific Ideas

- O banner de conclusão deve aparecer acima do botão "Marcar aula como concluída" (que nesse estado já está desabilitado com label "Aula concluída"), não abaixo, para não competir visualmente com o erro de completionError que fica abaixo.
- O `nextLessonId` deve ser calculado em ordem estrita de `(module.position ASC, lesson.position ASC)`, ignorando aulas com `deleted_at IS NOT NULL`.
- No card do dashboard com progresso parcial, o botão "Continuar de onde parei" deve ser o primário (azul) e o "Ver curso" o secundário (borda). Inverter isso seria ilógico para a maioria dos casos de uso.
- A seção de certificado no admin deve ter um pequeno parágrafo explicativo: "O certificado é emitido automaticamente quando o aluno conclui 100% das aulas. Adicionar novas aulas não invalida certificados já emitidos."
- Para o campo de URL do template, incluir dica: "Faça upload da imagem de fundo no bucket público do Supabase Storage e cole a URL aqui. Formato: PNG landscape 1754x1240px recomendado."

</specifics>

<deferred>
## Deferred Ideas

- **Admin UI para listar certificados emitidos por aluno** — o admin não tem visibilidade de quais alunos já receberam certificado por curso. Útil, mas não é success criterion de Phase 3. Cobre no Phase 5 (gestor de instituição precisa disso para a sua equipe; a mesma UI pode ter uma versão admin).
- **Preview do PDF de certificado no admin** — admin poderia ver como o certificado ficaria antes de ativar. Complexo (precisa gerar PDF de preview com dados fictícios). v2.
- **Revogação de certificado** — `certificate_code` já existe, mas não há flow de invalidação. Deferred desde o roadmap init.
- **Relatório CSV de progresso por curso** — admin quer ver "% de conclusão de todos os alunos por curso". Deferred para Phase 5 (gestor vê sua equipe; generalização para admin depois).
- **Notificação por email ao emitir certificado** — aluno recebe email "Seu certificado está pronto". Útil, mas EMAIL-01/02 ainda estão deferred (domínio MDHE). Não bloquear Phase 3 por isso.
- **Paginação em MyCertificates** — com poucos cursos por aluno no v1, lista simples é suficiente.

</deferred>

---

*Phase: 03-progress-certificates*
*Context gathered: 2026-04-30*
