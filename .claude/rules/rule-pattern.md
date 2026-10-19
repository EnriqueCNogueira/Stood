---
description: Formato das rules do repositório (quando criar, frontmatter, estrutura, escrita e tamanho)
paths: [".claude/rules/**"]
---

# Padrão de rule

> **Quando aplicar:** Ao criar ou editar um arquivo de `.claude/rules/`, porque rule fora do padrão carrega na hora errada ou se perde no contexto.

## O que é

Instrução para o agente que carrega sozinha quando ele mexe em arquivos que casam com o `paths` dela. Guarda como trabalhar numa área do código; o que vale para o repositório inteiro fica no `CLAUDE.md`.

## Quando criar

- **Sim**: Área com regra própria que o agente erraria sem ler, como banco, sessão, quadro ou testes, ligada a um conjunto claro de arquivos.
- **Não, vai no `CLAUDE.md`**: Regras globais que valem em qualquer arquivo.
- **Não, vira skill**: Procedimento com passos que o usuário aciona, como abrir um Pull Request.
- **Não, vira comentário**: Regra de um arquivo só.
- **Não, vira link**: Conteúdo que já está em outra rule.

## Arquivo

- **Local e nome**: `.claude/rules/<tema>.md`, com o tema em inglês e em `kebab-case`, como `code-style.md`.
- **Tamanho**: No máximo 100 linhas. Passou, divida por tema ou corte o que já tem regra ou corte o que o agente já faz certo sem a regra.
- **Idioma**: Texto em português; nomes de código entre crases, como estão no repositório.

## Estrutura

Nesta ordem:

```markdown
---
description: <Resumo do tema em uma linha>
paths: ["<glob>", "<glob>"]
---

# <Tema>

> **Quando aplicar:** <Situação>, porque <o que quebra sem a regra>.

## <Assunto>

- **<Título curto>**: <Regra e o motivo em uma frase.>

## Anti-patterns

1. <O que nunca fazer.>

## Checklist

- [ ] <O que conferir antes de dar a tarefa por pronta.>
```

- **`paths`**: Globs dos arquivos em que a rule carrega. Sem `paths`, ela carrega em toda sessão.
- **Assuntos**: Uma seção `##` por assunto, quantas forem precisas.
- **Anti-patterns**: Opcional. Entra quando há erro comum que a regra sozinha não deixa óbvio.
- **Checklist**: Obrigatório, com o que dá para conferir no diff.

## Escrita

- **Regra, não explicação**: Diga o que fazer e o motivo em uma frase, sem histórico nem alternativa descartada.
- **Fonte única**: Cada regra mora num lugar só; os outros arquivos linkam com caminho relativo.
- **Sem enfeite**: Sem travessão, emoji, seta decorativa ou caixa alta para ênfase.

## Checklist

- [ ] Frontmatter com `description` e `paths`.
- [ ] "Quando aplicar" logo abaixo do título e Checklist no fim.
- [ ] No máximo 100 linhas.
- [ ] Links relativos válidos e nenhuma regra copiada de outra rule ou do `CLAUDE.md`.
