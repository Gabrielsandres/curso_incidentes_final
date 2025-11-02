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
   - Executar SQL `supabase/migrations/0001_initial_schema.sql` e confirmar existencia das tabelas principais (`courses`, `modules`, `orders`, `institutional_leads`, etc.).
