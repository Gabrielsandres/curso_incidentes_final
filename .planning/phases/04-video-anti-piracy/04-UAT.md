---
status: testing
phase: 04-video-anti-piracy
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
  - 04-03-SUMMARY.md
  - 04-04-SUMMARY.md
  - 04-05-SUMMARY.md
started: 2026-05-02T00:00:00Z
updated: 2026-05-02T00:03:00Z
---

## Current Test

number: 4
name: Admin — Opção YouTube escondida em produção
expected: |
  Em build de produção (NODE_ENV=production), o seletor de provedor mostra APENAS "Bunny" — opção YouTube ausente do dropdown. Pode confirmar inspecionando o HTML ou rodando `npm run build && npm run start` localmente.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Encerre qualquer dev server rodando. Rode `npm run dev` do zero. Servidor sobe sem erros, http://localhost:3000 carrega a landing page, e fazer login leva ao /dashboard sem erros no console.
result: pass

### 2. Admin — Criar aula com provider Bunny
expected: Acesse /admin/cursos/[slug]/modulos/[moduleId]. Clique "Adicionar aula". O seletor "VÍDEO" → "Provedor" mostra "Bunny" selecionado por padrão. Preencha um título e um Video ID qualquer (ex: "abc-123"). Submeta. A aula aparece na lista do módulo.
result: pass

### 3. Admin — Opção YouTube visível em dev
expected: Em desenvolvimento (NODE_ENV !== production), o seletor de provedor no form de criação de aula mostra DUAS opções: "Bunny" e "YouTube". Trocar para YouTube muda o placeholder do campo Video ID dinamicamente (ex: "ID do YouTube" em vez de "ID do Bunny").
result: pass

### 4. Admin — Opção YouTube escondida em produção
expected: Em build de produção (NODE_ENV=production), o seletor de provedor mostra APENAS "Bunny" — opção YouTube ausente do dropdown. Pode confirmar inspecionando o HTML ou rodando `npm run build && npm run start` localmente.
result: issue
reported: "Ao realizar o deploy na vercel e tentar fazer login deu esse erro: 500 INTERNAL_SERVER_ERROR — MIDDLEWARE_INVOCATION_FAILED. GET https://curso-incidentes-novo-uyrm.vercel.app/login retorna 500."
severity: blocker

### 5. Player — Iframe Bunny + watermark com e-mail
expected: Abra uma aula com provider=bunny e BUNNY_STREAM_TOKEN_KEY/LIBRARY_ID configurados. O iframe carrega de iframe.mediadelivery.net com `?token=...&expires=...` na URL. Sobreposto ao vídeo aparece o seu e-mail em opacidade ~12%, sem bloquear cliques (pointer-events:none), e a posição rotaciona entre 4 cantos a cada 30 segundos.
result: [pending]

### 6. Player — Iframe YouTube em dev sem watermark
expected: Em dev, abra uma aula com provider=youtube. O iframe carrega de www.youtube.com/embed/... e NÃO mostra watermark sobreposto (watermarkText é null para YouTube). Vídeo é reproduzível normalmente.
result: [pending]

### 7. Auto-completion via postMessage
expected: Reproduza o vídeo até o fim. Ao terminar, sem clicar em nada, aparece o banner "Aula concluída" e o status da aula muda para concluída no menu lateral / lista de módulos. Funciona tanto para Bunny (evento player.js 'ended') quanto para YouTube em dev (playerState 0).
result: [pending]

### 8. Botão manual "marcar como concluída"
expected: Em uma aula não concluída, o botão manual de marcar como concluída ainda funciona — clicando sem assistir o vídeo até o fim, a aula é marcada como concluída e o banner aparece.
result: [pending]

### 9. Fallback de vídeo indisponível
expected: Se uma aula tem video_provider definido mas video_external_id inválido/vazio, o player renderiza uma área com borda tracejada vermelha e a mensagem em pt-BR: "Não foi possível carregar o vídeo desta aula. Verifique se o ID de vídeo salvo é válido."
result: [pending]

### 10. URL assinada Bunny com TTL
expected: Inspecione a URL do iframe Bunny no DevTools (Network tab ou inspecionar elemento iframe). A URL contém `token=` (hash hex de 64 chars) e `expires=` (timestamp Unix futuro, dentro do TTL configurado — default 3600s / 1h, máximo 14400s / 4h).
result: [pending]

## Summary

total: 10
passed: 3
issues: 1
pending: 6
skipped: 0

## Gaps

- truth: "Em build de produção (Vercel), GET /login responde 200 e renderiza o form de login normalmente."
  status: failed
  reason: "User reported: GET /login retorna 500 INTERNAL_SERVER_ERROR com MIDDLEWARE_INVOCATION_FAILED na Vercel. ID gru1::65r2c-1777730593006-a4323be6a32e. Erros pinComponent.js no console são de extensão Chrome (ruído, ignorar). Falha real é o middleware crashando ao processar a request."
  severity: blocker
  test: 4
  artifacts: []
  missing: []
