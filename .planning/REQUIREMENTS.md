# Requirements: Plataforma MDHE — Gestão de Incidentes

**Defined:** 2026-04-27
**Core Value:** Um aluno (B2C ou B2B) consegue concluir um curso da MDHE — assistir todas as aulas, baixar os materiais, e receber o certificado em PDF — sem fricção operacional para a MDHE.

## v1 Requirements

Requisitos para o "v1 lançável" — plataforma 100% funcional antes do redesign visual. Cada requisito mapeia para uma fase do roadmap (ver Traceability).

### Foundation & Operations

- [ ] **OPS-01**: `SUPABASE_SERVICE_ROLE_KEY` é validado como obrigatório em produção (passa a `.string().min(1)` no `serverSchema` do `src/lib/env.ts`) e a aplicação falha no boot sem ele
- [ ] **OPS-02**: `formatCertificateDate` em `src/lib/certificates/pdf.ts` usa `timeZone: "America/Sao_Paulo"` (não `"UTC"`) ao formatar a data emitida no PDF
- [ ] **OPS-03**: `SENTRY_DSN` é configurado em produção (Vercel env) e erros runtime são reportados ao Sentry; ausência do DSN é tratada como degradação (não crash)
- [ ] **OPS-04**: CI (lint zero-warning + test:ci + build) passa green em `main` antes de qualquer deploy de produção
- [ ] **OPS-05**: Pipeline de deploy de produção tem checklist documentado em `docs/` (env vars, migrações aplicadas, smoke test pós-deploy)

### Catalog (Multi-Course CRUD)

- [ ] **CAT-01**: Admin cria, edita e publica um **curso** (título, slug único, descrição, capa, status draft/publicado) sem rodar SQL
- [ ] **CAT-02**: Admin cria, edita, reordena e remove **módulos** dentro de um curso
- [ ] **CAT-03**: Admin cria, edita, reordena e remove **aulas** dentro de um módulo (com título, descrição, duração estimada, referência de vídeo via provider abstraído)
- [ ] **CAT-04**: Admin anexa, edita descrição e remove **materiais** (PDFs/anexos) por aula, com upload validado por tipo e tamanho (já parcial — preservar)
- [ ] **CAT-05**: Curso só fica visível ao aluno quando `published_at IS NOT NULL`; rascunhos ficam restritos ao admin
- [ ] **CAT-06**: Slugs de curso são únicos no banco (constraint) e o admin recebe erro claro em colisão
- [ ] **CAT-07**: Admin marca um curso como "arquivado" sem perder histórico de progresso e certificados já emitidos

### Enrollment & Access (B2C + B2B)

- [ ] **ENR-01**: Existe entidade `enrollments` ligando aluno↔curso, com `granted_at`, `expires_at` (nullable, para B2C vitalício) e `source` (`b2c_purchase` | `b2b_invite` | `admin_grant`)
- [ ] **ENR-02**: Aluno só consegue abrir aulas de cursos onde tem `enrollment` ativo (não expirado); RLS aplica esta regra
- [ ] **ENR-03**: Admin concede acesso a um curso para um aluno individual (B2C) ou para um aluno vinculado a uma instituição (B2B) com data de expiração opcional
- [ ] **ENR-04**: Quando `expires_at` passa, aluno perde acesso ao player mas mantém histórico de progresso e certificado já emitido

### Student Player & Progress

- [ ] **PROG-01**: Dashboard `/dashboard` lista os cursos aos quais o aluno tem acesso ativo, com % de aulas concluídas em cada um
- [ ] **PROG-02**: Aluno tem botão "Continuar de onde parei" que leva à última aula em progresso
- [ ] **PROG-03**: Aluno marca aula como concluída via `/api/lesson-progress/complete` e o progresso persiste mesmo se a página for recarregada
- [ ] **PROG-04**: Quando aluno completa 100% das aulas de um curso, a UI exibe um banner "Curso concluído — gerar certificado"

### Certificates

- [ ] **CERT-01**: Ao concluir 100% das aulas de um curso, é registrado um `certificates` row idempotente (uma linha por aluno+curso; constraint UNIQUE protege contra duplicação em race)
- [ ] **CERT-02**: PDF do certificado é gerado sob demanda (lazy) na primeira solicitação de download e armazenado no Supabase Storage; downloads seguintes reusam o PDF salvo (signed URL com TTL curto)
- [ ] **CERT-03**: PDF inclui nome do aluno (sem mojibake — fonte que suporta ç, ã, õ), nome do curso, data de emissão em America/Sao_Paulo, código de verificação único (UUID) e logo da MDHE
- [ ] **CERT-04**: Aluno acessa "Meus certificados" e baixa qualquer certificado emitido a qualquer momento via signed URL com TTL curto
- [ ] **CERT-05**: Adicionar uma aula nova a um curso após o aluno ter concluído **não invalida** o certificado já emitido (decisão fixa de produto)

### Video Provider Abstraction

- [ ] **VID-01**: Existe interface TypeScript `VideoProvider` em `src/lib/video/` com função `getPlayableSource(lesson, user) → { provider, embedUrl, watermarkText, ttl }`
- [ ] **VID-02**: Adapter `youtube-unlisted` resolve fonte a partir de um `video_external_id` no formato YouTube (uso restrito a `NODE_ENV !== 'production'`; build falha se YouTube for selecionado em prod)
- [ ] **VID-03**: Adapter `bunny-stream` mint signed URL com `SHA256(BUNNY_STREAM_TOKEN_KEY + videoId + expiresUnix)` e TTL configurável via `BUNNY_STREAM_TOKEN_TTL_SECONDS`
- [ ] **VID-04**: Token signing acontece **apenas no server** (RSC ou Server Action); chave Bunny nunca é serializada para o client
- [ ] **VID-05**: Aulas têm colunas `video_provider` e `video_external_id` (substituindo URL solta); admin form usa um seletor para o provider

### Anti-Piracy

- [ ] **AP-01**: Player exibe overlay CSS com email do aluno em baixa opacidade sobre o vídeo, em posição que não bloqueia conteúdo crítico (deterrent, comunicado honestamente como tal)
- [ ] **AP-02**: Signed URLs do Bunny têm TTL curto (≤ 4h) e são re-mintadas a cada novo carregamento da página da aula
- [ ] **AP-03**: Player NÃO usa IP-binding nos tokens (incompatível com mobile BR via CGNAT — Claro/Vivo/TIM)
- [ ] **AP-04**: `docs/` documenta o ceiling realista da proteção (overlay é deterrence, não DRM; screen recording continua possível)

### B2B Institution & Manager Dashboard

- [ ] **INST-01**: Existe tabela `institutions` (nome, slug, contato) e migração que adiciona valor `institution_manager` ao enum `user_role` em **migração separada** da que cria as policies
- [ ] **INST-02**: Existe `institution_members` ligando `profiles.id ↔ institutions.id` com role local (`student` | `manager`)
- [ ] **INST-03**: Função SQL `is_member_of_institution(institution_id)` é `SECURITY DEFINER STABLE` e usada em policies RLS para evitar recursão
- [ ] **INST-04**: Toda nova RLS de instituição inclui cláusulas `USING` **e** `WITH CHECK` em INSERT/UPDATE
- [ ] **INST-05**: `middleware.ts` tem novo array `GESTOR_ROUTES = ["/gestor"]` e o matcher inclui `/gestor/:path*`; usuários sem role `institution_manager` ou `admin` são redirecionados
- [ ] **INST-06**: Gestor de instituição loga em `/gestor` e vê apenas alunos/enrollments da sua própria instituição (validado por RLS, não só por filtro de aplicação)
- [ ] **INST-07**: Dashboard do gestor mostra: lista de alunos vinculados, % de progresso por curso, certificados emitidos com link para visualizar (sem download direto — apresenta metadata: nome do curso, data, código)
- [ ] **INST-08**: Admin (MDHE) cria uma instituição, vincula alunos a ela 1 a 1, e atribui um aluno como gestor

### Marketing & Lead Capture

- [ ] **MKT-01**: Landing comercial `/` permanece operacional com 11 seções e CTAs (já existe — preservar)
- [ ] **MKT-02**: Form institucional grava em `institutional_leads` via service-role, com captura adicional de `utm_source`, `utm_medium`, `utm_campaign` (opcionais) na URL → schema Zod estendido
- [ ] **MKT-03**: Página `/health` retorna `{status, uptime, timestamp, version}` em produção (já existe — preservar e validar)

### Email & Communications

- [ ] **EMAIL-01**: Supabase Auth está configurado com SMTP do **Resend** (custom SMTP no painel) — emails de confirmação, recuperação e convite passam a sair via Resend
- [ ] **EMAIL-02**: Domínio de envio (`EMAIL_FROM`) tem SPF/DKIM configurados; entrega validada com inbox de teste em Gmail e Outlook
- [ ] **EMAIL-03**: Convite institucional dispara com template pt-BR (assunto + corpo) que menciona a instituição contratante

## v2 Requirements

Reconhecidos mas adiados — fora do v1, não estão no roadmap atual.

### B2B Operations

- **B2B-V2-01**: Upload em lote (CSV) de funcionários por instituição com disparo de convites em massa
- **B2B-V2-02**: Gestor de instituição convida diretamente seus próprios funcionários (sem precisar do admin MDHE)
- **B2B-V2-03**: Relatório PDF/Excel exportável do dashboard do gestor

### Payments

- **PAY-V2-01**: Checkout integrado no app (Stripe ou Hotmart) liberando enrollment automaticamente após pagamento confirmado
- **PAY-V2-02**: Gestão de assinatura/recorrência para B2C
- **PAY-V2-03**: Cupons de desconto aplicáveis no checkout

### Assessments

- **ASSESS-V2-01**: Quizzes de múltipla escolha por aula
- **ASSESS-V2-02**: Prova final por curso com nota mínima como gate para certificado

### Redesign

- **UX-V2-01**: Redesign visual completo da plataforma (player, dashboards, landing)
- **UX-V2-02**: Acessibilidade WCAG AA (Libras, captions em vídeos, screen reader friendly)

## Out of Scope

Excluídos explicitamente. Documentados para evitar scope creep.

| Feature | Reason |
|---------|--------|
| Multi-tenant (várias consultorias) | Plataforma é dedicada à MDHE; multi-tenancy seria gold-plating sem demanda |
| App mobile nativo | Web responsivo cobre o caso de uso; investimento mobile não se justifica no v1 |
| Integração SCORM / xAPI | Conteúdo nasce e fica na plataforma; não há LMS externo no funil |
| DRM completo (Widevine/PlayReady) | Custo alto e bypassável via screen recording; overlay CSS atende a fronteira realista |
| Fórum / comunidade entre alunos | Conteúdo é training corporativo de baixa frequência; fórum não agrega no domínio |
| Gamificação (badges, ranking) | Audiência B2B/profissional; gamificação é ruído neste contexto |
| App de mensageria interna ao curso | Suporte acontece fora (email/WhatsApp da MDHE); não cabe no escopo |
| OAuth (Google/Apple) | Email/senha + convites institucionais bastam para o público-alvo |
| Internacionalização (i18n) | UI 100% pt-BR é requisito; nenhum outro idioma planejado |

## Traceability

Mapeamento preenchido durante a criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPS-01 | Phase 1 | Pending |
| OPS-02 | Phase 1 | Pending |
| OPS-03 | Phase 1 | Pending |
| OPS-04 | Phase 1 | Pending |
| OPS-05 | Phase 1 | Pending |
| CAT-01 | Phase 2 | Pending |
| CAT-02 | Phase 2 | Pending |
| CAT-03 | Phase 2 | Pending |
| CAT-04 | Phase 2 | Pending |
| CAT-05 | Phase 2 | Pending |
| CAT-06 | Phase 2 | Pending |
| CAT-07 | Phase 2 | Pending |
| ENR-01 | Phase 1 | Pending |
| ENR-02 | Phase 1 | Pending |
| ENR-03 | Phase 2 | Pending |
| ENR-04 | Phase 1 | Pending |
| PROG-01 | Phase 3 | Pending |
| PROG-02 | Phase 3 | Pending |
| PROG-03 | Phase 3 | Pending |
| PROG-04 | Phase 3 | Pending |
| CERT-01 | Phase 3 | Pending |
| CERT-02 | Phase 3 | Pending |
| CERT-03 | Phase 3 | Pending |
| CERT-04 | Phase 3 | Pending |
| CERT-05 | Phase 3 | Pending |
| VID-01 | Phase 4 | Pending |
| VID-02 | Phase 4 | Pending |
| VID-03 | Phase 4 | Pending |
| VID-04 | Phase 4 | Pending |
| VID-05 | Phase 4 | Pending |
| AP-01 | Phase 4 | Pending |
| AP-02 | Phase 4 | Pending |
| AP-03 | Phase 4 | Pending |
| AP-04 | Phase 4 | Pending |
| INST-01 | Phase 1 | Pending |
| INST-02 | Phase 1 | Pending |
| INST-03 | Phase 1 | Pending |
| INST-04 | Phase 1 | Pending |
| INST-05 | Phase 5 | Pending |
| INST-06 | Phase 5 | Pending |
| INST-07 | Phase 5 | Pending |
| INST-08 | Phase 5 | Pending |
| MKT-01 | Phase 2 | Pending |
| MKT-02 | Phase 2 | Pending |
| MKT-03 | Phase 1 | Pending |
| EMAIL-01 | Phase 1 | Deferred (P0 pré-prod — aguardando domínio MDHE; ver 01-04-SUMMARY.md) |
| EMAIL-02 | Phase 1 | Deferred (P0 pré-prod — aguardando domínio MDHE; ver 01-04-SUMMARY.md) |
| EMAIL-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-27*
*Last updated: 2026-04-27 after initial definition*
