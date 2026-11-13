---
description: LGPD no Stood: o que a lei exige e como manter coleta, código e Política de Privacidade em acordo
paths: ["src/lib/**", "src/db/**", "drizzle/**", "src/app/privacidade/**", "src/app/termos/**", "src/app/_components/legal-page.tsx"]
---

# LGPD

> **Quando aplicar:** Ao mexer no que o Stood coleta, guarda ou envia a terceiros, porque a Política de Privacidade promete ao Usuário o que o código faz, e a promessa desatualizada descumpre a lei.

## Contexto

- **Lei**: A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) regula o tratamento de dado pessoal, que é qualquer informação que identifica uma pessoa (nome, e-mail, foto, IP, conteúdo que ela cria). A fiscalização é da ANPD.
- **Papéis**: O titular é o Usuário. O controlador decide o tratamento e atende o titular: hoje é `DATA_CONTROLLER`, com o canal `CONTACT_EMAIL`, ambos em `src/app/_components/legal-page.tsx`.
- **Base legal**: Todo tratamento precisa de uma (art. 7º). No Stood é a execução do serviço pedido pelo Usuário (art. 7º, V); finalidade nova fora disso pede outra base, como consentimento.
- **Direitos do titular** (art. 18): Confirmar e acessar os dados, corrigir, apagar, portar e saber com quem são compartilhados.
- **Transferência internacional** (art. 33): Hospedagem e banco ficam fora do Brasil, e a Política diz isso.

## Coleta

- **Mínimo necessário**: Só entra coluna ou campo com dado pessoal que uma funcionalidade usa agora, nunca "para depois".
- **Sem rastreamento**: Analytics, pixel ou cookie que não seja de sessão só com aprovação, porque a Política promete que não há.
- **Dado sensível**: Senha só como hash e token cifrado, como no [CLAUDE.md](../../CLAUDE.md#anti-patterns); dado pessoal e texto de nota nunca vão para log.

## Política de Privacidade em dia

- **Mesmo PR**: Mudança em dado coletado, finalidade, tempo de guarda ou serviço de terceiro (login, hospedagem, banco, e-mail) atualiza `src/app/privacidade/page.tsx` e a data `LEGAL_UPDATED_AT` no mesmo PR.
- **Termos**: Mudança em regra de uso, conteúdo do Usuário ou serviço de terceiro atualiza também `src/app/termos/page.tsx`.
- **Texto real**: A Política descreve o que o código faz hoje, sem prometer controle que não existe.

## Direitos na prática

- **Apagar**: Apagar o Usuário apaga Stoods, Pastas, Arquivos, sessões e contas vinculadas em cascata; tabela nova com dado do Usuário tem FK com `onDelete: "cascade"` para ele.
- **Exportar**: Dado novo do Usuário entra no que a exportação do Stood ou um pedido de acesso consegue entregar.
- **Prazo**: Pedido de acesso completo é respondido em até 15 dias (art. 19), pelo `CONTACT_EMAIL`.

## Checklist

- [ ] Dado pessoal novo tem uso atual e está descrito na Política.
- [ ] Serviço de terceiro novo ou trocado está na seção de compartilhamento da Política.
- [ ] `LEGAL_UPDATED_AT` mudou junto com o texto de Privacidade ou Termos.
- [ ] Tabela nova com dado do Usuário apaga em cascata com ele.
- [ ] Nenhum dado pessoal em log nem cookie novo além do de sessão.
