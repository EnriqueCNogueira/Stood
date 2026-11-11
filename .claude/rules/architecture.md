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
├── .github/workflows/             CI em todo PR e CD em push para main
├── _spec/                         spec de cada etapa, criada por /to-spec
├── docs/                          GLOSSARY.md e adr/, criados por /grill-me
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
│   ├── components/                View compartilhada: classes de ui.ts, cabeçalho
│   ├── db/                        Model
│   │   ├── index.ts               conexão
│   │   └── schema.ts
│   ├── lib/                       Service
│   │   ├── <tema>/
│   │   │   ├── <arquivo>.ts       backend
│   │   │   └── <arquivo>.test.ts
│   │   └── env.ts                 env validada com Zod na primeira leitura
│   ├── test/                      helpers usados por mais de um teste
│   └── middleware.ts              confere se há cookie de sessão
├── CLAUDE.md
├── README.md
├── package.json
├── Dockerfile
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
└── vitest.config.ts
```
- **Rota**: Em português, sob `(protected)/` quando exige login; rota nova do grupo entra no `matcher` de `src/middleware.ts`, porque o grupo não aparece na URL.

## Leitura e escrita

- **Leitura**: No Server Component que usa o dado, chamando o Service direto. Sem endpoint interno.
- **Route handler**: Em `route.ts`, junto da rota que o usa, como export e callback de OAuth.
- **Para o client**: A página passa ao `"use client"` só os campos que a tela usa.
- **Exceção `/ready`**: `src/app/ready/route.ts` faz `SELECT 1` direto e não chama `requireSession()`, porque é a checagem pública do CD; não serve de modelo para outra rota.
- **Exceção auth**: As telas de entrar, cadastro e senha chamam `/auth/*` pelo client da Better Auth (`src/lib/auth/client.ts`), porque o rate limit da lib só vale por HTTP; as regras do Stood ficam na config de `src/lib/auth/auth.ts`.

## Server e client

- **Importa `server-only`**: `src/db/index.ts`, `src/lib/env.ts` e todo arquivo de `src/lib/` que faz query, lê segredo ou usa token começam com `import "server-only";`, para o build falhar se um `"use client"` importar o arquivo, mesmo indiretamente.
- **Não importa**: `src/db/schema.ts`, tipos e funções puras que o client também usa (schema Zod, `build*`, `is*`), e a View, que o Next já separa.
- **Fronteira**: O `"use client"` não importa de `src/db/` nem de Service marcado; recebe dado por props, como em [Leitura e escrita](##leitura-e-escrita), e grava por Server Action (`"use server"`), que chama o Service.

## Isolamento por dono

- **Filtro obrigatório**: Toda query de dado do usuário filtra pelo `user.id` de `requireSession()`: `where(eq(t.ownerId, user.id))`.
- **Busca por id**: `and(eq(t.id, id), eq(t.ownerId, user.id))`. Não achou, `notFound()`: a resposta não revela que o registro existe para outro dono.
- **Id de pai**: Stood, Pasta ou Arquivo recebido na entrada é conferido contra o dono antes de gravar.
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
- [ ] Arquivo com query, segredo ou token começa com `import "server-only";`.
- [ ] Nenhuma query dentro de laço.
- [ ] Rota nova de `(protected)/` está no `matcher` do middleware.
