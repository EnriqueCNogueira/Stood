---
description: TDD, pirâmide de testes, substitutos e convenções com Vitest e Postgres real
paths: ["src/**/*.test.ts", "scripts/**/*.test.ts", "vitest.config.ts"]
---

# Estratégia de testes

> **Quando aplicar:** Ao escrever ou mudar `*.test.ts` ou a config do Vitest, porque teste que não pega bug do nosso código só deixa a suíte lenta.

## TDD

- **Ciclo**: RED (o teste falha pelo motivo certo), GREEN (o mínimo para passar), REFACTOR (os testes seguem verdes).
- **Quando se aplica**: Regra de negócio, cálculo e validação em `src/lib/`, e toda correção de bug.
- **Quando não se aplica**: Componente visual, configuração e código sem regra própria.

## Pirâmide

| Tipo | Quantidade | O que testa |
| --- | --- | --- |
| Unit | A maioria | Uma função de `src/lib/` chamada direto, no caminho feliz |
| Caso de borda | Junto de cada unit | Limite, vazio, dono e concorrência da mesma função |
| Caso de erro | Junto de cada unit | Entrada inválida, recusa, falha de serviço externo e resposta fora do contrato |
| Integração | Rara, só com aprovação explícita | A conexão com outro sistema, como a API do YouTube, chamando o serviço real no CI para garantir que segue funcionando |
| End to end | Rara, só com aprovação explícita | Testa fluxos críticos do sistema, que garantem que as funcionalidades principais funcionam |

- **Unit com banco**: Unit é uma função do Service chamada direto. Ela usa o Postgres real porque a query faz parte da regra, e isso não a torna teste de integração.
- **Aprovação**: Antes de criar teste de integração ou end to end, pergunte ao usuário e diga qual fluxo ele cobre.

## Como roda

- **Banco**: Postgres real de `DATABASE_URL` com `pnpm exec drizzle-kit migrate` aplicado. Sem a env, a primeira query falha: é env faltando, não bug.
- **Comando**: `pnpm test` roda tudo; `pnpm exec vitest run <arquivo>` roda um; `-t "<nome>"` filtra.
- **Limpeza**: A config do Vitest desfaz mock, spy, env e global antes de cada caso (`restoreMocks`, `unstubEnvs`, `unstubGlobals`).

## O que vale teste

- **Pergunta**: Que bug do nosso código esse teste pega? Se a resposta é "framework bugado", o teste não vale.
- **Filtro**: Se a linha quebrar, quem conserta? Next, Drizzle, Zod ou Postgres: não testa. O time: testa.
- **Vale**: Regra que o time escreveu, contrato com serviço externo, sessão, isolamento por dono, constraint do banco, concorrência e borda que já quebrou.
- **Não vale**: Query simples devolvendo a linha, validador pronto do Zod, componente (a regra vai para `src/lib/`), o que o compilador garante, constante e getter.
- **Comportamento**: Chama a função exportada e confere o efeito observável. Refatoração sem mudança de comportamento que quebra o teste mostra que o teste está errado.

## Substitutos

- **Banco real**: O Postgres nunca é mockado: FK, `CHECK`, índice parcial e `ON CONFLICT` só existem nele.
- **Dados do caso**: Cada teste cria o que usa com `db.insert(...)`. Factory só quando o mesmo insert se repete em 2 arquivos ou mais.
- **Serviço externo**: Fora do teste de integração, stub do `fetch` com `vi.stubGlobal`, devolvendo `new Response(...)` com um payload copiado do serviço real, para o Zod validar de verdade.
- **Env**: `vi.stubEnv`, no `beforeEach` ou no próprio caso.
- **Mock**: Só quando a chamada é o comportamento testado, como o corpo enviado ao GitHub, conferido com `toHaveBeenCalledWith`.
- **Relógio**: `vi.useFakeTimers({ toFake: ["Date"] })` com `vi.setSystemTime`. O relógio do Postgres se controla gravando o dado no passado.

## Convenções

- **Estrutura**: Um `describe` por função, com os blocos na ordem da pirâmide: caminho feliz, casos de borda e casos de erro. Bloco sem caso real fica de fora.
- **Um efeito por caso**: Cada `it` confere um comportamento; vários `expect` só se forem do mesmo efeito.
- **Idioma**: Português só em `describe`, `it`, comentário e dado que imita conteúdo real; o resto em inglês.
- **`it.each`**: Testes que só mudam a entrada viram um, com a tabela.
- **Route handler**: Em teste end to end aprovado, importa o handler de `./route` e chama com `NextRequest`, sem subir servidor.

## Anti-patterns

1. Regra de negócio testada pela rota.
2. `vi.mock` de módulo, mock do `db` ou da função testada.
3. Teste sem `expect`, ou `setTimeout` esperando código assíncrono.
4. Assert que conta a tabela inteira ou depende de dado criado por outro teste.
5. Teste de integração ou end to end criado sem aprovação.

## Checklist

- [ ] Teste escrito antes do código, quando o TDD se aplica.
- [ ] Apagando a linha de produção coberta, algum teste falha.
- [ ] Dá para nomear o bug do nosso código que cada teste pega.
- [ ] Casos de borda e de erro cobertos quando há caso real.
- [ ] O arquivo passa sozinho e na suíte inteira, sem depender de ordem, com cada caso abaixo de 500 ms.
