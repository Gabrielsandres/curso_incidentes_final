---
status: partial
phase: 02-catalog-crud
source: [02-VERIFICATION.md]
started: 2026-04-28T13:55:00Z
updated: 2026-04-29T02:30:00Z
fixes_applied:
  - "6cee1d4 — fix(02-05): redirect after createCourseAction (Item 1 sub-bug)"
  - "73d74e9 — fix(02): split server action types into form-state files (BUG-01, BUG-03 from UAT, plus BUG-02)"
  - "c3ce8ae — fix(02-05): inline feedback after publish/unpublish/archive (BUG-04)"
known_open_issues:
  - "BUG-05 (P1 infra): Supabase 503 / Connection closed for mutations after dev session warms up. Likely Supabase free-tier pool exhaustion or PgBouncer config. NOT a code bug — infrastructure investigation needed."
---

## Current Test

[awaiting human testing — operator opted to test manually after fixes]

## Tests

### 1. Lifecycle do curso (rascunho → publicado → arquivado)
expected: Admin cria curso em `/admin/cursos/novo` em rascunho. Curso NÃO aparece em `/dashboard` para um aluno com enrollment. Admin clica "Publicar curso" em `/admin/cursos/[slug]`. Curso APARECE em `/dashboard`. Admin clica "Arquivar curso" + confirma. Curso some de `/dashboard` mas o enrollment continua na tabela.
result: [pending — see "Browser Agent UAT runs" section below]

### 2. Reordenação de aulas com botões ↑↓
expected: Admin abre `/admin/cursos/[slug]/modulos/[id]`. Lista de aulas mostra aulas em ordem `position`. Clicar ↓ na primeira aula faz ela trocar de posição com a segunda visualmente; recarregar a página confirma a nova ordem. Clicar ↑ desfaz.
result: [pending — see "Browser Agent UAT runs" section below]

### 3. Soft-delete de aula preserva lesson_progress
expected: Em ambiente dev, criar um aluno fictício com row em `lesson_progress` para uma aula L. Como admin, deletar a aula L via UI (`/admin/cursos/[slug]/aulas/[id]` → "Remover aula" + confirmar). Verificar via SQL: `SELECT count(*) FROM lesson_progress WHERE lesson_id = '<L>';` — deve retornar > 0 (a row sobreviveu); `SELECT deleted_at FROM lessons WHERE id = '<L>';` deve mostrar timestamp não-nulo.
result: [pending — see "Browser Agent UAT runs" section below]

### 4. MIME whitelist em upload de material
expected: Como admin, navegar até `/admin/cursos/[slug]/aulas/[id]`. Tentar upload de:
- (a) um `.pdf` válido < 20MB → upload sucede, material aparece na lista
- (b) um `.exe` (renomeie um arquivo qualquer pra `.exe` ou faça download de um real) → server retorna erro pt-BR "Tipo de arquivo não permitido. Aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG."
- (c) um `.png` válido → upload sucede
- (d) um `.zip` → rejeitado com a mesma mensagem pt-BR
result: [pending — see "Browser Agent UAT runs" section below]

### 5. Grant access — fluxo aluno existente
expected: Como admin, abrir `/admin/cursos/[slug]/alunos`. Clicar "Conceder acesso". Digitar o email de um aluno que JÁ existe em `profiles`. Sistema busca, mostra "Aluno encontrado: {nome} ({email})". Confirmar com "Sem expiração". Verificar via SQL: `SELECT * FROM enrollments WHERE user_id = '<UUID>' AND course_id = '<UUID>'` — row criada com `source='admin_grant'`. Aluno vê o curso em `/dashboard`.
result: [pending — see "Browser Agent UAT runs" section below]

### 6. Grant access — fluxo aluno NOVO (invite + pending_enrollments)
expected: Como admin, na mesma tela do passo 5, digitar um email que NÃO existe em `profiles`. Sistema mostra "Não encontramos esse email. Enviar convite?". Confirmar. Verificar:
- Email de convite chega na inbox (Resend/SMTP padrão dev)
- `SELECT * FROM pending_enrollments WHERE email = '<email>'` retorna 1 row
- Após o aluno aceitar o convite e definir senha, `accept-invite-form` chama `convertPendingEnrollmentsForEmail` → row de `pending_enrollments` é deletada e nova row de `enrollments` aparece com `source='admin_grant'`
- Aluno faz login e vê o curso em `/dashboard`
result: [pending — see "Browser Agent UAT runs" section below]

### 7. UTM capture no formulário institucional
expected: Visitar `/?utm_source=linkedin&utm_medium=post&utm_campaign=phase2-verify`. Submeter o formulário institucional na landing com dados de teste (organização + email). Após submit, verificar via SQL: `SELECT utm_source, utm_medium, utm_campaign FROM institutional_leads ORDER BY created_at DESC LIMIT 1` — os 3 campos devem ter os valores da URL. Repetir submetendo formulário a partir de `/` (sem query string) — os 3 campos devem ser NULL.
result: [pending — see "Browser Agent UAT runs" section below]

### 8. /health não regrediu (regressão Phase 1)
expected: `curl -s http://localhost:3000/health | jq` retorna `{status, uptime, timestamp, version}`. Sem 500. Confirmação de que o npm run dev sobe sem crash devido às mudanças de schema da Phase 2 (database.types.ts atualizado, env.ts intacto).
result: [pending — see "Browser Agent UAT runs" section below]

## Browser Agent UAT runs

Two attempts by the Claude browser agent (Chrome) before the operator opted to test
manually. Outcomes consolidated below per item.

### Run 1 (2026-04-29T01:15Z)
All items except 8 reported as `BLOCKED` due to errors that turned out to be Next.js
hot-reload artifacts ("use server" stale webpack module-evaluation errors). Actionable
findings were 3 false-positive bugs (BUG-01, 02, 03 in the run-1 report).

### Run 2 (2026-04-29T02:15Z, after dev-server restart)
Re-execution invalidated 2 of the 3 reported bugs as HMR artifacts. Remaining outcomes:

| Item | Status (run 2) | Notes |
|------|---------------|-------|
| 1 — Lifecycle | PARTIAL ✓ | Rascunho → Publicado → Despublicado → Publicado → Arquivado all worked. Stats row updates correctly. **Caveat:** no toast/inline message after lifecycle mutations (BUG-04, fixed in commit `c3ce8ae`). Aluno-side check still pending. |
| 2 — Reorder | BLOCKED | Could not test — Supabase 503 on module creation (BUG-05 infra). |
| 3 — Soft-delete | BLOCKED | Cascading from item 2 (no lessons to delete). |
| 4 — MIME whitelist | BLOCKED | Cascading from item 2 (no lesson page reachable). |
| 5 — Grant existing | BLOCKED | Confirmed real bug — `grantState.message` undefined crash (BUG-02, **already fixed in commit `73d74e9`** before run 2 started; agent likely tested against a stale tab). Operator must hard-reload browser (Ctrl+Shift+R) before retesting. |
| 6 — Grant new (invite) | BLOCKED | Cascading from item 5 (page won't render). |
| 7 — UTM capture | PARTIAL ✓ | **Front-end PASSED**: hidden inputs correctly populated with UTM params from URL. **Back-end BLOCKED**: Supabase 503 on form submission (BUG-05 infra). |
| 8 — /health | PASSED ✓ | JSON shape correct, latency <100ms. |

### Bugs caught & fixed in this UAT cycle

| Bug | Severity | Status | Commit |
|-----|----------|--------|--------|
| Item 1 redirect missing after createCourseAction | P2 UX | Fixed | `6cee1d4` |
| BUG-01 (run 1) — false positive (HMR stale) | — | Discarded | — |
| BUG-02 — `grantState.message` undefined crash | P0 | Fixed | `73d74e9` |
| BUG-03 (run 1) — false positive (HMR stale) | — | Discarded | — |
| BUG-04 (run 2) — silent UX after publish/archive | P2 UX | Fixed | `c3ce8ae` |
| BUG-05 (run 2) — Supabase 503 on mutations after warmup | P1 infra | **OPEN** | — |

### Open: BUG-05 (Supabase mutation 503)

Symptoms: HTTP 503 + `"Connection closed."` digest `2104100782` on POSTs to Server Actions
after the dev server has been running for some time. Affects writes only; reads
(/health, RSC page renders) keep working. Likely causes:

1. Supabase free-tier connection pool exhaustion in the project's hosted DB
2. PgBouncer not enabled in the project's connection string
3. Next.js dev server holding stale `createSupabaseServerClient()` instances per HMR cycle (the `cookies()` is fresh per request, but the underlying `@supabase/ssr` client may pool incorrectly in dev)

**Recommended diagnostic steps for the operator (before retesting items 2/3/4/7):**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is the **pooler** URL (`...pooler.supabase.com`) not the direct one (`...supabase.co`) — pooler URLs handle connection multiplexing properly
2. Check Supabase Dashboard → Database → Pooling: is PgBouncer enabled?
3. Restart dev server immediately before testing (`npm run dev` fresh) and run items 2/3/4/7 in sequence quickly
4. If 503 persists in fresh dev: open Supabase logs at the moment of the failure to see if the DB is rejecting the connection or if it's a Next.js networking issue

If BUG-05 reproduces in production after deploy, this becomes a P0 release blocker
and warrants a dedicated investigation phase (e.g., `/gsd-debug supabase-503`).

## Summary

total: 8
passed: 1 (item 8)
partial: 2 (items 1 + 7 — front-end logic verified, back-end persistence pending)
fixed_during_uat: 3 (item 1 redirect, BUG-02, BUG-04)
blocked_by_infra: 4 (items 2, 3, 4, 7-backend — all by BUG-05 Supabase 503)
blocked_by_stale_tab: 2 (items 5, 6 — fix is in main; needs hard reload + Supabase up)
pending: 8 (operator will retest manually)
skipped: 0

## Gaps
