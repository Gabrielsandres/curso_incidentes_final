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
14. `0015_promote_institution_manager_rpc.sql` — Phase 5: RPCs SECURITY DEFINER `promote_institution_manager` + `demote_institution_manager` para promote/demote atômico (single transaction, prevent partial-failure "two managers" state). Aplicar isoladamente após 0013. *(Migração 0014_catalog_metadata.sql é entregue pela Phase 2; quando aplicada, será inserida nesta lista entre 0013 e 0015.)*

> ⚠️ **Atenção:** Abra dois queries separados no SQL Editor — NÃO aplique 0012 e 0013 no mesmo bloco. Aplique `0012_add_institution_manager_role.sql`, confirme que rodou sem erro, feche o query, e só então abra um novo query para `0013_institutions_enrollments.sql`.
>
> **Motivo:** O SQL Editor pode executar scripts multi-statement em uma única transação. Se 0012 e 0013 forem aplicados juntos, o Postgres lança `ERROR: unsafe use of new value "institution_manager" of enum type user_role` na primeira policy de 0013 que referencia o novo valor do enum — porque o `COMMIT` de 0012 ainda não ocorreu.
>
> ⚠️ **0015:** Após confirmar que 0013 rodou sem erro, abra um novo query e aplique `0015_promote_institution_manager_rpc.sql`. Verifique com `select proname from pg_proc where proname in ('promote_institution_manager','demote_institution_manager');` — devem retornar 2 linhas. *(O nome do arquivo pula 0014 porque a Phase 2 reservou esse slot para `0014_catalog_metadata.sql`; aplique-a primeiro se ainda não estiver no banco.)*

---

## Phase 5 — Configuração Manual Adicional

Phase 5 adicionou um Edge Function estendido (`Criar-usuario` com suporte a `institution_id`) e um template pt-BR de email institucional que vive no painel do Supabase Auth (não no repo). Aplicar **uma vez** antes do release de Phase 5 e **revalidar a cada deploy**.

### 1. Deploy do Edge Function `Criar-usuario`

Phase 5 estendeu o Edge Function para aceitar `institution_id` no payload do invite. Após qualquer alteração em `supabase/functions/Criar-usuario/index.ts`:

```bash
supabase functions deploy Criar-usuario
```

Verificação: Supabase Dashboard → **Edge Functions** → `Criar-usuario` → **Logs** mostra evento de deploy recente. Smoke-test invocando a função com payload `institution_id` válido — resposta deve conter `"Convite enviado para {email} da instituição {institutionName}."`

### 2. Template pt-BR no Supabase Auth Panel (EMAIL-03)

**Source of truth:** `docs/email-templates.md`. O template vive no painel do Supabase Auth e **não há API para versionar programaticamente** (verificado em 2026 — Pitfall 2 do RESEARCH Phase 5). Toda alteração em `docs/email-templates.md` exige re-paste manual.

> **W-2 cross-reference:** Se você completou plan 05-04 Task 4 (o operator gate `[BLOCKING] Deploy Edge Function + paste pt-BR Auth template` durante o desenvolvimento da Phase 5), este re-paste é apenas uma checagem de drift — confirme que o painel ainda corresponde a `docs/email-templates.md`. Caso contrário (se o painel está vazio ou este é um ambiente novo), este é o **primeiro** paste do template pt-BR e os smoke tests em §6-7 vão exercitar o rendering institucional pt-BR pela primeira vez.

**Procedimento (uma vez antes do release; repetir a cada alteração no doc):**

1. Abrir `docs/email-templates.md` no editor.
2. Supabase Dashboard → **Authentication** → **Email Templates** → **Invite User**.
3. Copiar §Subject do doc → colar no campo **Subject** do painel.
4. Copiar §HTML Body do doc (bloco `<!DOCTYPE html>...</html>`) → colar no editor de body do painel.
5. Salvar.
6. Smoke-test institucional: enviar convite real de `/admin/instituicoes/[slug]` para email controlado; confirmar:
   - Subject contém o nome da instituição (ex.: "Bem-vindo(a) à plataforma MDHE — convite de Colégio X")
   - Body em pt-BR contém "como aluno(a) da Colégio X"
   - Botão "Aceitar convite e criar minha senha" presente; link aponta para URL de confirmação Supabase
7. Smoke-test fallback B2C: convidar via `/admin/usuarios` (sem `institution_id`); confirmar body usa branch `{{ else }}` ("Você foi convidado(a) pela MDHE Consultoria...") sem nome de instituição.

**Detecção de drift:** antes de cada deploy de produção, comparar visualmente o template no painel com `docs/email-templates.md`. Se divergirem, re-aplicar do doc.

> **Operator warning (I-1):** O Subject do template tem o limite documentado em `docs/email-templates.md` §Known limitations — para convites B2C legados (sem `institution_name`), o Subject resolve para `"Bem-vindo(a) à plataforma MDHE — convite de "` com **espaço final** (porque Subject não suporta `{{ if }}` Go-template). Esta "feiura" cosmética é aceitável para v1 (apenas o admin invoca o caminho B2C via `/admin/usuarios`); só requer ação se um polish pre-release for solicitado.

### 3. Smoke-test Phase 5 pós-deploy

Executar como conta admin **após** todos os passos acima estarem aplicados:

- [ ] `/admin/instituicoes` carrega sem erro; mostra "Nenhuma instituição cadastrada" se for o primeiro deploy
- [ ] Criar instituição teste via `/admin/instituicoes/nova` redireciona para `/admin/instituicoes/[slug]` após sucesso
- [ ] Invite institucional via aba "Convidar novo aluno" envia email pt-BR com nome da instituição (ver §2 acima)
- [ ] Aluno aceita convite, faz login, é redirecionado para `/dashboard` (role `student` por default)
- [ ] Admin promove aluno a gestor via "Promover a gestor" → toast de sucesso → aluno faz login e acessa `/gestor` com sucesso
- [ ] Aluno sem role `institution_manager` tentando acessar `/gestor` é redirecionado para `/dashboard`
- [ ] Gestor órfão (`profiles.role='institution_manager'` sem linha em `institution_members`) é redirecionado para `/dashboard?notice=orphan-manager` com banner âmbar
- [ ] Admin tentando acessar `/gestor` é redirecionado para `/admin/instituicoes`
- [ ] Cleanup: `delete from institution_members where institution_id = '<test_id>'; delete from institutions where slug = '<test_slug>'; delete from auth.users where email = '<test_email>';`

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

> **⚠ BLOQUEADOR DE PRODUÇÃO — P0**
>
> Plan 01-04 está **deferred** (ver `.planning/phases/01-foundation/01-04-SUMMARY.md`). Aguardando aquisição de domínio MDHE.
>
> **NÃO promover para produção sem completar esta seção.** O SMTP padrão do Supabase tem rate limit de ~4 emails/hora — incompatível com onboarding B2B real (convites a funcionários falhariam em escala).
>
> Em dev/staging, o SMTP padrão do Supabase continua funcionando para testes manuais ocasionais.
>
> **Para retomar:** adquirir domínio (ex: `mdhe.com.br` no Registro.br) → executar `/gsd-execute-phase 1 --wave 4` ou seguir o runbook em `.planning/phases/01-foundation/01-04-PLAN.md`.

<!-- Plan 01-04 fills this once domain is acquired -->

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

---

*Last updated: 2026-05-02 after Phase 5 (B2B Institution Manager) completion*
