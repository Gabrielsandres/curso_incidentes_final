# Changelog

## [Etapa 1] - Landing Page Comercial
- Cria landing page completa na rota `/` com hero, secoes de valor, FAQ e CTA final.
- Centraliza copy e estrutura em `src/lib/marketing/content.ts` e componentes em `src/components/marketing`.
- Implementa formulario institucional com validacao (Zod) + server action gravando leads no Supabase.
- Atualiza design system global (fonte Inter, tokens de cor) e CTAs configuraveis via variaveis `NEXT_PUBLIC_CHECKOUT_URL_*`.
- Adiciona testes para o schema de leads e documentacao dos novos fluxos.

## [Etapa 0] - Fundacoes
- Cria projeto Next.js 16 com Tailwind, TypeScript e alias `@/`.
- Integra Supabase Auth com middleware, rotas `/login` e `/dashboard` protegidas.
- Adiciona rota `/health` com resposta JSON dinamica.
- Configura logger interno e integracao Sentry (client/server/edge) + instrumentation hook.
- Publica migracao inicial com entidades principais (cursos, modulos, aulas, materiais, pedidos, leads, etc.).
- Cria pipeline GitHub Actions (lint, test, build) e scripts npm padronizados.
- Implementa testes unitarios (Vitest) para validacao de variaveis de ambiente.
- Atualiza README com instrucoes de setup, deploy e observabilidade.
- Documenta checklist, changelog, testes e deploy em `docs/`.
