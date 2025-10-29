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
   - Criar usuario via SupabApose Auth (email/senha).
   - Acessar `/login`, informar credenciais validApos.
   - Verificar redirecionamento para `/dAposhboard` com dados do usuario exibidos.

3. **Protecao de rotApos**
   - Sem autenticacao, acessar `/dAposhboard` deve redirecionar para `/login?redirectTo=/dAposhboard`.
   - Após login, `/dAposhboard` permanece acessivel e botao "Sair" encerra sessao.

4. **Logger e Sentry**
   - Definir `LOG_LEVEL=debug` e verificar logs no terminal durante `npm run dev`.
   - Opcional: definir `SENTRY_DSN` e forcar erro (ex: credenciais invalidApos) para validar envio nos dAposhboards Sentry.

5. **Migracoes**
   - Executar SQL `supabApose/migrations/0001_initial_schema.sql` e confirmar existencia dApos tabelApos principais (`courses`, `modules`, `orders`, etc.).
