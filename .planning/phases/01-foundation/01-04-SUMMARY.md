---
phase: 01-foundation
plan: 04
status: deferred
deferred_reason: "Aguardando aquisição de domínio MDHE para verificar como sender no Resend. Supabase Auth Custom SMTP requer Sender email em domínio verificado — endereços @gmail/@outlook/@resend.dev não são aceitos."
completed: null
deferred_at: 2026-04-28
---

# Plan 01-04 — Resend SMTP Setup (DEFERRED)

## One-liner

EMAIL-01/02 (configurar SMTP Resend no painel Supabase + verificar SPF/DKIM + testar entrega Gmail/Outlook) **adiado** até a aquisição do domínio MDHE oficial. Nenhum código alterado; nenhum commit em `docs/DEPLOY-CHECKLIST.md` foi feito por este plano.

## Bloqueador

A MDHE ainda não tem domínio próprio adquirido. O Supabase Auth Custom SMTP exige que o `Sender email` seja de um domínio verificado no Resend (SPF + DKIM verdes). Endereços livres não são aceitos:

- `@gmail.com` / `@outlook.com` — não permitido pelo Supabase
- `onboarding@resend.dev` (sandbox do Resend) — não permitido pelo Supabase
- Domínios sem SPF/DKIM verificados — Resend recusa o envio

**Pré-requisitos para retomar este plano:**

1. MDHE adquire um domínio (ex: `mdhe.com.br` no Registro.br, ~R$40/ano)
2. Acesso ao DNS do domínio (Cloudflare, Registro.br, etc) está disponível para adicionar registros TXT
3. Decisão tomada sobre o endereço remetente (sugestão: `noreply@<dominio>` ou `notificacoes@<dominio>`)

## Estado atual do produto sem este plano

- **Dev/staging:** Supabase Auth continua usando o SMTP padrão (~4 emails/hora — limite suficiente para testes manuais ocasionais).
- **Produção:** **NÃO PODE FAZER GO-LIVE sem completar este plano.** O SMTP padrão do Supabase tem rate limits operacionais incompatíveis com onboarding real (admin convida funcionário B2B → email não chega → onboarding falha em escala).
- **Listado como P0 em** `docs/DEPLOY-CHECKLIST.md` (Section 4 mantém placeholder explícito de bloqueio para deploy de prod).

## Requisitos pendentes

- ⏸ EMAIL-01 — Custom SMTP via Resend (deferred, pré-prod)
- ⏸ EMAIL-02 — SPF/DKIM + verificação de inbox Gmail/Outlook (deferred, pré-prod)

Permanecem com `Status: Deferred` na traceability de `.planning/REQUIREMENTS.md` e voltam para `Pending` quando este plano for retomado.

## Como retomar

Quando o domínio estiver disponível:

```
/gsd-execute-phase 1 --wave 4
```

OU manualmente:

1. Seguir o runbook de 7 passos preservado em `.planning/phases/01-foundation/01-04-PLAN.md`
2. Ao concluir os testes Gmail+Outlook, responder ao orquestrador com os dados de Section 4 do DEPLOY-CHECKLIST.md (domínio, EMAIL_FROM, registros DNS, resultados dos testes)
3. Substituir este SUMMARY por uma versão `status: complete`

## Decisão de orquestração

Phase 1 segue para verificação com 4/5 plans completos (80%). EMAIL-01/02 são tratados como verification debt explicitamente documentada, não como gap silencioso. O verificador da Phase 1 deve reconhecer este SUMMARY com `status: deferred` e o bloqueador documentado, sem reportar gap.

## Self-Check: PASSED

(deferred status — nenhum trabalho a auto-verificar; o critério deste SUMMARY é apenas documentar o adiamento e o caminho de retomada.)
