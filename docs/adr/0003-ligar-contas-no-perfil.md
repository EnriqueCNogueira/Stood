---
status: accepted
---

# Ligar Conta com outro e-mail, só por quem está dentro e entrou há pouco

Entrar por Google ou GitHub com o mesmo e-mail já leva ao mesmo Usuário, como no [ADR 0002](0002-autenticacao.md). O Perfil vai além: quem está conectado pode ligar uma Conta de e-mail diferente, porque muita gente usa um e-mail no GitHub e outro no Stood e, sem isso, acabaria com dois Usuários e os Stoods separados.

Como uma Conta ligada passa a abrir tudo o que é do Usuário, ligar e desligar pedem um login de até 1 dia e geram um aviso no e-mail do Usuário. A Conta é recusada se já entra em outro Usuário ou se o e-mail dela é o de outro Usuário. No sentido contrário, o cadastro recusa um e-mail que já está numa Conta de outro Usuário.

## Opções consideradas

- **Só o mesmo e-mail**: Mais seguro, mas o botão faria o que entrar pelo provedor já faz.
- **Juntar os dois Usuários**: Misturaria Stoods e estudos de duas pessoas, sem volta.
- **Bloquear a ligação automática por e-mail igual**: Recusaria quem hoje entra com senha e com Google.

## Consequências

- O e-mail do Usuário não muda ao ligar uma Conta: avisos e o link de apagar o cadastro vão sempre para ele.
- Desligar uma Conta encerra as outras Sessões, porque o banco não guarda por qual Conta cada uma entrou.
- Desligar uma Conta de e-mail igual ao do Usuário não impede que ela volte: entrar de novo por ela a liga outra vez.
- Sem a recusa pelo e-mail de outro Usuário, quem tem aquele e-mail entraria pelo provedor e cairia nos Stoods de outra pessoa.
