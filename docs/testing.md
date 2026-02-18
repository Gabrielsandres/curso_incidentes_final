# Instrucoes de Teste

## Testes automatizados
1. `npm install`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

## Testes manuais sugeridos

1. **Healthcheck**
   - Acesse `GET /health` e confirme resposta `status: ok` e `version` definida.

2. **Fluxo de login**
   - Criar usuario via Supabase Auth (email/senha).
   - Acessar `/login`, informar credenciais validas.
   - Verificar redirecionamento para `/dashboard` com dados do usuario exibidos.

3. **Protecao de rotas**
   - Sem autenticacao, acessar `/dashboard` deve redirecionar para `/login?redirectTo=/dashboard`.
   - Depois do login, `/dashboard` permanece acessivel e o botao "Sair" encerra a sessao corretamente.

4. **Landing page comercial**
   - Acessar `/` e validar renderizacao das 11 secoes, links de planos e responsividade (mobile/desktop).
   - Conferir se os botoes de plano apontam para os links definidos em `NEXT_PUBLIC_CHECKOUT_URL_*` ou anchors de fallback.

5. **Formulario institucional**
   - Preencher dados validos e enviar; verificar mensagem de sucesso e registro na tabela `public.institutional_leads`.
   - Tentar envio com email invalido para garantir exibicao de erros inline.

6. **Logger e Sentry**
   - Definir `LOG_LEVEL=debug` e verificar logs durante `npm run dev`.
   - Opcional: definir `SENTRY_DSN` e forcar erro (ex.: credenciais invalidas) para validar envio ao dashboard Sentry.

7. **Migracoes**
   - Executar em ordem:
     - `supabase/migrations/0001_initial_schema.sql`
     - `supabase/migrations/0002_roles_and_profiles.sql`
     - `supabase/migrations/0003_lessons_materials_admin_policies.sql`
     - `supabase/migrations/0004_institutional_leads_rls.sql`
   - Confirmar existencia das tabelas principais (`courses`, `modules`, `orders`, `institutional_leads`, etc.) e policies de RLS.

## Status de retomada (2026-02-18)

1. **/login -> /dashboard**
   - Status: Pendente validacao manual no ambiente Supabase atual.
2. **Aluno acessa /curso/[slug] e /curso/[slug]/aula/[lessonId]**
   - Status: Pendente validacao manual com dados reais de curso/aula.
3. **Admin acessa /dashboard/aulas/nova e cadastra aula**
   - Status: Pendente validacao manual com usuario `admin` em `profiles`.
4. **Formulario institucional salva lead**
   - Status: Pendente validacao manual apos configurar `SUPABASE_SERVICE_ROLE_KEY`.
