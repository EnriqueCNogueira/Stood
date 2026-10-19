---
name: review
description: Revisa o código do diff atual com code-review, simplify e busca de duplicidade, mostra os problemas encontrados e deixa o usuário decidir o que aplicar.
argument-hint: "[low|medium|high]"
---

# Review

Revisa o código do diff atual em três análises, mostra os problemas e deixa o usuário decidir quais ajustes aplicar. **Nada é alterado antes da resposta do usuário.**

## 1. Definir o alvo

- **Diff**: A branch atual contra a branch pai, mais o que ainda não foi commitado. Nunca o repositório inteiro.
- **Nível**: `$ARGUMENTS`. Vazio, usar `medium`.
- **Rules**: Ler as rules de `.claude/rules/` cujos `paths` casam com os arquivos do diff. Elas são o padrão contra o qual o diff é conferido.

## 2. Analisar, nesta ordem

1. **Correção**: Invocar a skill `code-review` com o nível do passo 1, sem `--fix` e sem `--comment`.
2. **Simplificação**: Invocar a skill `simplify` no mesmo diff, pedindo só a lista de achados, sem aplicar.
3. **Abstração**: Procurar no diff e em `src/lib/` código repetido que o diff criou ou copiou: função, componente, query, schema Zod. Só vira achado o que aparece 2 vezes ou mais e abstrair fica mais simples para quem usa, como diz [code-style.md](../../rules/code-style.md#convenções). Abstração que só esconde código não entra.

## 3. Juntar

- **Uma lista só**: Os achados das três análises juntos, do mais grave ao mais leve.
- **Empate**: Duas análises no mesmo `arquivo:linha` viram um item; vale o da `code-review`, e o resto entra como complemento.
- **Fora do diff**: Problema em código que o diff não tocou não vira achado.

## 4. Perguntar

Só depois dos passos 2 e 3 completos. No máximo 5 rodadas de `AskUserQuestion`, com até 4 perguntas cada, dos achados mais graves para os mais leves.

- **Pergunta simples**: Explicar em uma ou duas frases, sem jargão, o que está errado e o que acontece se ficar assim.
- **Recomendada primeiro**: A melhor opção vem primeiro, marcada como recomendada.
- **Sempre "Não aplicar"**: Toda pergunta tem essa opção.
- **Mais de um jeito**: Se houver mais de uma correção razoável, oferecer as duas.
- **Agrupar**: Achados do mesmo tipo e do mesmo arquivo viram uma pergunta só.
- **Múltipla escolha**: Nas últimas rodadas, achados mais leves podem vir juntos numa pergunta de múltipla escolha, uma opção por achado, para marcar quais aplicar. Cada opção traz uma explicação simples e diz se é recomendada ou não.

Achado que não coube nas 5 rodadas não é aplicado: entra na lista final como pendente.

## 5. Aplicar e fechar

1. Aplicar só o que foi aceito.
2. Se algo foi aplicado, rodar o portão de qualidade do `CLAUDE.md` e mostrar o resultado real. Comando que ainda não existe é dito, não inventado.
3. Fechar com três listas curtas: aplicado, recusado e pendente.
