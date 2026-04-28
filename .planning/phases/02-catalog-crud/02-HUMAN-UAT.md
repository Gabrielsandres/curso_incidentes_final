---
status: partial
phase: 02-catalog-crud
source: [02-VERIFICATION.md]
started: 2026-04-28T13:55:00Z
updated: 2026-04-28T13:55:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Lifecycle do curso (rascunho → publicado → arquivado)
expected: Admin cria curso em `/admin/cursos/novo` em rascunho. Curso NÃO aparece em `/dashboard` para um aluno com enrollment. Admin clica "Publicar curso" em `/admin/cursos/[slug]`. Curso APARECE em `/dashboard`. Admin clica "Arquivar curso" + confirma. Curso some de `/dashboard` mas o enrollment continua na tabela.
result: [pending]

### 2. Reordenação de aulas com botões ↑↓
expected: Admin abre `/admin/cursos/[slug]/modulos/[id]`. Lista de aulas mostra aulas em ordem `position`. Clicar ↓ na primeira aula faz ela trocar de posição com a segunda visualmente; recarregar a página confirma a nova ordem. Clicar ↑ desfaz.
result: [pending]

### 3. Soft-delete de aula preserva lesson_progress
expected: Em ambiente dev, criar um aluno fictício com row em `lesson_progress` para uma aula L. Como admin, deletar a aula L via UI (`/admin/cursos/[slug]/aulas/[id]` → "Remover aula" + confirmar). Verificar via SQL: `SELECT count(*) FROM lesson_progress WHERE lesson_id = '<L>';` — deve retornar > 0 (a row sobreviveu); `SELECT deleted_at FROM lessons WHERE id = '<L>';` deve mostrar timestamp não-nulo.
result: [pending]

### 4. MIME whitelist em upload de material
expected: Como admin, navegar até `/admin/cursos/[slug]/aulas/[id]`. Tentar upload de:
- (a) um `.pdf` válido < 20MB → upload sucede, material aparece na lista
- (b) um `.exe` (renomeie um arquivo qualquer pra `.exe` ou faça download de um real) → server retorna erro pt-BR "Tipo de arquivo não permitido. Aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG."
- (c) um `.png` válido → upload sucede
- (d) um `.zip` → rejeitado com a mesma mensagem pt-BR
result: [pending]

### 5. Grant access — fluxo aluno existente
expected: Como admin, abrir `/admin/cursos/[slug]/alunos`. Clicar "Conceder acesso". Digitar o email de um aluno que JÁ existe em `profiles`. Sistema busca, mostra "Aluno encontrado: {nome} ({email})". Confirmar com "Sem expiração". Verificar via SQL: `SELECT * FROM enrollments WHERE user_id = '<UUID>' AND course_id = '<UUID>'` — row criada com `source='admin_grant'`. Aluno vê o curso em `/dashboard`.
result: [pending]

### 6. Grant access — fluxo aluno NOVO (invite + pending_enrollments)
expected: Como admin, na mesma tela do passo 5, digitar um email que NÃO existe em `profiles`. Sistema mostra "Não encontramos esse email. Enviar convite?". Confirmar. Verificar:
- Email de convite chega na inbox (Resend/SMTP padrão dev)
- `SELECT * FROM pending_enrollments WHERE email = '<email>'` retorna 1 row
- Após o aluno aceitar o convite e definir senha, `accept-invite-form` chama `convertPendingEnrollmentsForEmail` → row de `pending_enrollments` é deletada e nova row de `enrollments` aparece com `source='admin_grant'`
- Aluno faz login e vê o curso em `/dashboard`
result: [pending]

### 7. UTM capture no formulário institucional
expected: Visitar `/?utm_source=linkedin&utm_medium=post&utm_campaign=phase2-verify`. Submeter o formulário institucional na landing com dados de teste (organização + email). Após submit, verificar via SQL: `SELECT utm_source, utm_medium, utm_campaign FROM institutional_leads ORDER BY created_at DESC LIMIT 1` — os 3 campos devem ter os valores da URL. Repetir submetendo formulário a partir de `/` (sem query string) — os 3 campos devem ser NULL.
result: [pending]

### 8. /health não regrediu (regressão Phase 1)
expected: `curl -s http://localhost:3000/health | jq` retorna `{status, uptime, timestamp, version}`. Sem 500. Confirmação de que o npm run dev sobe sem crash devido às mudanças de schema da Phase 2 (database.types.ts atualizado, env.ts intacto).
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
