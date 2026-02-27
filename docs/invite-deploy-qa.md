# Deploy da Edge Function (convite por e-mail)

## 1) Login e link do projeto

```bash
npx supabase login
npx supabase link --project-ref iabdzbbsukdjhcxjxgkl
```

## 2) Definir secrets da Function

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SEU_SERVICE_ROLE_KEY"
npx supabase secrets set APP_URL="https://seu-dominio.com"
```

Em ambiente local, use `APP_URL="http://localhost:3000"`.

## 3) Deploy da Function

```bash
npx supabase functions deploy Criar-usuario --project-ref iabdzbbsukdjhcxjxgkl
```

## 4) Validacao no Dashboard (obrigatorio)

1. Auth > URL Configuration:
   - Site URL (dev e prod)
   - Redirect URLs incluindo:
     - `http://localhost:3000/auth/accept-invite`
     - `https://seu-dominio.com/auth/accept-invite`
2. Auth > SMTP Settings configurado.
3. Auth > Email Templates > Invite user (opcional personalizacao).

## 5) QA funcional (fluxo fim a fim)

1. Entrar com admin.
2. Ir em `/admin/usuarios` e convidar usuario com `Nome completo` + `Email`.
3. Confirmar mensagem de sucesso no admin.
4. Validar chegada do e-mail de convite.
5. Abrir link do e-mail em `/auth/accept-invite`.
6. Definir senha (>= 8) e confirmar senha.
7. Confirmar redirecionamento para `/login` com mensagem `Senha definida com sucesso.`
8. Fazer login com email/senha e validar acesso normal.
9. Ir em `/admin/usuarios/reenviar-convite` e reenviar convite para o mesmo email (ou pendente).
10. Validar mensagem de sucesso/erro amigavel conforme retorno do Supabase.
