---
description: Formato das skills do repositório (quando criar, frontmatter, passos, escrita e tamanho)
paths: [".claude/skills/**"]
---

# Padrão de skill

> **Quando aplicar:** Ao criar ou editar um `SKILL.md` em `.claude/skills/`, porque skill fora do padrão é acionada na hora errada ou pula passo.

## O que é

Procedimento com passos fixos que o usuário aciona por `/<nome>`. Diferente da rule, não carrega por arquivo: roda só quando chamada. Nunca criar Skill sem permissão explícita.

## Quando criar

- **Sim**: Tarefa que se repete, com passos fixos e entrega definida, como issue, review e PR.
- **Não, vira rule**: Regra de como escrever código numa área.
- **Não, vai no `CLAUDE.md`**: Instrução que vale em toda sessão.
- **Não, fica no pedido**: Tarefa feita uma vez só.

## Arquivo

- **Local e nome**: `.claude/skills/<nome>/SKILL.md`, com a pasta no nome do comando, curto, em inglês e em `kebab-case`.
- **Tamanho**: No máximo 100 linhas. Modelo longo ou referência vai para outro arquivo na mesma pasta, linkado do `SKILL.md`.
- **Idioma**: Texto em português; nomes de código entre crases, como estão no repositório.

## Estrutura

Nesta ordem:

```markdown
---
name: <nome>
description: <O que faz e o que entrega.>
---

# <Nome>

<O que a skill faz em uma frase.> **<O que ela nunca faz.>**

## 1. <Verbo no infinitivo>

- **<Título curto>**: <O que fazer e quando parar ou perguntar.>

## 2. <Verbo no infinitivo>
```

- **`name`**: Igual ao nome da pasta.
- **Limite em negrito**: A frase de abertura diz o que a skill nunca faz, como commitar, abrir PR ou alterar código antes da resposta.
- **Passos**: Uma seção `## N. <Verbo>` por etapa, na ordem em que roda.
- **Modelo de saída**: Opcional. Quando a skill entrega texto, o formato vai num bloco de código markdown.

## Escrita

- **Resultado real**: Saída de comando é a que rodou; comando que não existe é dito, nunca inventado.
- **Decisão do usuário**: Vai por `AskUserQuestion`, com a opção recomendada primeiro.
- **Fonte única**: Regra do `CLAUDE.md` ou de uma rule é citada pelo caminho, não copiada.
- **Sem enfeite**: Sem travessão, emoji, seta decorativa ou caixa alta para ênfase.

## Checklist

- [ ] Frontmatter com `name` igual à pasta.
- [ ] Frase de abertura com o limite em negrito e passos numerados.
- [ ] No máximo 100 linhas.
- [ ] Links relativos válidos e nenhuma regra copiada de rule ou do `CLAUDE.md`.
