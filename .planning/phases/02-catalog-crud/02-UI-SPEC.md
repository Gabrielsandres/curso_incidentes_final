---
phase: 2
slug: catalog-crud
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-28
---

# Phase 2 — UI Design Contract: Catalog CRUD

> Contrato visual e de interação para as seis telas de admin de catálogo e o ajuste
> de UTM no formulário institucional. Gerado pelo gsd-ui-researcher; consumido pelo
> gsd-planner e gsd-executor como fonte de verdade de design durante a Phase 2.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (sem shadcn — projeto usa Tailwind v4 manual) |
| Preset | not applicable |
| Component library | none (componentes escritos do zero, sem Radix ou shadcn) |
| Icon library | lucide-react 0.462.0 |
| Font | Inter (já carregado via next/font; var(--font-inter)) |

**Justificativa:** O codebase existente usa Tailwind v4 com tokens CSS custom (`globals.css`)
e componentes escritos manualmente (course-manager.tsx, user-manager.tsx). Não há
`components.json`. Introduzir shadcn agora forçaria migração de padrões já estabelecidos.
A Phase 2 estende o padrão existente com formalização — sem trocar a fundação.

---

## Spacing Scale

Baseado no 8-point grid. O código existente usa `gap-4` (16px), `p-6` (24px), `py-10`
(40px), `space-y-4` (16px) — tudo múltiplo de 4. Formalizando:

| Token | Valor Tailwind | px | Uso |
|-------|---------------|----|-----|
| xs | gap-1 / p-1 | 4px | Gaps internos de ícone, margin entre badge e texto |
| sm | gap-2 / p-2 | 8px | Padding interno de badge, gap entre ícone e label de botão |
| md | gap-4 / p-4 | 16px | Espaçamento padrão entre elementos de form, gap de grid |
| lg | gap-6 / p-6 | 24px | Padding de card/section, gap entre cards |
| xl | gap-8 / p-8 | 32px | Separação entre seções distintas de uma página |
| 2xl | py-10 / gap-10 | 40px | Padding vertical do `<main>` |
| 3xl | py-12 | 48px | Reservado para separação de blocos maiores |

**Touch targets:** Botões de ação (↑/↓ reorder, ícones de ação em tabela) mínimo 44×44px
via `min-h-[44px] min-w-[44px]` ou padding equivalente.

**Exceções:** Nenhuma além dos touch targets acima.

---

## Typography

Quatro tamanhos; dois pesos. Preserva exatamente o que o codebase já usa.

| Role | Tailwind | px | Peso | Line-height | Uso |
|------|----------|----|------|-------------|-----|
| Body | text-sm | 14px | font-normal (400) | leading-normal (1.5) | Descrições, parágrafos, conteúdo de tabela |
| Label | text-sm font-medium | 14px | font-medium (500) | leading-normal (1.5) | Labels de form, cabeçalhos de coluna, helper text |
| Heading-section | text-xl font-semibold | 20px | font-semibold (600) | leading-tight (1.25) | `<h2>` de seção dentro de página |
| Heading-page | text-2xl font-semibold | 24px | font-semibold (600) | leading-tight (1.25) | `<h1>` de cada página admin |

**Eyebrow (metadata acima de h1/h2):**
`text-xs font-semibold uppercase tracking-[0.2em] text-slate-500`
(padrão já existente em course-manager.tsx e admin/page.tsx — formalizado aqui)

**Microcopy / helper text:** `text-xs text-slate-500` (12px, weight 400)

**Erro de campo inline:** `text-xs text-red-600` (padrão FieldError já existente)

---

## Color

Tokens extraídos de `src/app/globals.css` + `tailwind.config.ts`. O codebase usa variáveis
CSS HSL mapeadas para nomes Tailwind.

### Paleta semântica

| Role | CSS Var / Tailwind | Valor HSL | Uso |
|------|-------------------|-----------|-----|
| Dominant (60%) | bg-white / bg-slate-50 | #ffffff / #f8fafc | Fundo de página (`bg-slate-50`), superfície de card (`bg-white`) |
| Secondary (30%) | bg-slate-100 / border-slate-200 | #f1f5f9 / #e2e8f0 | Subsections internas (certificate block bg-slate-50), bordas de card |
| Primary action | bg-sky-600 / hover:bg-sky-700 | #0284c7 / #0369a1 | Botão primário (único — "Salvar", "Publicar", "Conceder acesso") |
| Destructive | bg-red-600 / border-red-200 | #dc2626 / #fecaca | Botão "Arquivar" com confirmação, "Revogar acesso", "Remover" |
| Success feedback | bg-emerald-50 / text-emerald-700 | — | Banner de sucesso após ação |
| Error feedback | bg-red-50 / text-red-700 | — | Banner de erro após ação |
| Text primary | text-slate-900 | #0f172a | Títulos, conteúdo principal |
| Text secondary | text-slate-600 | #475569 | Descrições, subtexto |
| Text muted | text-slate-500 | #64748b | Eyebrow, helper text, metadados |

### Accent reservado para

O token `--accent` (hsl 44 90% 62% — amarelo-dourado) do globals.css é da landing
page marketing e NÃO é usado no admin. No admin, o accent fica restrito a:
- Nenhum uso em Phase 2 (admin é austero, profissional — sem cor de destaque quente)

### Estados de status de curso (badge colorido)

| Status | Derivação | Badge classes |
|--------|-----------|---------------|
| Rascunho | published_at IS NULL AND archived_at IS NULL | `bg-slate-100 text-slate-600 border border-slate-300` |
| Publicado | published_at IS NOT NULL AND archived_at IS NULL | `bg-emerald-50 text-emerald-700 border border-emerald-200` |
| Arquivado | archived_at IS NOT NULL | `bg-amber-50 text-amber-700 border border-amber-200` + `opacity-60` no card pai |

### Estados de interação

| Estado | Classes |
|--------|---------|
| Hover (botão primário) | `hover:bg-sky-700` |
| Hover (botão secundário/ghost) | `hover:border-slate-400 hover:bg-slate-50` |
| Hover (botão destrutivo) | `hover:bg-red-700` |
| Focus (todos os inputs) | `focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none` |
| Focus (botões) | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500` |
| Disabled | `disabled:opacity-70 disabled:cursor-not-allowed` |
| Loading (form submit) | Botão fica `disabled` + label muda para pendingLabel ("Salvando...") |
| Arquivado (card) | `opacity-60` no card inteiro; badge Arquivado em amber |

---

## Component Library

Todos os componentes são escritos do zero em TSX com Tailwind. Não há dep externa de UI.

### 1. Button

**Variantes e classes exatas:**

```
primary:    "inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2
             text-sm font-semibold text-white transition hover:bg-sky-700
             disabled:cursor-not-allowed disabled:opacity-70
             focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
             focus-visible:outline-sky-500"

secondary:  "inline-flex items-center justify-center rounded-full border border-slate-300
             bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition
             hover:border-slate-400 hover:bg-slate-50
             focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
             focus-visible:outline-sky-500"

danger:     "inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2
             text-sm font-semibold text-white transition hover:bg-red-700
             disabled:cursor-not-allowed disabled:opacity-70
             focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
             focus-visible:outline-red-500"

ghost:      "inline-flex items-center justify-center rounded px-2 py-1.5 text-sm
             font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900
             focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
             focus-visible:outline-sky-500"

icon:       "inline-flex items-center justify-center rounded min-h-[44px] min-w-[44px]
             text-slate-500 transition hover:bg-slate-100 hover:text-slate-700
             focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
             focus-visible:outline-sky-500"
```

**Notas de acessibilidade:**
- Sempre `type="button"` exceto quando é submit (previne submissão acidental)
- Botões de ícone precisam de `aria-label` descritivo em pt-BR
- `useFormStatus()` para detectar pending em buttons dentro de Server Action forms (padrão existente)

### 2. FormInput (campo de texto)

```
base:       "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none
             transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"

error:      adicionar "border-red-400 focus:border-red-500 focus:ring-red-100"
             quando fieldErrors[field] existe

readonly:   adicionar "bg-slate-50 text-slate-500 cursor-not-allowed"
```

**Wrapper label:**
```
"flex flex-col gap-2"
```
Label text: `"text-sm font-medium text-slate-700"`

### 3. Textarea

Mesmo padrão de FormInput com:
```
"min-h-[84px] resize-y w-full rounded border border-slate-300 px-3 py-2 text-sm
 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
```

### 4. Select

```
"w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition
 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 bg-white appearance-none"
```
Envolver em `div` relativo com ícone `ChevronDown` (Lucide) absoluto à direita.

### 5. FieldError

```tsx
function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-red-600">{errors[0]}</p>;
}
```
(padrão já existente — não alterar)

### 6. FeedbackBanner (sucesso/erro de form)

```tsx
// success
"rounded-lg px-3 py-2 text-sm border border-emerald-200 bg-emerald-50 text-emerald-700"

// error
"rounded-lg px-3 py-2 text-sm border border-red-200 bg-red-50 text-red-700"
```
`role="status" aria-live="polite"` em ambos (padrão de user-manager.tsx — aplicar também no course-manager).

### 7. Badge (status)

```tsx
// Rascunho
"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
 bg-slate-100 text-slate-600 border border-slate-300"

// Publicado
"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
 bg-emerald-50 text-emerald-700 border border-emerald-200"

// Arquivado
"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
 bg-amber-50 text-amber-700 border border-amber-200"
```

### 8. Breadcrumb (`src/components/admin/breadcrumb.tsx`)

```
<nav aria-label="Navegação">
  <ol class="flex items-center gap-1.5 text-sm text-slate-500">
    <li><a href="/admin/cursos" class="hover:text-slate-900 transition">Catálogo</a></li>
    <li aria-hidden="true"><ChevronRight size={14} /></li>
    <li><a href="/admin/cursos/[slug]" class="hover:text-slate-900 transition">{Course Title}</a></li>
    <li aria-hidden="true"><ChevronRight size={14} /></li>
    <li class="text-slate-900 font-medium" aria-current="page">{current}</li>
  </ol>
</nav>
```

**Regras:**
- Sempre começa com "Catálogo" linkando para `/admin/cursos`
- Item atual: `font-medium text-slate-900`, sem link, `aria-current="page"`
- Separadores: `ChevronRight` Lucide 14px, `aria-hidden="true"`
- Máximo 4 níveis (Catálogo → Curso → Módulo → Aula)

### 9. ReorderButtons (↑/↓)

```tsx
// Par de botões para reordenar um item
<div class="flex flex-col gap-0.5">
  <button type="submit" aria-label="Mover para cima" form="reorder-up-{id}"
          class="icon-button" disabled={isFirst}>
    <ChevronUp size={16} />
  </button>
  <button type="submit" aria-label="Mover para baixo" form="reorder-down-{id}"
          class="icon-button" disabled={isLast}>
    <ChevronDown size={16} />
  </button>
</div>
```
- Botão do primeiro item: ↑ disabled
- Botão do último item: ↓ disabled
- Cada botão dispara Server Action própria via form hidden

### 10. Dialog / Modal ("Conceder acesso")

Implementado com `<dialog>` nativo do HTML ou controlado via `useState` + portal.
Sem lib externa.

```
Overlay:    fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4
Panel:      relative bg-white rounded-2xl shadow-medium w-full max-w-md p-6 space-y-4
```

**Foco:** Ao abrir, autofocus no input de email (`autoFocus` prop).
**Fechar:** Tecla `Escape` fecha (listener no `keydown`); clique no overlay fecha.
`aria-modal="true"` no panel; `role="dialog"`.

### 11. ConfirmationDialog (ações destrutivas)

Variante simplificada do Dialog para confirmação de 2 etapas:

```
Título:  text-lg font-semibold text-slate-900
Corpo:   text-sm text-slate-600 leading-relaxed
Ações:   flex gap-3 justify-end mt-4
         [Cancelar: secondary] [Confirmar: danger]
```

### 12. EmptyState

```
"rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center
 flex flex-col items-center gap-3"

Ícone:     Lucide 32px text-slate-400
Título:    text-sm font-semibold text-slate-700
Subtexto:  text-sm text-slate-500
CTA:       primary button (opcional)
```

### 13. CourseStatusIcon indicators (em lista)

Junto ao título do curso na lista, após o badge de status, exibir o `published_at`
ou `archived_at` como metadado:
- Publicado: `CalendarCheck` Lucide 14px + data formatada `dd/MM/yyyy` em `text-xs text-slate-500`
- Arquivado: `Archive` Lucide 14px + data de arquivamento em `text-xs text-amber-600`

### 14. MaterialListItem

```
<li class="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
  <FileIcon size={16} class="text-slate-400 shrink-0" />
  <span class="text-sm text-slate-900 flex-1 truncate">{filename}</span>
  <span class="text-xs text-slate-500 shrink-0">{sizeFormatted}</span>
  <button ghost aria-label="Remover material">
    <Trash2 size={16} />
  </button>
</li>
```

### 15. FileUploadArea (`src/components/admin/material-upload.tsx`)

```
<div class="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center
            hover:border-sky-400 transition cursor-pointer">
  <Upload size={24} class="mx-auto text-slate-400 mb-2" />
  <p class="text-sm font-medium text-slate-700">Clique para selecionar ou arraste um arquivo</p>
  <p class="text-xs text-slate-500 mt-1">
    Tipos aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG · Máx. 20 MB
  </p>
</div>
<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
       class="sr-only" />
```

**Validação client-side:** Antes de submeter, verificar MIME type e tamanho.
Erro inline abaixo da área: `text-xs text-red-600`.

### 16. EnrollmentTableRow

```
<tr class="border-b border-slate-100 hover:bg-slate-50 transition">
  <td class="py-3 px-4 text-sm text-slate-900">{email}</td>
  <td class="py-3 px-4 text-sm text-slate-600">{nome}</td>
  <td class="py-3 px-4">
    <span class="text-xs text-slate-500">{source label}</span>
  </td>
  <td class="py-3 px-4 text-xs text-slate-500">{granted_at dd/MM/yyyy}</td>
  <td class="py-3 px-4 text-xs text-slate-500">{expires_at ou "Sem expiração"}</td>
  <td class="py-3 px-4">
    <button ghost danger aria-label="Revogar acesso de {email}">
      <UserMinus size={16} />
    </button>
  </td>
</tr>
```

---

## Per-Screen Specs

### Screen 1: `/admin/cursos` — Lista de cursos

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (bg-white border-b border-slate-200)                │
│  Gestão de Incidentes · Área restrita (admin)   [Sair]     │
├─────────────────────────────────────────────────────────────┤
│ MAIN (bg-slate-50, max-w-6xl mx-auto px-6 py-10)           │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ text-xs eyebrow: CATÁLOGO                           │    │
│ │ h1: Catálogo de cursos                              │    │
│ │ text-sm: Gerencie cursos publicados, rascunhos...   │    │
│ │                                                     │    │
│ │ Stats row (text-sm text-slate-600):                 │    │
│ │ "3 publicados · 2 rascunhos · 1 arquivado"          │    │
│ │                                                     │    │
│ │              [primary] Novo curso →/admin/cursos/new│    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ LISTA DE CURSOS (space-y-3)                                 │
│ ┌─────────────────────────────────────────────────────┐    │
│ │[capa 80×80] Título do Curso         [badge status]  │    │
│ │             /slug-do-curso                          │    │
│ │             Criado em 01/01/2025                    │    │
│ │                                    [Editar] [Arquivar]   │
│ └─────────────────────────────────────────────────────┘    │
│ (cursos arquivados: opacity-60, badge amber)               │
│                                                             │
│ EMPTY STATE (se nenhum curso)                               │
│ ┌─────────────────────────────────────────────────────┐    │
│ │  [BookOpen icon 32px]                               │    │
│ │  Nenhum curso cadastrado ainda                      │    │
│ │  Crie o primeiro curso para começar.                │    │
│ │  [Novo curso]                                       │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Decisão de layout:** Lista horizontal (tabela simplificada em card), não grid de cards.
**Justificativa:** Admin precisa ver slug, status e datas em linha — grid de cards com capa
grande desperdiça espaço e esconde metadados críticos. Cards de capa são para a visão do
aluno, não do admin.

**Capa na lista:** `<div>` de 80×80px `rounded-xl overflow-hidden bg-slate-900` com
background-image (padrão existente do course-manager.tsx).

**Botão "Editar":** `secondary`, leva para `/admin/cursos/[slug]`.
**Botão "Arquivar":** `ghost` com ícone `Archive` (Lucide 16px), cor `text-amber-600 hover:text-amber-700`.
Ao clicar: abre ConfirmationDialog antes de submeter.

**Stats row:** Texto simples `text-sm text-slate-500`, separado por `·`. Calculado no RSC
a partir dos timestamps. Se zero cursos em algum status, omitir aquele item da linha
(ex: "2 publicados · 1 rascunho" sem "0 arquivados").

---

### Screen 2: `/admin/cursos/[slug]` — Edição de curso + módulos

**Layout:**

```
MAIN (bg-slate-50, max-w-6xl mx-auto px-6 py-10, space-y-6)

[Breadcrumb: Catálogo > Título do Curso]

┌── Section "Detalhes do curso" (card bg-white rounded-2xl border p-6) ──┐
│ eyebrow: CURSO                                                         │
│ h2: Detalhes do curso                                                  │
│                                                                        │
│ [form fields: título, slug (+ helper slugify), descrição, URL capa]    │
│ [subsection "Certificado" bg-slate-50 rounded-xl border p-4]           │
│ [campos certificado existentes]                                        │
│                                                                        │
│ FeedbackBanner (se houver state)                                       │
│                                                                        │
│ Ações (flex gap-3 flex-wrap items-center):                             │
│   [Salvar rascunho — secondary]                                        │
│   [Publicar — primary]   (só se archived_at IS NULL E published_at IS NULL)
│   [Despublicar — secondary] (só se published_at IS NOT NULL E archived_at IS NULL)
│   [Arquivar — ghost danger]  (com confirmação dupla)                   │
│   [Alunos com acesso → /admin/cursos/[slug]/alunos — ghost]            │
└────────────────────────────────────────────────────────────────────────┘

┌── Section "Módulos" (card bg-white rounded-2xl border p-6) ────────────┐
│ eyebrow: ESTRUTURA                                                     │
│ h2: Módulos                                                            │
│ [primary small] Adicionar módulo                                       │
│                                                                        │
│ Lista numerada de módulos (space-y-2):                                 │
│ ┌────────────────────────────────────────────────────────────────┐    │
│ │ [↑][↓]  1. Título do Módulo          [N aulas]  [Editar]      │    │
│ └────────────────────────────────────────────────────────────────┘    │
│ ┌────────────────────────────────────────────────────────────────┐    │
│ │ [↑][↓]  2. Outro Módulo              [N aulas]  [Editar]      │    │
│ └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│ EMPTY STATE módulos:                                                   │
│  "Nenhum módulo adicionado. Adicione o primeiro módulo."               │
└────────────────────────────────────────────────────────────────────────┘
```

**Campo slug:**
- Label: "Slug *"
- Helper text abaixo: "Use apenas letras minúsculas, números e hifens. Ex.: gestao-de-incidentes-nivel-1"
- Preview de slugify: quando o admin digita no campo "Título" e o slug está vazio/inalterado,
  exibir abaixo do input de slug: `text-xs text-slate-400 italic` "Sugestão: {slugificado}"
  (client-side, JavaScript puro, sem dep extra)
- Erro de colisão de slug: renderizado via `FieldError` com mensagem:
  "Já existe um curso com esse slug. Escolha outro."

**Botões de status de curso:**
- "Salvar rascunho": sempre visível, `secondary`, action `saveDraftAction`
- "Publicar": só aparece quando `published_at IS NULL AND archived_at IS NULL`, `primary`
- "Despublicar": só aparece quando `published_at IS NOT NULL AND archived_at IS NULL`, `secondary`
- "Arquivar": sempre visível (para qualquer status), botão `ghost` com `text-amber-600`.
  Ao clicar: ConfirmationDialog com texto específico (ver Copywriting).

**Link "Alunos com acesso":** botão `ghost` com ícone `Users` (Lucide), abre
`/admin/cursos/[slug]/alunos`. Exibir contagem inline: "Alunos com acesso (3)".

**Módulo na lista:**
- Fundo `bg-slate-50 rounded-xl border border-slate-200 px-4 py-3`
- Número de posição: `text-sm font-medium text-slate-500 w-6 shrink-0`
- Título: `text-sm font-medium text-slate-900 flex-1`
- Contagem de aulas: `text-xs text-slate-500 shrink-0`
- Botão Editar: `ghost`, leva para `/admin/cursos/[slug]/modulos/[moduleId]`
- ReorderButtons à esquerda

---

### Screen 3: `/admin/cursos/[slug]/modulos/[moduleId]` — Edição de módulo + aulas

**Layout:**

```
[Breadcrumb: Catálogo > Título do Curso > Título do Módulo]

┌── Section "Detalhes do módulo" (card) ─────────────────────────────────┐
│ eyebrow: MÓDULO                                                        │
│ h2: Detalhes do módulo                                                 │
│                                                                        │
│ Campos: título *, descrição (textarea, opcional)                       │
│ Campo readonly: Posição — "Posição: 2" (text-sm text-slate-500,       │
│   não editável diretamente, reordenação via ↑/↓ na lista)             │
│                                                                        │
│ FeedbackBanner                                                         │
│ [Salvar módulo — primary]          [Remover módulo — ghost danger]     │
└────────────────────────────────────────────────────────────────────────┘

┌── Section "Aulas" (card) ──────────────────────────────────────────────┐
│ eyebrow: CONTEÚDO                                                      │
│ h2: Aulas do módulo                                                    │
│ [Adicionar aula — primary small]                                       │
│                                                                        │
│ Lista de aulas (space-y-2):                                            │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ [↑][↓]  1. Título da Aula    [MM:SS workload]  [Editar]         │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ EMPTY STATE aulas:                                                     │
│  "Nenhuma aula neste módulo. Adicione a primeira aula."               │
└────────────────────────────────────────────────────────────────────────┘
```

**Aulas com soft delete (`deleted_at IS NOT NULL`):** Ocultas da lista por padrão.
Sem toggle "mostrar removidas" no v1 — admin vê apenas aulas ativas. (Consulta SQL filtra
`WHERE deleted_at IS NULL`.)

**Workload:** Se `workload_minutes` preenchido, exibir formatado: `text-xs text-slate-500`.
Ex.: 45 min → "45 min"; 90 min → "1h 30min".

**"Remover módulo":** Botão `ghost` com `text-red-600`. Ao clicar: ConfirmationDialog
mencionando que aulas do módulo também serão arquivadas (soft delete).

---

### Screen 4: `/admin/cursos/[slug]/aulas/[lessonId]` — Edição de aula + materiais

**Layout:**

```
[Breadcrumb: Catálogo > Curso > Módulo > Título da Aula]

┌── Section "Detalhes da aula" (card) ───────────────────────────────────┐
│ eyebrow: AULA                                                          │
│ h2: Detalhes da aula                                                   │
│                                                                        │
│ ┌ Grid 2 colunas (md:) ─────────────────────────────────────────────┐ │
│ │ Título *                  │ Duração estimada (minutos)            │ │
│ │ [input text]              │ [input number min=1]                  │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ Descrição (textarea opcional)                                          │
│                                                                        │
│ ┌── Vídeo (subsection bg-slate-50 rounded-xl border p-4) ────────┐   │
│ │ eyebrow: CONFIGURAÇÃO DE VÍDEO                                  │   │
│ │                                                                 │   │
│ │ Provider *                                                      │   │
│ │ [select: YouTube (dev only) | Bunny Stream]                    │   │
│ │ helper: "Em produção, use Bunny Stream. YouTube é apenas para   │   │
│ │          desenvolvimento."                                      │   │
│ │                                                                 │   │
│ │ ID do vídeo *                                                   │   │
│ │ [input text placeholder="ID do vídeo no provider selecionado"] │   │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ FeedbackBanner                                                         │
│ [Salvar aula — primary]       [Remover aula — ghost danger]            │
└────────────────────────────────────────────────────────────────────────┘

┌── Section "Materiais" (card) ──────────────────────────────────────────┐
│ eyebrow: MATERIAIS DE APOIO                                            │
│ h2: Materiais da aula                                                  │
│                                                                        │
│ Lista de materiais existentes (ul, space-y-0 divide-y divide-slate-100)│
│ [MaterialListItem × N]                                                 │
│                                                                        │
│ [FileUploadArea]                                                       │
│                                                                        │
│ EMPTY STATE materiais:                                                 │
│  "Nenhum material anexado. Faça upload de PDFs, planilhas ou imagens." │
└────────────────────────────────────────────────────────────────────────┘
```

**Banner "aula removida"** (se `deleted_at IS NOT NULL`):
```
<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
  <AlertTriangle size={18} class="text-amber-600 shrink-0 mt-0.5" />
  <div>
    <p class="text-sm font-semibold text-amber-800">Esta aula foi removida</p>
    <p class="text-xs text-amber-700 mt-0.5">
      Removida em {deleted_at dd/MM/yyyy}. O histórico de progresso dos alunos é preservado.
    </p>
  </div>
  <button [secondary small] ml-auto>Restaurar aula</button>
</div>
```
O form da aula ainda é exibido abaixo do banner (admin pode editar e restaurar).

**Select de provider:**
- Opção "YouTube (apenas dev)" tem `disabled` detectado via `NODE_ENV === 'production'`
  no RSC que renderiza o form (não client-side). Se em prod, renderizar somente
  "Bunny Stream" no select.

---

### Screen 5: `/admin/cursos/[slug]/alunos` — Enrollments

**Layout:**

```
[Breadcrumb: Catálogo > Título do Curso > Alunos com acesso]

┌── Section stats + ação (card) ─────────────────────────────────────────┐
│ eyebrow: ACESSO AO CURSO                                               │
│ h2: Alunos com acesso                                                  │
│ p: "5 alunos com acesso ativo · 1 convite pendente"                   │
│                                          [Conceder acesso — primary]  │
└────────────────────────────────────────────────────────────────────────┘

┌── Tabela de enrollments (card bg-white rounded-2xl border overflow-hidden)
│ <table class="w-full text-left">                                       │
│ <thead class="bg-slate-50 border-b border-slate-200">                  │
│   Email | Nome | Origem | Concedido em | Expira em | Ações            │
│ </thead>                                                               │
│ <tbody>                                                                │
│   [EnrollmentTableRow × N]                                             │
│ </tbody>                                                               │
│ </table>                                                               │
│                                                                        │
│ EMPTY STATE (se nenhum enrollment):                                    │
│  [Users icon 32px]                                                     │
│  "Nenhum aluno com acesso ainda"                                       │
│  "Conceda acesso ao primeiro aluno para começar."                      │
│  [Conceder acesso — primary]                                           │
└────────────────────────────────────────────────────────────────────────┘
```

**Paginação:** Sem paginação no v1 (poucos alunos por curso — contexto CONTEXT.md).

**Source labels (em pt-BR):**
- `admin_grant` → "Concessão manual"
- `b2b_invite` → "Convite B2B"
- `b2c_purchase` → "Compra B2C"

**"1 convite pendente":** Alunos em `pending_enrollments` (sem profile ainda).
Se zero pendentes, omitir esse trecho da frase de stats.

**Botão "Revogar acesso":** ícone `UserMinus` (Lucide 16px), `ghost`, `text-red-600`.
Ao clicar: ConfirmationDialog antes de submeter.

---

### Screen 6: Dialog "Conceder acesso" (`src/components/admin/grant-enrollment-dialog.tsx`)

**Estrutura do dialog:**

```
┌─── Dialog panel (max-w-md) ──────────────────────────────────────────┐
│ h3: Conceder acesso ao curso                                         │
│ p: "Informe o email do aluno para conceder acesso a {course title}." │
│                                                                      │
│ Email do aluno *                                                     │
│ [input type=email autoFocus autoComplete="off" placeholder="aluno@escola.edu.br"]
│                                                                      │
│ ─── Expiração ─────────────────────────────────────────────────────  │
│ [checkbox checked] Sem data de expiração (acesso vitalício)          │
│ [quando desmarcado, exibir:]                                         │
│   Data de expiração *                                                │
│   [input type=date]                                                  │
│                                                                      │
│ ─── Estado A: idle / digitando ───────────────────────────────────── │
│ (nada extra — botão "Buscar aluno" primary)                         │
│                                                                      │
│ ─── Estado B: buscando ───────────────────────────────────────────── │
│ [spinner 16px] "Buscando..."  (botão disabled)                      │
│                                                                      │
│ ─── Estado C: aluno encontrado ───────────────────────────────────── │
│ ┌─ bg-emerald-50 border border-emerald-200 rounded-lg p-3 ─────────┐ │
│ │ ✓ Aluno encontrado: {nome} ({email})                             │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ [Cancelar — secondary]  [Conceder acesso — primary]                  │
│                                                                      │
│ ─── Estado D: email não encontrado ───────────────────────────────── │
│ ┌─ bg-amber-50 border border-amber-200 rounded-lg p-3 ─────────────┐ │
│ │ ⚠ Não encontramos esse email.                                    │ │
│ │   Deseja enviar um convite e conceder o acesso quando aceitar?   │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ [Cancelar — secondary]  [Enviar convite e conceder acesso — primary] │
│                                                                      │
│ ─── Estado E: já tem acesso (erro UNIQUE) ────────────────────────── │
│ ┌─ bg-red-50 border border-red-200 rounded-lg p-3 ─────────────────┐ │
│ │ ✕ Este aluno já tem acesso ativo a este curso.                   │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ [Fechar — secondary]                                                 │
│                                                                      │
│ ─────────────────────────────────────────────────────── [✕ fechar] │
└──────────────────────────────────────────────────────────────────────┘
```

**Debounce:** A busca de email NÃO é automática (sem debounce assíncrono). Admin digita o
email e clica "Buscar aluno" — uma ação explícita. Isso evita requests enquanto digita e
mantém o fluxo previsível com Server Actions.

**Foco:** `autoFocus` no input de email ao abrir o dialog.
**Esc:** Fecha o dialog (listener em `keydown`).
**Overlay click:** Fecha o dialog.

**Toggle "Sem data de expiração":**
- Default: `checked` (acesso vitalício é o caso mais comum — B2C)
- Quando desmarcado: fade-in de `input[type=date]` abaixo
- O toggle é um `<input type="checkbox">` estilizado, não um switch customizado

---

### Screen 7: Form institucional com UTM (ajuste silencioso)

**Sem mudança visual.** Três `<input type="hidden">` adicionados dentro do form existente
em `/` (landing page). Admin não vê. Nenhuma alteração de layout, copy, ou interação.

**Garantia:** O form não pode regredir. O teste de verifier deve confirmar que as 11 seções
da landing continuam renderizando após a mudança.

---

## Interaction Patterns

### Confirmação dupla para ações destrutivas

Aplicado em: arquivar curso, remover módulo, remover aula, revogar acesso.

**Fluxo:**
1. Admin clica no botão destrutivo
2. ConfirmationDialog abre imediatamente (sem delay)
3. Dialog tem foco trapeado (Tab navega entre Cancelar e Confirmar apenas)
4. Admin confirma → Server Action dispara → dialog fecha → FeedbackBanner exibe resultado
5. Esc ou Cancelar → fecha sem ação

**Copy específica por ação (ver seção Copywriting).**

### Loading states

- **Form submit:** Botão passa para `disabled` + label muda para `pendingLabel` via `useFormStatus()`
- **File upload:** Área de upload mostra barra de progresso linear (`h-1 bg-sky-500`) +
  texto "Enviando... {N}%". Se falhar: FieldError inline abaixo da área
- **Busca de email no dialog:** Botão "Buscar aluno" → disabled + spinner Lucide `Loader2`
  com `animate-spin class`

### Debounced search

NÃO aplicado. Ver nota no Screen 6. A busca é acionada por clique explícito.

### Focus management

- **Ao abrir dialog:** `autoFocus` no primeiro input interativo
- **Ao fechar dialog (Esc/Cancelar):** retornar foco para o botão que abriu o dialog
  (salvar ref do trigger button antes de abrir)
- **Ao abrir ConfirmationDialog:** foco vai para o botão "Cancelar" (mais seguro — evita
  confirmação acidental por Enter)
- **Após Server Action com erro:** foco vai para o FeedbackBanner via `aria-live="polite"`

### Keyboard navigation

- Todos os botões e links alcançáveis por Tab em ordem lógica (DOM order)
- Botões ↑/↓ de reorder: Tab navega entre eles; Enter/Space ativa
- Dialog: Tab trapeia dentro do dialog enquanto aberto
- Tabelas: células de ação alcançáveis por Tab

### Reorder com ↑/↓

Cada par de botões envolve um `<form>` oculto com Server Action e `method="post"`.
Após submit, RSC refetch (via `router.refresh()` ou revalidatePath) atualiza a lista.
Sem optimistic UI no v1 — a lista recarrega após a ação.

---

## Copywriting Glossary (pt-BR)

### Termos de ação (botões)

| Ação | Label do botão | Pendente |
|------|---------------|----------|
| Criar curso | "Novo curso" | N/A (link) |
| Salvar edições | "Salvar" | "Salvando..." |
| Publicar curso | "Publicar curso" | "Publicando..." |
| Despublicar | "Despublicar curso" | "Despublicando..." |
| Arquivar curso | "Arquivar curso" | "Arquivando..." |
| Adicionar módulo | "Adicionar módulo" | N/A (abre form) |
| Salvar módulo | "Salvar módulo" | "Salvando..." |
| Remover módulo | "Remover módulo" | "Removendo..." |
| Adicionar aula | "Adicionar aula" | N/A (abre form) |
| Salvar aula | "Salvar aula" | "Salvando..." |
| Remover aula | "Remover aula" | "Removendo..." |
| Restaurar aula | "Restaurar aula" | "Restaurando..." |
| Conceder acesso | "Conceder acesso" | "Concedendo..." |
| Enviar convite | "Enviar convite e conceder acesso" | "Enviando convite..." |
| Buscar aluno | "Buscar aluno" | "Buscando..." |
| Revogar acesso | ícone (aria-label: "Revogar acesso de {email}") | — |
| Subir na lista | ícone (aria-label: "Mover para cima") | — |
| Descer na lista | ícone (aria-label: "Mover para baixo") | — |

### Copy de confirmação dupla

| Ação | Título do dialog | Corpo do dialog | Botão confirmar |
|------|-----------------|-----------------|-----------------|
| Arquivar curso | "Arquivar este curso?" | "O curso será removido da listagem dos alunos. Certificados e histórico de progresso já emitidos são preservados. Esta ação pode ser revertida via suporte." | "Arquivar curso" (danger) |
| Remover módulo | "Remover este módulo?" | "Todas as aulas do módulo serão arquivadas. O histórico de progresso dos alunos é preservado. Use Restaurar aula se precisar desfazer." | "Remover módulo" (danger) |
| Remover aula | "Remover esta aula?" | "A aula será arquivada. O histórico de progresso dos alunos que já a assistiram é preservado." | "Remover aula" (danger) |
| Revogar acesso | "Revogar acesso?" | "O aluno {email} perderá acesso imediato ao curso. Progresso e certificados já emitidos são preservados." | "Revogar acesso" (danger) |

### Copy de empty states

| Tela | Ícone Lucide | Título | Subtexto | CTA |
|------|-------------|--------|----------|-----|
| /admin/cursos sem cursos | BookOpen | "Nenhum curso cadastrado" | "Crie o primeiro curso para começar." | "Novo curso" |
| Módulos vazios | Layers | "Nenhum módulo criado" | "Adicione módulos para organizar as aulas." | "Adicionar módulo" |
| Aulas vazias | PlayCircle | "Nenhuma aula neste módulo" | "Adicione a primeira aula deste módulo." | "Adicionar aula" |
| Materiais vazios | Paperclip | "Nenhum material anexado" | "Faça upload de PDFs, planilhas ou imagens de apoio." | — |
| Alunos sem acesso | Users | "Nenhum aluno com acesso" | "Conceda acesso ao primeiro aluno para começar." | "Conceder acesso" |

### Copy de erros (mensagens de erro do usuário)

| Situação | Mensagem |
|----------|----------|
| Slug já existe | "Já existe um curso com esse slug. Escolha outro." |
| Campo obrigatório vazio (genérico) | "Este campo é obrigatório." |
| Slug inválido (chars não permitidos) | "Use apenas letras minúsculas, números e hifens. Ex.: gestao-de-incidentes" |
| Arquivo muito grande | "O arquivo excede o limite de 20 MB. Escolha um arquivo menor." |
| Tipo de arquivo não permitido | "Tipo de arquivo não suportado. Tipos aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG." |
| Aluno já tem acesso | "Este aluno já tem acesso ativo a este curso." |
| Email inválido | "Informe um endereço de email válido." |
| Erro genérico de servidor | "Não foi possível concluir a ação. Tente novamente ou entre em contato com o suporte." |
| Revise os dados | "Revise os dados informados." |

### Copy de mensagens de sucesso

| Ação | Mensagem |
|------|----------|
| Curso salvo | "Curso salvo com sucesso." |
| Curso publicado | "Curso publicado. Agora está visível para alunos com matrícula ativa." |
| Curso despublicado | "Curso voltou para rascunho. Não está mais visível para alunos." |
| Curso arquivado | "Curso arquivado. Removido da listagem de alunos." |
| Módulo salvo | "Módulo salvo com sucesso." |
| Módulo removido | "Módulo arquivado. Aulas preservadas." |
| Aula salva | "Aula salva com sucesso." |
| Aula removida | "Aula arquivada. Histórico de progresso preservado." |
| Aula restaurada | "Aula restaurada com sucesso." |
| Material enviado | "Material enviado com sucesso." |
| Material removido | "Material removido." |
| Acesso concedido | "Acesso concedido com sucesso." |
| Convite enviado | "Convite enviado. O acesso será ativado quando o aluno aceitar." |
| Acesso revogado | "Acesso revogado." |

### Vocabulário proibido

| Não usar | Usar em vez |
|----------|------------|
| "Deletar" | "Remover" (soft) ou "Excluir" (hard — não ocorre no v1) |
| "Salvar" como único botão em página de status | "Salvar rascunho" ou "Publicar" separados |
| "Archive" / "Publish" / "Save" (inglês) | Todos os termos acima em pt-BR |
| "Error 23505" | "Já existe um curso com esse slug." |
| "tu" / "seu" informal excessivo | "Você" / direto sem pronome quando possível |
| Títulos com ponto final | Sem ponto em títulos e headings |
| "Provider" exposto ao admin | "Plataforma de vídeo" |

---

## Accessibility Notes

### Estrutura de headings por página

```
/admin/cursos:
  h1: "Catálogo de cursos"
  (sem h2 — lista é flat)

/admin/cursos/[slug]:
  h1: "{Título do curso}" (ou "Novo curso")
  h2: "Detalhes do curso"
  h2: "Módulos"

/admin/cursos/[slug]/modulos/[moduleId]:
  h1: "{Título do módulo}" (ou "Novo módulo")
  h2: "Detalhes do módulo"
  h2: "Aulas do módulo"

/admin/cursos/[slug]/aulas/[lessonId]:
  h1: "{Título da aula}" (ou "Nova aula")
  h2: "Detalhes da aula"
  h2: "Materiais da aula"

/admin/cursos/[slug]/alunos:
  h1: "Alunos com acesso"
  (sem h2 — tabela única)
```

### ARIA obrigatório

| Elemento | ARIA |
|----------|------|
| Botões de ícone sem texto | `aria-label` descritivo em pt-BR |
| FeedbackBanner | `role="status" aria-live="polite"` |
| Dialog | `role="dialog" aria-modal="true" aria-labelledby="{h3-id}"` |
| ConfirmationDialog | `role="alertdialog" aria-modal="true" aria-labelledby="{h3-id}"` |
| Tabela de enrollments | `<caption class="sr-only">Lista de alunos com acesso ao curso</caption>` |
| Upload area | `aria-describedby="{hint-id}"` linkando para o texto de tipos aceitos |
| Breadcrumb nav | `aria-label="Navegação"` no `<nav>`; item atual com `aria-current="page"` |
| ChevronRight separadores | `aria-hidden="true"` |
| Botões ↑/↓ desabilitados | `aria-disabled="true"` além de `disabled` |

### Contraste de cores

Todos os pares texto/fundo atingem WCAG AA (4.5:1 para texto normal, 3:1 para texto grande):
- `text-slate-900` / `bg-white`: 15.3:1 ✓
- `text-slate-600` / `bg-white`: 5.74:1 ✓
- `text-white` / `bg-sky-600`: 4.7:1 ✓
- `text-emerald-700` / `bg-emerald-50`: 5.1:1 ✓
- `text-red-700` / `bg-red-50`: 5.6:1 ✓
- `text-amber-700` / `bg-amber-50`: 4.6:1 ✓
- `text-red-600` / `bg-white`: 4.5:1 ✓ (FieldError — mínimo aceitável)

**FLAG-A3:** `text-slate-500` / `bg-white` ≈ 3.5:1 — abaixo de AA para texto normal (14px weight 400).
Uso está restrito a microcopy/helper text (menos crítico). Aceito no v1 per PROJECT.md
("Redesign após v1"). Documentado aqui para revisão no redesign.

### Responsividade

- **Target primário:** laptop 1280px (admin é ferramenta interna — CONTEXT.md)
- **Grid de form:** `md:grid-cols-2` colapsa para 1 coluna em mobile (< 768px)
- **Tabela de enrollments:** Em mobile (< 768px), colunas "Origem", "Expira em" ficam
  ocultas via `hidden md:table-cell`. As colunas "Email" e "Ações" sempre visíveis.
- **Botões de ação em /admin/cursos/[slug]:** `flex-wrap` para não quebrar layout em telas < 900px
- **Dialog:** `max-w-md w-full mx-4` — garante margens em mobile

---

## Open Questions / FLAGs

### FLAG-01: Formulário inline de "Novo curso" vs página separada

O design atual do `course-manager.tsx` cria um novo curso via form inline na mesma página.
A nova arquitetura tem `/admin/cursos/[slug]` como página de edição. Para criação, há
duas opções:
- **Opção A (recomendada):** `/admin/cursos/novo` — página dedicada com form em branco.
  Mais consistente com a arquitetura de páginas aninhadas (D-05).
- **Opção B:** Modal/dialog de criação rápida na listagem, só com título + slug.
  Mais rápido mas introduz complexidade client-side.

**Recomendação do researcher:** Opção A. Mantém RSC-first, sem estado client desnecessário.
**Ação para o planner:** Decidir e criar a rota `/admin/cursos/novo` ou confirmar Opção A.

### FLAG-02: Rota `/admin` existente após refatoração

`src/app/admin/page.tsx` atualmente renderiza `CourseManager` inline. Após Phase 2,
o curso management migra para `/admin/cursos`. A rota `/admin` deve:
- **Opção A:** Redirecionar para `/admin/cursos` (`redirect('/admin/cursos')`)
- **Opção B:** Virar uma página de "hub" admin com links para Cursos, Usuários, etc.

**Recomendação:** Opção A para o v1 (simples). Opção B naturalmente emerge na Phase 5
quando o gestor de instituição adicionar mais seções.

### FLAG-03: Paginação da tabela de enrollments para o futuro

Sem paginação no v1. Se o curso tiver >100 alunos, a tabela ficará longa. O researcher
recomenda que ao implementar, o executor adicione um limite soft de 200 rows e uma nota
`text-xs text-slate-500` abaixo da tabela: "Exibindo {N} alunos." — sem botão de
paginar, apenas truncar com aviso.

### FLAG-04: Drag-and-drop como melhoria futura (deferred de CONTEXT.md)

Formalmente documentado aqui como FLAG para o redesign ou v2: substituir botões ↑/↓ por
`@dnd-kit` para reordenação. A interface atual é funcional e acessível por teclado, mas
drag-and-drop seria UX premium especialmente se o catálogo crescer para >10 módulos por
curso.

### FLAG-05: Capa do curso — upload direto vs URL

O `course-manager.tsx` atual usa `input[type=text]` para `cover_image_url`. Phase 2
pode evoluir para upload direto ao Supabase Storage. O researcher recomenda manter
o campo URL no v1 (sem dep nova de upload de imagem) e documentar aqui para Phase futura.
O executor deve manter o campo como `type="text"` com helper text.

### FLAG-06: Acessibilidade da área de upload drag-and-drop

`FileUploadArea` usa estilo "clique ou arraste". A implementação deve garantir que o
`<input type="file" class="sr-only">` é o elemento interativo real (teclado ativa com
Enter/Space no wrapper via `onClick` + `onKeyDown`). Testar com VoiceOver e NVDA
está fora do escopo do v1 (ver UX-V2-02 no REQUIREMENTS.md).

---

## Registry Safety Gate

Não aplicável. Nenhum componente de registry de terceiros declarado nesta fase.
shadcn não foi inicializado. Todas as dependências de UI são:
- `lucide-react` 0.462.0 (já no package.json)
- Tailwind v4 (já configurado)
- `@tailwindcss/postcss` (já configurado)

---

*Phase: 02-catalog-crud*
*UI-SPEC gerado: 2026-04-28*
*Status: draft — aguarda verificação do gsd-ui-checker*
