# Checklist de Deploy — Plataforma MDHE Gestão de Incidentes

> Aplicar antes de qualquer promoção para produção. Cada item é obrigatório.
> Campos marcados com `[PROD]` são exigidos apenas no ambiente de produção.

---

## 1. Variáveis de Ambiente

Verificar que todas as variáveis abaixo estão configuradas no painel da Vercel
(Settings → Environment Variables → Production).

| Variável | Tipo | Obrigatória em Prod | Schema em `src/lib/env.ts` | Segredo? |
|----------|------|---------------------|---------------------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `clientSchema` | Sim | URL válida | Não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `clientSchema` | Sim | string não-vazia | Não |
| `NEXT_PUBLIC_APP_URL` | `clientSchema` | Sim | URL válida (ex: `https://app.mdhe.com.br`) | Não |
| `SUPABASE_SERVICE_ROLE_KEY` | `serverSchema` | **Sim `[PROD]`** | string não-vazia — obrigatória em produção via `superRefine` (OPS-01, Phase 1) | **Sim** |
| `SUPABASE_JWT_SECRET` | `serverSchema` | Recomendado | string (opcional; validação JWT local) | Sim |
| `SENTRY_DSN` | `serverSchema` | Recomendado `[PROD]` | string (ausência = wrapper no-ops, sem crash) | Sim |
| `LOG_LEVEL` | `serverSchema` | Não | `debug\|info\|warn\|error` (padrão: `info`) | Não |
| `APP_VERSION` | (runtime) | Recomendado | qualquer string; exposta em `/health` como `version` | Não |

**Notas:**
- `NEXT_PUBLIC_CHECKOUT_URL_*` são opcionais em `clientSchema` — plataforma funciona sem checkouts no v1.
- `EMAIL_FROM` **não é validado pelo `serverSchema`**; é configurado diretamente no painel do Supabase Auth (Authentication → SMTP Settings → Sender email). Documentar aqui o endereço configurado: `__________________@__________________`
- A conta Resend usada para SMTP: `__________________` (API key salva em: `__________________`)

---

## 2. Migrações Pendentes

Aplicar **nesta ordem** via Supabase SQL Editor (Project → SQL Editor → New Query):

1. `0001_initial_schema.sql`
2. `0002_roles_and_profiles.sql`
3. `0003_lessons_materials_admin_policies.sql`
4. `0004_institutional_leads_rls.sql`
5. `0005_lesson_progress_rls.sql`
6. `0006_course_cover_and_material_description.sql`
7. `0007_materials_storage_uploads.sql`
8. `0008_profiles_full_name_and_admin_users.sql`
9. `0009_fix_auth_profile_trigger.sql`
10. `0010_make_auth_profile_trigger_fail_safe.sql`
11. `0011_courses_and_certificates.sql`
12. `0012_add_institution_manager_role.sql` — Apenas `ALTER TYPE user_role ADD VALUE 'institution_manager'`. **Deve ser aplicada e commitada ANTES da 0013.**
13. `0013_institutions_enrollments.sql` — Tabelas `institutions`, `institution_members`, `enrollments` (nova estrutura), helper `is_member_of_institution`, RLS, backfill de admins.

> ⚠️ **Atenção:** Abra dois queries separados no SQL Editor — NÃO aplique 0012 e 0013 no mesmo bloco. Aplique `0012_add_institution_manager_role.sql`, confirme que rodou sem erro, feche o query, e só então abra um novo query para `0013_institutions_enrollments.sql`.
>
> **Motivo:** O SQL Editor pode executar scripts multi-statement em uma única transação. Se 0012 e 0013 forem aplicados juntos, o Postgres lança `ERROR: unsafe use of new value "institution_manager" of enum type user_role` na primeira policy de 0013 que referencia o novo valor do enum — porque o `COMMIT` de 0012 ainda não ocorreu.

---

## 3. Smoke Tests Pós-Deploy

Executar manualmente após cada deploy de produção.

### 3.1 Health Check

```bash
curl -s https://app.mdhe.com.br/health | jq
```

Resposta esperada (HTTP 200):

```json
{
  "status": "ok",
  "uptime": 1.234,
  "timestamp": "2026-04-27T00:00:00.000Z",
  "version": "<valor de APP_VERSION>"
}
```

Todos os quatro campos (`status`, `uptime`, `timestamp`, `version`) devem estar presentes.

### 3.2 Login de Admin

- [ ] Acessar `https://app.mdhe.com.br/login`
- [ ] Fazer login com a conta admin seeded
- [ ] Verificar redirecionamento para `/dashboard` sem erro 500

### 3.3 Abertura de Aula como Admin

- [ ] No painel de admin, confirmar que o admin tem enrollment no curso de teste (via backfill da migração 0013)
- [ ] Acessar `/curso/[slug-do-curso-de-teste]`
- [ ] Clicar em uma aula — deve abrir normalmente (RLS ENR-02 permite por enrollment ativo)
- [ ] Verificar que o progresso da aula é marcado corretamente

### 3.4 Geração de Certificado com Data Correta

- [ ] Acessar "Meus certificados" como admin em um curso com 100% concluído
- [ ] Baixar o certificado PDF
- [ ] Verificar que a data exibida está no fuso horário `America/Sao_Paulo` (especialmente importante se o download acontecer entre 21h–23:59h de Brasília — o dia deve ser o local, não o UTC do dia seguinte)

### 3.5 Email via Resend

- [ ] Acionar "Esqueci minha senha" com um endereço Gmail de teste
- [ ] Verificar que o email chega à caixa de entrada (não spam) com remetente `@mdhe.com.br` em até 60s
- [ ] Repetir com um endereço Outlook/Hotmail

### 3.6 Sentry (se SENTRY_DSN configurado)

- [ ] Confirmar no painel do Sentry que um evento de teste foi recebido do ambiente de produção
- [ ] Verificar que o ambiente (`SENTRY_ENVIRONMENT`) está correto no evento

---

## 4. Configuração de Email (Resend SMTP)

<!-- Plan 01-04 fills this -->

Status: `[ ]` Domínio verificado no Resend (SPF + DKIM verdes)

| Campo | Valor configurado |
|-------|-----------------|
| `EMAIL_FROM` (remetente) | `_____________________________` |
| Conta Resend | `_____________________________` |
| API Key armazenada em | `_____________________________` |
| Provedor DNS onde os registros foram adicionados | `_____________________________` |

**Testes de entregabilidade realizados:**
- `[ ]` Gmail: email de recuperação chegou à caixa de entrada (não spam) em até 60s
- `[ ]` Outlook/Hotmail: email de recuperação chegou à caixa de entrada (não spam) em até 60s

**Configuração no painel do Supabase Auth** (Authentication → SMTP Settings):

| Campo | Valor |
|-------|-------|
| Host | `smtp.resend.com` |
| Porta | `465` |
| Usuário | `resend` |
| Senha | API key do Resend (permissão "Sending access") |
| Sender email | `EMAIL_FROM` (preenchido acima) |

> **Nota:** `EMAIL_FROM` é configurado no painel do Supabase Auth, não em `src/lib/env.ts`. A variável não passa pela validação do Zod `serverSchema` — ela é lida diretamente pela plataforma Supabase ao enviar emails.

---

## 5. Rollback

Se qualquer smoke test falhar após um deploy:

1. **Reverter o deploy no Vercel:** acesse Deployments → selecione o deployment anterior estável → clique em "Promote to Production".
2. **Migrações SQL não têm rollback automático.** As migrações do Supabase são aditivas (adicionam colunas/tabelas/policies) — elas não precisam ser revertidas se apenas o código da aplicação foi promovido. Se uma migração criou um estado inconsistente, documente o estado, **não tente reverter o schema manualmente sem um DBA**, e abra um chamado interno.
3. **Investigar antes de re-fazer o deploy:** verifique os logs da Vercel (Functions → Logs) e o painel do Sentry para identificar a causa raiz antes de tentar novamente.

---

## Notas de CI Local

Para verificar o pipeline antes de fazer push:

```bash
npm run lint        # zero warnings (--max-warnings=0)
npm run typecheck   # tsc --noEmit
npm run test:ci     # vitest run --reporter=verbose
npm run build       # next build --webpack
```

> **Nota (Windows):** Em alguns ambientes Windows, `npm run test:ci` com `--reporter=verbose` pode exibir saída incompleta devido a uma race condition do Vitest. Se o comando exibir "no tests" mas os arquivos existem, rode `npx vitest run` (sem `--reporter=verbose`) como alternativa e confirme que todos os testes passam antes de prosseguir.
