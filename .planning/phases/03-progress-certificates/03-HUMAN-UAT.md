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
result: Ok

### 2. Banner de conclusão sem reload
expected: Como aluno, ao clicar em "Marcar aula como concluída" na última aula, banner verde aparece inline com texto "Curso concluído! Seu certificado está disponível no painel." com link para /dashboard — sem reload
result: Ok. Porém, quando fui cadastrar um novo curso para testar isso, identifiquei um novo erro, eu não consigo cadastrar um módulo dentro de "Gerenciar cursos", ele apresenta o erro "Revise os dados informados." e não dá mensagem de erro no log. Só está sendo possível criar módulo no botão "Criar módulo", o que não faz sentido, esse botão deve ser excluído e a criação de módulo ir para dentro de "Gerenciar cursos"

### 3. Âncora #certificados
expected: No dashboard, clicar em "Meus Certificados" (State C) deve fazer scroll até a seção "Meus Certificados" que está visível e populada
result: Não fez sentido esse teste pra mim, no dashboard o único texto "Meus certificados" já é na seção "Meus certificado" então não vai fazer scroll

### 4. State C sem certificate_enabled
expected: Card de curso 100% concluído com certificate_enabled=false exibe apenas botão secundário "Rever curso" — sem botão "Meus Certificados"
result: Essa parte está Ok. Porém o tem um bug, onde no curso "Gestão de Incidentes em Estabelecimentos de Ensino" só tem 11 aulas cadastradas e no curso parece ter 13 aulas, então quando assisto todas as aulas fica aparecendo dentro do curso "11/13" e o percentual 85%, sendo que devia ser 100%. Já quando vou ver esse curso em dashboard, aparece corretamente: 11/11 e 100%. Por fim, ele está exibindo um módulo sem aula nenhuma, caso o curso possua um módulo com 0 aulas, ele não deve ser exibido para o aluno.

### 5. Toggle de certificate no formulário admin
expected: Admin desmarca "Emitir certificado neste curso" → 4 campos dependentes somem via display:none imediatamente; reativar o checkbox → campos reaparecem
result: ok

### 6. Download de PDF sem mojibake
expected: PDF baixado em "Meus Certificados" exibe nome do aluno (com ç, ã, õ), nome do curso, data em pt-BR e UUID sem caracteres corrompidos
result: Sim, só o nome que está ficando no lugar errado da imagem.

## Summary

total: 6
passed: 3
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

### Gap 1 — Módulo sem aulas exibido no player (PROG-01)
status: failed
description: Módulo com 0 aulas aparece visível para o aluno dentro do player do curso. Esperado: módulos sem aulas não devem ser renderizados.

### Gap 2 — Contador de aulas errado dentro do player (PROG-01/PROG-04)
status: failed
description: Curso com 11 aulas cadastradas exibe "11/13" e 85% dentro do player, mas o dashboard exibe corretamente "11/11" e 100%. O player está usando um contador que inclui aulas soft-deleted ou de módulos incorretos.

### Gap 3 — Nome do aluno na posição errada no PDF (CERT-03)
status: failed
description: O PDF do certificado é gerado sem mojibake, mas o nome do aluno aparece na posição errada no template de imagem.

