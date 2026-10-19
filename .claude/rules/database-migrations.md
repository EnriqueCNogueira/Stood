---
description: Schema Drizzle, migrations versionadas, conta do usuário e constraints de dono
paths: ["src/db/**", "drizzle/**", "drizzle.config.ts"]
---

# Banco e migrations

> **Quando aplicar:** Ao mexer em schema ou migration, porque migration errada apaga dado em produção e regra sem constraint quebra na primeira corrida.

## Gerar e aplicar

1. Edite `src/db/schema.ts`.
2. Rode `pnpm exec drizzle-kit generate --name <nome_em_snake_case>`. Ele compara o schema com o último snapshot e não conecta no banco.
3. Leia o `.sql` gerado. Em rename de coluna ou tabela o drizzle-kit pergunta se é rename ou criação: o agente não responde, para e pede para a pessoa rodar o comando, porque a resposta errada vira `DROP` com perda de dado.
4. `pnpm exec drizzle-kit migrate` aplica as migrations no banco de `DATABASE_URL`.

## Journal e numeração

- **`drizzle/meta/`**: Snapshots e journal são do drizzle-kit. A leitura dos snapshots é bloqueada em `.claude/settings.json`; o `_journal.json` pode ser lido.
- **Conflito de numeração**: Duas branches com o mesmo `000N` colidem no journal. Depois do rebase, desfaça a sua com `pnpm exec drizzle-kit drop` e gere de novo.

## Conta

- **Usuário**: E-mail único. Senha só como hash e opcional, porque login por Google ou GitHub não tem senha. O formato final depende da biblioteca de auth.

## Dono

- **Coluna**: Tabela de dado do usuário tem `owner_id NOT NULL` referenciando `users.id` com `onDelete: "cascade"`. É a coluna do filtro de [architecture.md](architecture.md#isolamento-por-dono).
- **Filha**: Repete `owner_id` e referencia o pai por FK composta `(parent_id, owner_id)` para `(id, owner_id)`, com `UNIQUE (id, owner_id)` no pai.
- **Global**: Conteúdo igual para todos não tem `owner_id`.

## Anti-patterns

1. Escrever em `drizzle/meta/` à mão.
2. FK simples onde a regra pede a composta com `owner_id`.

## Checklist

- [ ] O diff edita ou renomeia algum `.sql` de `drizzle/`? Se sim, ele nunca esteve em `main`?
- [ ] A última entrada de `drizzle/meta/_journal.json` aponta para um `.sql` que existe?
- [ ] Migration nova vem depois da última do journal, sem número repetido e com `when` maior?
- [ ] O `.sql` tem `DROP`? Se sim, é intencional e não rename respondido errado?
- [ ] Tabela nova de dado do usuário tem `owner_id` e FK composta com o pai?
