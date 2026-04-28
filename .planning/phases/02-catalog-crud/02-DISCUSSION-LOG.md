# Phase 2: Catalog CRUD - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 02-catalog-crud
**Areas discussed:** Schema + estados, Navegação admin + reorder, Materiais + ENR-03, MKT-02 + escopo

---

## Schema + estados

### Q1: Como modelar o status do curso (rascunho/publicado/arquivado) na tabela `courses`?

| Option | Description | Selected |
|--------|-------------|----------|
| Timestamps nulláveis | `published_at` + `archived_at` (ambos timestamptz NULL); estado derivado | ✓ |
| Enum status + timestamps | Enum `course_status` + `published_at` + `archived_at` (duplica info) | |
| Single column status | Apenas enum, sem timestamps de transição (perde audit trail) | |

**User's choice:** Timestamps nulláveis.
**Notes:** Success criterion 1 já cita `published_at IS NOT NULL`. Permite audit livre de quando publicou/arquivou sem dessincronização.

### Q2: Como implementar 'deletar aula sem perder progresso' (success criterion 2)?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete em aulas | `lessons.deleted_at` + `modules.deleted_at`; CASCADE preservado para hard delete admin | ✓ |
| Mudar FK para SET NULL | `lesson_progress.lesson_id ON DELETE SET NULL` (orfã o progresso) | |
| Tabela de auditoria | Trigger copia rows antes do delete | |

**User's choice:** Soft delete.
**Notes:** Mantém referencial integrity intacta. RLS de aluno filtra `WHERE deleted_at IS NULL`.

### Q3: Granularidade da migration nova?

| Option | Description | Selected |
|--------|-------------|----------|
| Uma migration 0014 | Todos os ALTERs (lifecycle + video metadata + workload) em um arquivo | ✓ |
| Duas migrations | 0014 lifecycle + 0015 video metadata | |
| Adiar metadata de vídeo | Phase 4 cria suas próprias colunas de vídeo | |

**User's choice:** Uma migration 0014.
**Notes:** Aditivo único; Phase 4 só implementa o adapter consumindo os campos já presentes.

---

## Navegação admin + reorder

### Q4: Organização da UI hierárquica?

| Option | Description | Selected |
|--------|-------------|----------|
| Páginas aninhadas | `/admin/cursos`, `/admin/cursos/[slug]`, `/admin/cursos/[slug]/modulos/[id]`, etc. RSC + breadcrumb | ✓ |
| Árvore expandível single-page | Tudo em `/admin/cursos`, expansão client-side | |
| Painel split (master-detail) | Lista lateral + edição direita estilo Notion | |

**User's choice:** Páginas aninhadas.
**Notes:** URL stateful, RSC normal, sem JS extra para navegação.

### Q5: UX de reordenação?

| Option | Description | Selected |
|--------|-------------|----------|
| Botões ↑/↓ | Server action faz swap de `position`. Zero JS lib, acessível | ✓ |
| Drag-and-drop com @dnd-kit | UX premium, +dep, +client component | |
| Input numérico de posição | Edita campo "Posição" e salva | |

**User's choice:** Botões ↑/↓.
**Notes:** Listas curtas (módulos: 3-10; aulas: 5-30) tornam botões adequados. Drag-drop fica como deferred para revisão futura.

---

## Materiais + ENR-03

### Q6: Whitelist de tipos de upload?

| Option | Description | Selected |
|--------|-------------|----------|
| Whitelist PDF + Office | application/pdf, .doc/.docx, .xls/.xlsx, .ppt/.pptx, image/png, image/jpeg | ✓ |
| Só PDF | Restringir a application/pdf | |
| Aceitar qualquer (status quo) | Sem whitelist | |

**User's choice:** Whitelist PDF + Office.
**Notes:** Validação dupla (client + server). Cobre uso real da MDHE (manuais, planilhas operacionais). 20MB max preservado.

### Q7: Onde fica a UI de admin grant (ENR-03)?

| Option | Description | Selected |
|--------|-------------|----------|
| Aba dentro do curso | `/admin/cursos/[slug]/alunos` contextual | ✓ |
| Página /admin/matriculas dedicada | Cross-curso, agregada | |
| Estender /admin/usuarios | User-centric | |

**User's choice:** Aba dentro do curso.
**Notes:** Alinha com a navegação aninhada (admin pensa "dar acesso a fulanos NESSE curso").

### Q8: Como o dialog 'Conceder acesso' busca o aluno?

| Option | Description | Selected |
|--------|-------------|----------|
| Email exato + ação se não existe | Existe → cria enrollment; não existe → oferece convite | ✓ |
| Só email exato (sem criação) | Erro se profile não existe | |
| Autocomplete | Sugere conforme digita | |

**User's choice:** Email exato + ação se não existe.
**Notes:** Cobre B2C (profile já existe) e B2B (admin convida funcionário novo). Reaproveita fluxo de invite existente.

---

## MKT-02 + escopo

### Q9: Como capturar UTM no form institucional?

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden inputs preenchidos via RSC | Page lê searchParams, passa para hidden inputs no form | ✓ |
| Capturar no client via useSearchParams | Client component lê runtime | |
| Tabela separada utm_attributions | first_touch/last_touch | |

**User's choice:** Hidden inputs via RSC.
**Notes:** SEO-friendly, sem flicker, simples. Tabela separada é overkill para v1.

### Q10: Confirmar escopo de Phase 2?

| Option | Description | Selected |
|--------|-------------|----------|
| Escopo mínimo da REQ | DENTRO: CRUD + soft delete + ENR-03 + MKT-02. FORA: audit log, bulk import, analytics, preview, versions, busca avançada | ✓ |
| Adicionar audit log de mudanças | + tabela catalog_audit_log | |
| Adicionar busca/filtros no admin | + filtros e search | |

**User's choice:** Escopo mínimo da REQ.
**Notes:** Os items deferrados estão em CONTEXT.md `<deferred>`. Revisitar em Phase 6+ se virar dor.

---

## Claude's Discretion

- Layout exato do dashboard `/admin/cursos`.
- Componente de breadcrumb.
- Texto exato de botões e mensagens pt-BR.
- Como o status visual aparece (badge, toggle, dropdown).
- Estratégia de paginação na lista de enrollments (provavelmente sem v1).

## Deferred Ideas

- Audit log de mudanças (Phase 6+ se necessário)
- Bulk import / CSV de cursos
- Analytics dashboard de leads institucionais
- Preview de curso em rascunho
- Versões / draft history
- Busca/filtros avançados no admin
- Drag-and-drop com @dnd-kit (revisitar se admin reclamar de ↑↓)
- Tabela `lead_utm_attributions` com first_touch/last_touch
