# Changelog

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
