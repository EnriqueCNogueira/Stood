---
name: to-spec
description: "Transforma a conversa atual em uma spec e a salva em _spec/ no repositório: sem entrevista, só síntese do que já foi discutido."
disable-model-invocation: true
---

# To-spec

Transforma o contexto da conversa atual e o entendimento do codebase numa spec salva em `_spec/`. **Não entrevista o usuário nem decide o que a conversa deixou em aberto: só sintetiza o que já foi discutido.**

## 1. Explorar o repositório

Explore o repo para entender o estado atual do codebase, se ainda não tiver feito isso.

- **Glossário**: Se existir `docs/GLOSSARY.md`, use o vocabulário dele em toda a spec.
- **ADRs**: Se existir `docs/adr/`, respeite os ADRs da área que você está mexendo. Na spec, linke o ADR na decisão em vez de repetir o conteúdo dele.
- **Decisão faltando**: Se a conversa não resolveu uma decisão que a spec precisa, pare, diga qual é e sugira `/grill-me` em vez de decidir sozinho.

## 2. Definir onde testar

Esboce os pontos em que a feature será testada, no nível que [testing-strategy.md](../../rules/testing-strategy.md) define nas seções "Pirâmide" e "O que vale teste". Prefira pontos que já existem a novos; se precisar de novos, proponha no nível mais alto que puder. Quanto menos pontos de teste no codebase, melhor: o número ideal é um.

- **Confirmar**: Uma rodada de `AskUserQuestion` para confirmar que esses pontos correspondem ao que o usuário espera, com a proposta recomendada primeiro. É a única pergunta da skill.

## 3. Escrever e salvar

Escreva a spec no template abaixo e salve em `_spec/<feature-slug>/spec.md`, na raiz do repositório (criando o diretório se necessário).

```markdown
## Declaração do Problema

O problema que o usuário está enfrentando, da perspectiva do usuário.

## Solução

A solução para o problema, da perspectiva do usuário.

## User Stories

Uma lista numerada de user stories, uma por comportamento da feature, cobrindo todos os aspectos sem repetir. Cada user story segue o formato:

1. Como <ator>, eu quero <funcionalidade>, para que <benefício>

Exemplo: 1. Como cliente de um banco pelo celular, eu quero ver o saldo das minhas contas, para que eu possa tomar decisões mais bem informadas sobre meus gastos

## Decisões de Implementação

Uma lista das decisões de implementação que foram tomadas. Pode incluir:

- Os módulos que serão construídos/modificados
- As interfaces desses módulos que serão modificadas
- Esclarecimentos técnicos do desenvolvedor
- Decisões de arquitetura
- Mudanças de schema
- Contratos de API
- Interações específicas

Não inclua caminhos de arquivo específicos nem trechos de código. Eles podem ficar desatualizados muito rápido.

Exceção: se um protótipo produziu um trecho que codifica uma decisão com mais precisão do que a prosa consegue (state machine, reducer, schema, formato de tipo), coloque-o inline dentro da decisão relevante e anote brevemente que veio de um protótipo. Corte para as partes ricas em decisão, não uma demo funcional, só o essencial.

## Decisões de Teste

Uma lista das decisões de teste que foram tomadas. Inclua:

- Os pontos de teste confirmados no passo 2 e o que cada um cobre
- Quais módulos serão testados
- Prior art dos testes (ou seja, testes parecidos já existentes no codebase)

## Fora de Escopo

Uma descrição do que está fora do escopo desta spec.

## Notas Adicionais

Quaisquer notas adicionais sobre a feature.
```
