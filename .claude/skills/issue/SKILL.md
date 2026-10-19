---
name: issue
description: Define uma tarefa nova como issue do GitHub, com o problema a resolver depois. Alinha o pedido com perguntas, entrega título e texto e pergunta se cria a issue.
---

# Issue

Organiza uma tarefa nova em uma issue, que define um problema a ser resolvido depois. **Nunca altera código nem cria a issue sem a resposta do usuário no passo 4.**

## 1. Entender o pedido

Ler o que o usuário pediu e localizar no repositório o que a issue toca:

- **Código**: Os arquivos e funções que a issue toca, se já existem.
- **Rule**: A rule de `.claude/rules/` que vale para os arquivos envolvidos.
- **Decisão em aberto**: Se depende de biblioteca ou serviço ainda não escolhido, a issue não decide: registra a dependência.

O que não der para confirmar no repositório vira pergunta no passo 2, nunca suposição escrita na issue.

## 2. Alinhar

Uma rodada de `AskUserQuestion`, com até 4 perguntas, só sobre o que muda o texto:

- **Escopo**: O que entra e o que fica fora.
- **Critério de pronto**: Como saber que a issue terminou.
- **Tipo**: Feature, bug, melhoria ou documentação.
- **Dependência**: Outra issue ou decisão que vem antes.

Cada pergunta explica o problema em uma frase e traz a opção recomendada em primeiro lugar. Resposta ambígua gera uma segunda rodada; fora isso, não há outra.

## 3. Entregar

Título em uma linha, no imperativo, com até 60 caracteres. Texto em markdown, num bloco de código para copiar:

```markdown
## Contexto
<Até 3 frases: o problema ou o pedido e por que importa agora.>

## O que fazer
- **<Tema curto>**: <O comportamento esperado, não o arquivo a mexer.>

## Critério de pronto
- [ ] <Condição verificável, como teste passando ou comportamento na tela.>

## Fora de escopo
- <O que fica para outra issue.>

## Referências
- <Issue, rule e decisão em aberto envolvidas.>
```

Seção sem conteúdo sai do texto em vez de ficar vazia.

## 4. Perguntar se cria

Perguntar com `AskUserQuestion` se a issue deve ser criada no GitHub.

- **Sim**: Criar com `gh issue create --title "<título>" --body "<texto>"` e mostrar o link devolvido. Se o `gh` não estiver instalado ou autenticado, dizer isso e deixar o texto para colar.
- **Não**: Encerrar com o texto entregue no passo 3.

## Regras de texto

- **Curto e direto**: Frases curtas, sem repetir a mesma ideia e sem preâmbulo.
- **Tópicos**: Título curto em negrito, dois pontos e descrição começando com maiúscula.
- **Sem travessão**: Use vírgula, dois pontos, parênteses ou ponto final.
- **Sem enfeite**: Sem emoji, seta decorativa, caixa alta para ênfase nem adjetivo de venda ("robusto", "poderoso").
- **Português**: Texto da issue em português; nomes de código entre crases, como estão no repositório.
