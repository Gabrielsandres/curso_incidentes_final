---
status: fixed
slug: lesson-reorder-skips-position
trigger: "Ao clicar na seta para baixo na primeira aula do curso ela vai para terceira posição invés da segunda"
created: 2026-04-30
updated: 2026-04-30
---

## Symptoms

- **Expected:** Clicar ↓ na primeira aula (posição 1) move ela para posição 2 (troca com a segunda aula)
- **Actual:** Clicar ↓ na primeira aula (posição 1) move ela para posição 3 (pula uma posição)
- **Errors:** Nenhum erro visível — a operação parece suceder mas o resultado está errado
- **Timeline:** Observado durante UAT da Phase 2 (primeiro teste bem-sucedido foi parcial — "na maioria das vezes deu certo")
- **Reproduction:** Abrir /admin/cursos/[slug]/modulos/[id], clicar ↓ na primeira aula da lista

## Current Focus

hypothesis: "Swap não-atômico em reorderLessonAction produz estado intermediário errado quando a ação é disparada duas vezes rapidamente (double-submit)"
test: "Ler manage-lesson.ts (update-lesson.ts), reorder-actions.ts, ReorderButtons"
expecting: "Swap sequencial de duas etapas sem proteção contra double-submit"
next_action: "Fix aplicado"
reasoning_checkpoint: "CONFIRMADO — ver seção Evidence"

## Evidence

- timestamp: 2026-04-30T00:00:00Z
  file: src/app/actions/update-lesson.ts
  lines: 196-213
  observation: |
    reorderLessonAction faz troca SEQUENCIAL (2 UPDATEs separados):
      Step 1: UPDATE lessons SET position = neighborPosition WHERE id = lessonId
      Step 2: UPDATE lessons SET position = current.position WHERE id = neighbor.id
    Comentário no código confirma: "sequential (NOT atomic); accept-low-severity per T-02-T6"

- timestamp: 2026-04-30T00:00:01Z
  file: src/app/admin/cursos/[slug]/reorder-actions.ts
  lines: 30-36
  observation: |
    reorderLessonDownAction retorna Promise<void> e DESCARTA o resultado de reorderLessonAction.
    Se a ação falha (e.g. neighbor não encontrado), nenhum erro é exibido ao admin.

- timestamp: 2026-04-30T00:00:02Z
  file: src/components/admin/reorder-buttons.tsx
  lines: 24-37
  observation: |
    DownButton usa useFormStatus() para disabled=pending. Isso deveria prevenir double-submit,
    mas há uma janela de tempo entre o click do usuário e React marcar o estado como pending.
    Em React 19 com Server Actions, esse window pode ser suficiente para um segundo submit.

- timestamp: 2026-04-30T00:00:03Z
  observation: |
    CENÁRIO DO BUG (double-submit com posições 1, 2, 3):
      Estado inicial DB: A(pos=1), B(pos=2), C(pos=3)
      
      Chamada 1 de reorderLessonAction (direction=down, lesson=A):
        - Lê A: position=1
        - neighborPosition=2, encontra B
        - Step 1: A → pos=2. DB agora: A(2), B(2), C(3)
        - Step 2: B → pos=1. DB agora: A(2), B(1), C(3)
        - revalidatePath chamado
      
      Chamada 2 de reorderLessonAction (direction=down, lesson=A) — disparada antes da
      página re-renderizar ou pela janela de timing do pending:
        - Lê A: position=2 (estado pós-chamada-1!)
        - neighborPosition=3, encontra C
        - Step 1: A → pos=3. DB agora: A(3), B(1), C(3)
        - Step 2: C → pos=2. DB agora: A(3), B(1), C(2)
        - revalidatePath chamado
      
      Estado final: B(1), C(2), A(3) — A pulou da posição 1 para a posição 3!

- timestamp: 2026-04-30T00:00:04Z
  file: supabase/migrations/0001_initial_schema.sql
  observation: |
    Não há UNIQUE CONSTRAINT em (module_id, position) na tabela lessons.
    Há apenas um INDEX. Portanto o swap sequencial não falha por constraint violation,
    mas cria estado temporário com posições duplicadas que pode ser lido por uma segunda chamada.

- timestamp: 2026-04-30T00:00:05Z
  observation: |
    CAUSA SECUNDÁRIA: neighbor lookup usa position value (current.position + 1),
    não o próximo item da lista ordenada de aulas ativas.
    Se houver aulas deletadas (soft-delete) com posições intermediárias, o neighbor
    não é encontrado e a ação falha silenciosamente (sem erro visível ao admin,
    pois reorderLessonDownAction descarta o resultado).

## Eliminated

- Bug na lógica de cálculo de neighborPosition: código usa `current.position ± 1`, lógica correta para estado consistente
- Unique constraint violation na DB: confirmado que não existe unique constraint em (module_id, position)
- Bug no componente ReorderButtons: lógica isFirst/isLast baseada em index do array filtrado está correta

## Resolution

root_cause: |
  CAUSA PRIMÁRIA: swap não-atômico de duas etapas em reorderLessonAction cria uma janela
  onde o estado intermediário (duas aulas com a mesma posição) pode ser lido por uma segunda
  invocação da ação antes da página re-renderizar. Uma segunda chamada (double-submit) lê
  a posição já incrementada e troca com a próxima aula, fazendo a aula pular duas posições.
  
  CAUSA SECUNDÁRIA: reorderLessonDownAction (em reorder-actions.ts) retorna void e descarta
  o resultado de reorderLessonAction. Quando o neighbor não é encontrado (e.g. aula deletada
  ocupa posição intermediária), a ação falha silenciosamente sem feedback ao usuário.

fix: |
  1. src/app/actions/update-lesson.ts — reorderLessonAction:
     - Neighbor lookup alterado de aritmética (position + 1) para query ORDER BY com
       lt/gt + limit(1), que encontra a aula adjacente real ignorando gaps de soft-delete.
     - Adicionado optimistic concurrency check: após encontrar o neighbor, re-lê a posição
       atual da aula. Se mudou desde a primeira leitura, retorna success sem executar o swap
       (idempotência contra double-submit).
  
  2. src/app/admin/cursos/[slug]/reorder-actions.ts — reorderLessonUpAction / reorderLessonDownAction:
     - Propagam o resultado de reorderLessonAction; lançam Error quando !result.success
       para que o Next.js error boundary exiba o erro ao admin em vez de descartá-lo.
  
  3. src/app/actions/manage-lesson.test.ts:
     - Testes do reorderLessonAction atualizados para o novo shape da query de neighbor
       (array retornado por order() em vez de maybeSingle()).
     - Adicionados dois novos casos: guard de double-submit e aula já no limite.

verification: "97/97 testes passando, lint clean (0 warnings)"
files_changed:
  - src/app/actions/update-lesson.ts
  - src/app/admin/cursos/[slug]/reorder-actions.ts
  - src/app/actions/manage-lesson.test.ts
