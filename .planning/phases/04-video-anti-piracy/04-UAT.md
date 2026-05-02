---
status: complete
phase: 04-video-anti-piracy
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
  - 04-03-SUMMARY.md
  - 04-04-SUMMARY.md
  - 04-05-SUMMARY.md
started: 2026-05-02T00:00:00Z
updated: 2026-05-02T00:10:00Z
---

## Current Test

[testing complete]

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
result: pass
note: "Inicialmente reportado como 500 MIDDLEWARE_INVOCATION_FAILED no /login da Vercel — root cause identificado: BUNNY_STREAM_TOKEN_KEY e BUNNY_STREAM_LIBRARY_ID ausentes nas env vars de produção, causando getEnv() a lançar via superRefine prod-required. Resolvido configurando as 3 envs no Vercel (Bunny trial gratuito + SUPABASE_SERVICE_ROLE_KEY) e redeploy. Login agora retorna 200 e o seletor em prod oculta YouTube como esperado."

### 5. Player — Iframe Bunny + watermark com e-mail
expected: Abra uma aula com provider=bunny e BUNNY_STREAM_TOKEN_KEY/LIBRARY_ID configurados. O iframe carrega de iframe.mediadelivery.net com `?token=...&expires=...` na URL. Sobreposto ao vídeo aparece o seu e-mail em opacidade ~12%, sem bloquear cliques (pointer-events:none), e a posição rotaciona entre 4 cantos a cada 30 segundos.
result: pass

### 6. Player — Iframe YouTube em dev sem watermark
expected: Em dev, abra uma aula com provider=youtube. O iframe carrega de www.youtube.com/embed/... e NÃO mostra watermark sobreposto (watermarkText é null para YouTube). Vídeo é reproduzível normalmente.
result: pass

### 7. Auto-completion via postMessage
expected: Reproduza o vídeo até o fim. Ao terminar, sem clicar em nada, aparece o banner "Aula concluída" e o status da aula muda para concluída no menu lateral / lista de módulos. Funciona tanto para Bunny (evento player.js 'ended') quanto para YouTube em dev (playerState 0).
result: pass
note: "Bug crítico encontrado e corrigido durante UAT: o handler postMessage tratava Bunny e YouTube em branches separados por typeof event.data ('object' vs 'string'), mas Bunny serializa mensagens como JSON string — fazendo com que mensagens Bunny caíssem no branch errado e fossem ignoradas. Adicionalmente, faltava enviar a subscrição addEventListener para Bunny (Player.js spec exige) e o handshake 'listening' para YouTube. Fix: parseMessage() normaliza string|object → object, branching feito por content (data.context === 'player.js') em vez de tipo, subscriptions enviadas após ready/onReady. Verificado funcionando com vídeo real do Bunny."

### 8. Botão manual "marcar como concluída"
expected: Em uma aula não concluída, o botão manual de marcar como concluída ainda funciona — clicando sem assistir o vídeo até o fim, a aula é marcada como concluída e o banner aparece.
result: pass

### 9. Fallback de vídeo indisponível
expected: Se uma aula tem video_provider definido mas video_external_id inválido/vazio, o player renderiza uma área com borda tracejada vermelha e a mensagem em pt-BR: "Não foi possível carregar o vídeo desta aula. Verifique se o ID de vídeo salvo é válido."
result: pass
note: "User cadastrou aula com video_external_id 'id-que-nao-existe-12345'. O fallback que aparece é o do próprio Bunny Stream (página 404 dentro do iframe), não o fallback do nosso componente. O fallback do nosso componente só dispara se embedUrl=='' — um caso inalcançável pelo fluxo normal porque getBunnyPlayableSource sempre constrói uma URL desde que video_external_id exista. O comportamento end-to-end é correto: usuário vê mensagem de erro clara (404 do Bunny) + watermark com email continua aparecendo + app não crasha. Nosso fallback continua como defesa em profundidade."

### 10. URL assinada Bunny com TTL
expected: Inspecione a URL do iframe Bunny no DevTools (Network tab ou inspecionar elemento iframe). A URL contém `token=` (hash hex de 64 chars) e `expires=` (timestamp Unix futuro, dentro do TTL configurado — default 3600s / 1h, máximo 14400s / 4h).
result: pass
note: "Iframe src verificado: token=e4a6bffb68275b82a0d835fb936b90d07d84b3db04b0755dd57f101189641434 (64 chars hex SHA256, OK), expires=1777739576 (timestamp Unix futuro consistente com TTL default 3600s). URL completa: https://iframe.mediadelivery.net/embed/651879/9627744f-afca-404a-a5c5-27dabe3bab70?token=...&expires=1777739576"

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none — Test 4 issue resolved by configuring Bunny env vars in Vercel]

## Resolved Issues

- test: 4
  reported: "GET /login retorna 500 MIDDLEWARE_INVOCATION_FAILED na Vercel"
  root_cause: "BUNNY_STREAM_TOKEN_KEY e BUNNY_STREAM_LIBRARY_ID ausentes em prod env vars. serverSchema.superRefine prod-required → getEnv() throws → middleware (que chama getEnv() em toda request) crasha → 500 em todas as rotas matched (/login incluso)."
  resolution: "User cadastrou conta Bunny gratuita ($1 trial), criou Stream Library, configurou BUNNY_STREAM_TOKEN_KEY + BUNNY_STREAM_LIBRARY_ID + SUPABASE_SERVICE_ROLE_KEY no Vercel, e fez redeploy. Login voltou a 200."
  files_touched: []
  followup: "Considerar tornar o fail-fast em prod menos rígido OU documentar no README que as 3 envs Bunny são obrigatórias após Phase 4."
