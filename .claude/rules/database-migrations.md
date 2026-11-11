---
description: Schema Drizzle, migrations versionadas, tabelas de Usuário e constraints de dono
paths: ["src/db/**", "drizzle/**", "drizzle.config.ts"]
---

# Banco e migrations

> **Quando aplicar:** Ao mexer em schema ou migration, porque migration errada apaga dado em produção e regra sem constraint quebra na primeira corrida.

## Gerar e aplicar

1. Edite `src/db/schema.ts`.
2. Rode `pnpm exec drizzle-kit generate --name <nome_em_snake_case>`. Ele compara o schema com o último snapshot e não conecta no banco.
3. Leia o `.sql` gerado. Em rename de coluna ou tabela o drizzle-kit pergunta se é rename ou criação: o agente não responde, para e pede para a pessoa rodar o comando, porque a resposta errada vira `DROP` com perda de dado.
4. `pnpm exec drizzle-kit migrate` aplica as migrations no banco de `DATABASE_URL`.

## Fora do drizzle-kit

- **SQL à mão**: O que o drizzle-kit não gera, como trigger e função PL/pgSQL, vai no fim do `.sql` gerado, depois de um `--> statement-breakpoint` e com comentário dizendo que foi escrito à mão, antes de a migration chegar em `main`. O snapshot não acompanha: mudar depois é migration nova escrita à mão.
- **Único com coluna nula**: O drizzle-orm não gera `NULLS NOT DISTINCT` em índice com expressão. Para a unicidade valer também com a coluna nula (raiz do Stood), o `uniqueIndex` do schema usa `coalesce(coluna, NIL_UUID)`, e tudo sai do `generate`.

## Journal e numeração

- **`drizzle/meta/`**: Snapshots e journal são do drizzle-kit. A leitura dos snapshots é bloqueada em `.claude/settings.json`; o `_journal.json` pode ser lido.
- **Conflito de numeração**: Duas branches com o mesmo `000N` colidem no journal. Depois do rebase, desfaça a sua com `pnpm exec drizzle-kit drop` e gere de novo.

## Colunas

- **Datas**: Toda coluna de data é `timestamp` com `withTimezone: true`, em qualquer tabela, para o `defaultNow()` não depender do fuso do servidor.

## Usuário

- **Tabelas da Better Auth**: `users`, `sessions`, `accounts` e `verifications`, no plural e com id uuid, saíram do gerador da lib e são conferidas à mão; coluna nova nelas segue o formato que a lib espera.
- **Usuário e Conta**: `users` tem o e-mail único; cada Conta (Google, GitHub ou e-mail e senha) é uma linha de `accounts`, e o hash da senha mora na Conta `credential`, nunca em `users`.

## Dono

- **Coluna**: Tabela raiz de dado do usuário, como `stoods`, tem `owner_id NOT NULL` referenciando `users.id` com `onDelete: "cascade"`. É a coluna do filtro de [architecture.md](architecture.md#isolamento-por-dono).
- **Filha**: Repete `owner_id NOT NULL` e amarra o dono só pela FK composta `(parent_id, owner_id)` para `(id, owner_id)` do pai, com `UNIQUE (id, owner_id)` no pai e cascade; o cascade a partir de `users` chega pelo pai, sem FK direta.
- **Global**: Conteúdo igual para todos não tem `owner_id`.

## Anti-patterns

1. Escrever em `drizzle/meta/` à mão.
2. FK simples onde a regra pede a composta com `owner_id`.

## Checklist

- [ ] O diff edita ou renomeia algum `.sql` de `drizzle/`? Se sim, ele nunca esteve em `main`?
- [ ] A última entrada de `drizzle/meta/_journal.json` aponta para um `.sql` que existe?
- [ ] Migration nova vem depois da última do journal, sem número repetido e com `when` maior?
- [ ] O `.sql` tem `DROP`? Se sim, é intencional e não rename respondido errado?
- [ ] O SQL escrito à mão está no fim do `.sql`, com comentário, e a migration nunca esteve em `main`?
- [ ] Tabela nova de dado do usuário tem `owner_id` e FK composta com o pai?
- [ ] Coluna de data nova usa `withTimezone: true`?
