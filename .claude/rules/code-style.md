---
description: Nomes, verbos de função, formato de resultado, código autoexplicativo e comentários
paths: ["**/*.ts", "**/*.tsx", "**/*.mjs"]
---

# Estilo de código

> **Quando aplicar:** Ao criar ou renomear arquivo, função, tipo, componente ou constante, e ao escrever comentário, porque código fora do padrão confunde o próximo a ler.

## Nomes

- **Entidade**: Vai para o inglês mesmo quando a tela fala português: estudo é `study`, repositório é `repository`, arquivo é `file`.
- **Arquivo**: Substantivo do conteúdo, sem sufixo técnico, como `session.ts`.

## Verbos de função

Vocabulário fechado. Operação que não cabe usa um verbo novo, que entra nesta tabela.

| Verbo | Contrato |
| --- | --- |
| `get` | Lê e sempre devolve |
| `find` | Pode não achar e devolve `undefined` |
| `fetch` | Chama serviço externo por HTTP (YouTube, GitHub) e devolve o dado lido |
| `require` | Garante o valor ou interrompe com redirect ou exceção (`requireSession`) |
| `create` | Insere |
| `update` | Altera o que já existe |
| `upsert` | Insere ou atualiza |
| `delete` | Apaga |
| `revoke` | Invalida |
| `validate` | Devolve ok ou erro |
| `parse` | Transforma texto em estrutura |
| `build` | Monta um valor sem I/O |
| `is`, `has`, `can` | Devolvem booleano |
| `filter` | Devolve o subconjunto que passa na regra |
| `search` | Devolve o que casa com o texto buscado |

## Resultados

- **Tipo**: Cada operação tem o seu, `<Operação>Result`. Não existe `Result<T, R>` genérico.
- **Campo do erro**: Sempre `reason`, nunca `motivo` nem `error`.
- **Valor do `reason`**: Em português quando sai para a tela ou a URL (`limite-de-janelas`); em inglês quando só vai para o log (`missing-env`, `timeout`).
- **Constraint**: O Service traduz a violação conhecida de uma constraint em Result; o resto sobe como exceção.

## Convenções

- **TDD**: Regra de negócio, cálculo, validação e correção de bug nascem do teste. Antes de escrever o código, siga o ciclo e os critérios de [testing-strategy.md](testing-strategy.md#tdd).
- **Código autoexplicativo**: O código deve ser claro e legível, com nomes de variáveis e funções que indiquem sua finalidade, comentários apenas onde o código não se explica. Função que busca, valida, grava e monta vira uma sequência de passos com nome.
- **Sinal de revisão**: Mais de 30 linhas ou mais de 3 níveis de indentação pede revisão; é sinal, não regra.
- **Helper de uso único**: No mesmo arquivo, sem `export`, abaixo da função principal, e testado por ela.
- **Valor mágico**: Vira constante com nome e unidade (`86400000` vira `MS_PER_DAY`). Condição composta vira variável ou função com nome.
- **Abstração**: Código repetido duas ou mais vezes, só entra se simplificar quem usa. Sem `interface`, factory ou camada extra sem necessidade.

## Checklist

- [ ] Função usa verbo da tabela, ou o verbo novo entrou nela.
- [ ] Toda função exportada é usada ou testada, não exporta função que nunca é chamada.
- [ ] Result com tipo próprio e `reason` no idioma certo.
- [ ] Arquivo sem sufixo técnico.
- [ ] Nenhum comentário de "o quê" nem valor mágico sem nome.
