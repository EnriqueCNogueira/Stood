---
status: accepted
---

# Autenticação com Better Auth e sessão no banco

O Stood precisava de login por Google, GitHub e e-mail e senha, com sessão que pode ser encerrada na hora. Escolhemos o Better Auth, porque o Auth.js parou no beta e só recebe correções de segurança, e escrever tudo à mão deixaria com o time um código de segurança difícil de manter.

## Como funciona

- **Sessão no banco**: O cookie guarda só um identificador aleatório, e cada página confere a sessão no banco. Sair ou trocar a senha encerra a sessão na hora, em todos os aparelhos.
- **Um Usuário, várias Contas**: Entrar por Google ou GitHub com o mesmo e-mail leva ao mesmo Usuário, desde que esse e-mail já tenha sido confirmado.
- **E-mail e senha**: O cadastro só libera a entrada depois que a pessoa confirma o e-mail, e quem esquece a senha recebe um link para trocar. Quem entrou por Google ou GitHub não cria senha. A senha precisa ter pelo menos 8 caracteres, com letra maiúscula, número e caractere especial; a biblioteca só confere o tamanho, então essa regra é do Stood.
- **GitHub**: O login pede só a identidade da pessoa. A permissão para publicar repositórios fica para quando essa funcionalidade existir.
- **Endereço próprio**: O site e os e-mails usam o domínio `stood.dev`, ganho por um ano no pacote de estudante do GitHub. O Google e o GitHub só devolvem o login para endereços cadastrados, e o serviço de e-mail só entrega para qualquer pessoa a partir de um domínio próprio. O domínio chega ao Cloud Run pelo mapeamento de domínio do Google, que é grátis.

## Segurança

- **Token do GitHub cifrado**: O banco guarda o token cifrado com a chave da própria biblioteca, derivada do segredo de sessão. Uma chave separada não protegeria mais, porque quem tem o segredo de sessão já entra como qualquer Usuário.
- **Vínculo só com e-mail confirmado**: Sem essa trava, alguém poderia cadastrar o e-mail de outra pessoa com uma senha e ganhar acesso quando ela entrasse pelo Google.
- **Segredos no Google**: O segredo de sessão e as chaves do Google, do GitHub e do envio de e-mail ficam no Secret Manager, como as URLs do banco.

## Alternativas descartadas

- **Sessão em JWT**: Não tem como encerrar uma sessão antes de ela expirar.
- **Vincular Contas sem e-mail confirmado**: Abre o sequestro descrito em Segurança.
- **Chave própria para o token**: Daria mais código para manter sem proteger mais, e a biblioteca regravaria o token sem cifra ao renová-lo.
- **Firebase Hosting na frente do site**: Ele descarta os cookies de login no caminho até o Cloud Run.
- **Balanceador de carga do Google**: Funciona, mas cobra todo mês, e o projeto não tem orçamento para isso.
- **Subdomínio grátis do is-a.dev**: Cada mudança de DNS depende da aprovação de voluntários, sem prazo.

## O que considerar

- **Trocar o segredo de sessão**: Troque mantendo o segredo antigo na lista de segredos da biblioteca. Trocar sem isso desconecta todo mundo e deixa os tokens guardados ilegíveis.
- **Mapeamento em teste**: O mapeamento de domínio do Cloud Run ainda está em Preview, e o Google avisa sobre latência. Se incomodar, trocar pelo balanceador muda só o DNS, não o código.
- **Domínio de um ano**: A renovação do `stood.dev` é paga. Sem renovar, o site volta para o endereço do Cloud Run, os logins precisam ser recadastrados no Google e no GitHub, e o envio de e-mail para.
- **Login do Google em modo de teste**: O app do Google continua "Em teste", o que já deixa qualquer pessoa entrar, porque o Stood só pede nome, e-mail e foto. Para publicar e mostrar o nome "Stood" na tela do Google, o site precisa antes de uma página inicial pública e de uma política de privacidade em `stood.dev`.
- **Id do Usuário**: É um uuid, porque toda tabela de dado do Usuário aponta para ele, e mudar o tipo depois exigiria migrar todas.
