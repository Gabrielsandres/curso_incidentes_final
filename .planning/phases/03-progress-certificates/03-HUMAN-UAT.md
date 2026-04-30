---
status: partial
phase: 03-progress-certificates
source: [03-VERIFICATION.md]
started: 2026-04-30T01:05:00Z
updated: 2026-04-30T01:05:00Z
---

## Current Test

[aguardando testes manuais]

## Tests

### 1. Navegação "Continuar de onde parei"
expected: Como aluno com progresso parcial, clicar no botão "Continuar de onde parei" deve navegar para /curso/{slug}/aula/{id-da-próxima-aula-incompleta} e o player deve exibir a aula correta
result: [pending]

### 2. Banner de conclusão sem reload
expected: Como aluno, ao clicar em "Marcar aula como concluída" na última aula, banner verde aparece inline com texto "Curso concluído! Seu certificado está disponível no painel." com link para /dashboard — sem reload
result: [pending]

### 3. Âncora #certificados
expected: No dashboard, clicar em "Meus Certificados" (State C) deve fazer scroll até a seção "Meus Certificados" que está visível e populada
result: [pending]

### 4. State C sem certificate_enabled
expected: Card de curso 100% concluído com certificate_enabled=false exibe apenas botão secundário "Rever curso" — sem botão "Meus Certificados"
result: [pending]

### 5. Toggle de certificate no formulário admin
expected: Admin desmarca "Emitir certificado neste curso" → 4 campos dependentes somem via display:none imediatamente; reativar o checkbox → campos reaparecem
result: [pending]

### 6. Download de PDF sem mojibake
expected: PDF baixado em "Meus Certificados" exibe nome do aluno (com ç, ã, õ), nome do curso, data em pt-BR e UUID sem caracteres corrompidos
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
