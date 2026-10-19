---
description: Camadas, estrutura do repositório, leitura e escrita, isolamento por dono e uso do ORM
paths: ["**/*.ts", "src/**/*.tsx"]
---

# Arquitetura

> **Quando aplicar:** Ao criar ou mover código, porque regra no lugar errado fica sem teste e sem guarda.

## Camadas

- **View**: Camada externa do sistema: o que o usuário vê (página, layout, componente) e o que fala com o mundo de fora (route handler, Server Action, endpoint). Não tem regra de negócio nem query: só valida a entrada com Zod, chama o Service e monta a resposta.
- **Service**: Função de `src/lib/<tema>/`, a camada testável onde ficam a regra de negócio, os cálculos e as queries Drizzle. Recebe dado limpo (`userId`, ids, objetos), nunca `Request`, `cookies()` nem `FormData`.
- **Model**: `src/db/schema.ts`, que define com Drizzle as tabelas, colunas e constraints do banco e é a fonte das migrations.
- **Direção**: `src/lib/` e `src/db/` não importam de `src/app/`.

## Estrutura do repositório

```
.
├── .claude/                       rules e skills do agente de código
├── drizzle/                       migrations versionadas e meta/ do drizzle-kit
├── scripts/                       scripts rodados por pnpm
├── src/
│   ├── app/                       View
│   │   ├── (protected)/           rotas que exigem login
│   │   │   ├── <rota>/
│   │   │   │   ├── page.tsx       frontend
│   │   │   │   └── route.ts       route handler, quando a rota precisa de HTTP
│   │   │   └── layout.tsx         layout do sistema, que chama requireSession()
│   │   ├── auth/                  rotas que a biblioteca de auth exigir
│   │   ├── entrar/                login
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── db/                        Model
│   │   ├── index.ts               conexão
│   │   └── schema.ts
│   ├── lib/                       Service
│   │   └── <tema>/
│   │       ├── <arquivo>.ts       backend
│   │       └── <arquivo>.test.ts
│   └── middleware.ts              confere se há cookie de sessão
├── CLAUDE.md
├── README.md
├── package.json
├── Dockerfile
├── compose.yaml                   Postgres local para dev e teste
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
└── vitest.config.ts
```
- **Rota**: Em português, sob `(protected)/` quando exige login.

## Leitura e escrita

- **Leitura**: No Server Component que usa o dado, chamando o Service direto. Sem endpoint interno.
- **Route handler**: Em `route.ts`, junto da rota que o usa, como export e callback de OAuth.
- **Para o client**: A página passa ao `"use client"` só os campos que a tela usa.

## Isolamento por dono

- **Filtro obrigatório**: Toda query de dado do usuário filtra pelo `user.id` de `requireSession()`: `where(eq(t.ownerId, user.id))`.
- **Busca por id**: `and(eq(t.id, id), eq(t.ownerId, user.id))`. Não achou, `notFound()`: a resposta não revela que o registro existe para outro dono.
- **Id de pai**: Repositório, pasta, estudo ou arquivo recebido na entrada é conferido contra o dono antes de gravar.
- **Sessão inválida**: Sessão ilegível ou expirada redireciona para `/entrar`, nunca segue como anônima.

## ORM

- **N+1 é bloqueante**: Use `innerJoin` ou `inArray`, nunca query dentro de laço.
- **Colunas**: `select({ ... })` só com o que a regra usa, e `.limit(1)` quando espera uma linha.
- **Lote**: `insert().values([...])` e `update().where(...)` num comando só.
- **Transação**: `db.transaction` quando mais de uma escrita precisa ser atômica; quem roda dentro recebe `tx` como primeiro parâmetro.
- **Concorrência**: `.for("update")` para serializar e `onConflictDoNothing` ou `onConflictDoUpdate` para upsert idempotente.

## Checklist

- [ ] Nenhuma query em página, layout, route handler ou Server Action.
- [ ] Toda query de dado do usuário filtra pelo dono da sessão.
- [ ] Busca por id combina id e dono e responde `notFound()` quando não acha.
- [ ] O `"use client"` recebe só os campos que usa.
- [ ] Nenhuma query dentro de laço.
