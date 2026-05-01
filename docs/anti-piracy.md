# Anti-Piracy Measures — Plataforma MDHE

**Data:** 2026-04-30
**Escopo:** Proteção de conteúdo de vídeo na plataforma de cursos MDHE

---

## O que está implementado

### Overlay de marca d'água (CSS watermark)

- O player de aula exibe o **e-mail completo do aluno** sobre o vídeo em baixa opacidade (aproximadamente 12%)
- A posição do overlay muda entre os **4 cantos do player a cada 30 segundos**
- O overlay é implementado como `div` CSS absolutamente posicionado sobre o `<iframe>` do player
- `pointer-events: none` — o overlay não interfere com os controles do player
- `aria-hidden="true"` — invisível para leitores de tela (não é conteúdo funcional)
- `user-select: none` — impede seleção de texto trivial

### URLs assinadas do Bunny Stream (produção)

- Em produção, vídeos Bunny Stream são servidos via **URLs assinadas com TTL de 1 hora (3600 segundos)**
- O token é gerado server-side (RSC Next.js) usando `SHA256(tokenKey + videoId + expiresUnix)`
- A chave de assinatura (`BUNNY_STREAM_TOKEN_KEY`) nunca é enviada ao browser
- Cada carregamento de página de aula gera um novo token — re-mint a cada acesso

### Proteção de credenciais server-side

- Token signing acontece exclusivamente no RSC (`page.tsx`) — nunca em Client Components
- A chave Bunny está no `serverSchema` do Zod (`src/lib/env.ts`) e falha no boot em produção se ausente
- YouTube está disponível **apenas em desenvolvimento** (`NODE_ENV !== 'production'`); tentativa de usar em produção resulta em erro 500

---

## O que NÃO está implementado (teto realista da proteção)

### Gravação de tela continua possível

**Esta é a limitação mais importante:** qualquer pessoa com acesso ao vídeo pode gravá-lo usando:
- Ferramentas de gravação de tela (OBS Studio, QuickTime, Xbox Game Bar, etc.)
- Extensões de browser
- Dispositivo externo apontado para a tela

O overlay de e-mail aparecerá na gravação — isso é o objetivo (identifica o vazador). Mas não impede a captura do conteúdo.

### Sem DRM (Widevine / PlayReady / FairPlay)

DRM completo (Widevine, PlayReady, FairPlay) foi explicitamente descartado do v1:
- Custo alto de implementação e operação
- Requer suporte do provedor de vídeo + browser + sistema operacional
- Bypassável via gravação de tela em qualquer dispositivo externo
- Não se justifica para o perfil de risco B2B da MDHE

### Sem IP-binding nos tokens

Os tokens Bunny **não incluem o IP do cliente**. Isso é intencional:
- O Brasil tem CGNAT extenso (Claro, Vivo, TIM) — múltiplos usuários compartilham o mesmo IP público
- IP-binding causaria falhas de reprodução legítimas em redes móveis brasileiras
- A decisão está documentada em REQUIREMENTS.md (AP-03)

### Sem detecção de gravação de tela

Não há JavaScript que detecte tentativas de gravação ou screenshots. Implementações deste tipo são facilmente bypassáveis e criam falsos positivos.

---

## Propósito declarado: deterrence, não DRM

As medidas implementadas funcionam como **dissuasão (deterrence)**:

1. **Identificação:** O e-mail do aluno na gravação identifica a fonte do vazamento
2. **Custo psicológico:** A presença do e-mail visível aumenta o custo percebido de vazar conteúdo
3. **URLs de curta duração:** Tokens de 1 hora reduzem a janela de compartilhamento de links diretos do Bunny

Isso é suficiente para o perfil de risco B2B corporativo da MDHE, onde alunos são profissionais com vínculo institucional.

---

## Recomendações operacionais

- **Rotacionar `BUNNY_STREAM_TOKEN_KEY`** periodicamente (trimestral) via painel Bunny
- **Monitorar compartilhamento de acesso** — um login com múltiplos IPs simultâneos indica conta compartilhada
- **Comunicar honestamente aos clientes B2B** que o sistema usa marca d'água de identificação, não DRM
- **Se um vazamento ocorrer:** o e-mail do aluno na gravação permite identificar a origem e tomar ação disciplinar

---

*Documento criado durante a Phase 4: Video & Anti-Piracy*
*Revisão: necessária se o modelo de ameaça mudar (ex.: inclusão de DRM no roadmap)*
