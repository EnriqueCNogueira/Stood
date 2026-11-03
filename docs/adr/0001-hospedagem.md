---
status: accepted
---

# Hospedagem no Cloud Run com banco no Neon

O Stood precisava de um endereço público, de um banco em produção e de um deploy automático. Escolhemos o GCP para o site e o Neon para o Banco de dados, os dois no leste dos EUA, porque cabem no plano gratuito e nos créditos mensais do Google AI Pro e desligam sozinhos quando ninguém está usando.

## Como funciona

- **CI**: O GitHub Actions confere se o código compila, roda as migrations num banco de teste, roda os testes e faz o build em todo pull request.
- **CD**: O GitHub Actions gera a imagem do app, aplica as migrations no banco de produção e publica a versão nova em todo merge em `main`. Antes de liberar a versão para o público, ele testa a rota `/ready`, que confirma se o app alcança o banco. Se algo falhar, o site continua na versão anterior.
- **Configuração no código**: Memória, número de instâncias e quais segredos cada parte usa ficam no `.github/workflows/cd.yml`. O painel do Google guarda só o que é criado uma vez.

## Segurança

- **Nenhuma senha no GitHub**: O GitHub se identifica no Google por um token temporário, e o Google só aceita o token quando ele vem deste repositório e da branch `main`.
- **Cada parte com o mínimo de acesso**: O deploy, o site e as migrations usam contas separadas no Google, e cada uma só enxerga o que precisa.
- **Dois usuários no banco**: As migrations usam um usuário que pode criar e alterar tabelas. O site usa outro, que só lê e grava dados, para que um erro no app não apague uma tabela.
- **Endereços do banco no Google**: As URLs de conexão, que incluem as senhas, ficam no Secret Manager do Google e nunca vão para o repositório.

## Alternativas descartadas

- **Migration ao iniciar o app**: Com duas instâncias subindo juntas, as duas tentariam migrar ao mesmo tempo.
- **Chave de acesso do Google guardada no GitHub**: Se ela vazasse, daria acesso à produção.

## O que considerar

- **Primeiro acesso lento**: Depois de um tempo sem uso, o site e o banco demoram alguns segundos para acordar.
- **Voltar uma versão**: No Cloud Run, aponte o tráfego para a versão anterior. O banco não volta junto, então cada migration precisa funcionar também com a versão anterior do app.
- **Custo**: O limite de 2 instâncias é o teto de gasto. Um orçamento de R$ 5 por mês avisa por e-mail se o uso passar do esperado.
