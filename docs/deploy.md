# Deploy e Homolog

- **Homolog URL**: Pendente (configurar projeto Vercel apontando para este repositorio).

## Passos sugeridos

1. **Criar projeto Supabase**
   - Aplicar migracoes em ordem:
     - `supabase/migrations/0001_initial_schema.sql`
     - `supabase/migrations/0002_roles_and_profiles.sql`
     - `supabase/migrations/0003_lessons_materials_admin_policies.sql`
     - `supabase/migrations/0004_institutional_leads_rls.sql`
   - Ativar autenticacao Email/Password e, opcionalmente, SMTP transacional.

2. **Criar projeto na Vercel**
   - Importar o repositorio.
   - Definir `Framework = Next.js` e manter `Root Directory` vazio (raiz do repositorio).
   - `Build Command = npm run build` e `Install Command = npm install`.
   - Habilitar Node 20.

3. **Variaveis de ambiente na Vercel**
   - Replicar chaves do `.env.local`.
   - Atualizar `NEXT_PUBLIC_APP_URL` com a URL gerada pela Vercel.

4. **Supabase webhook (futuro)**
   - Reservar `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_JWT_SECRET` para etapas futuras (pagamentos e webhooks).

5. **Sentry**
   - Adicionar `SENTRY_DSN` e `SENTRY_ENVIRONMENT` se monitoramento estiver habilitado.

Apos a publicacao, atualizar esta pagina com a URL final de homolog.
