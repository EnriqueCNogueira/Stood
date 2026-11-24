## Declaração do Problema

Depois do cadastro, o Usuário não consegue mudar nada do que é dele. O menu do cabeçalho mostra nome, e-mail e foto, mas não deixa corrigir o nome, ver por quais Contas ele entra, trocar a senha sem passar por "esqueci a senha" nem saber onde está conectado. Para corrigir ou apagar os próprios dados, ele precisa escrever um e-mail e esperar.

## Solução

O Stood ganha o Perfil, uma página aberta pelo menu do cabeçalho com cinco seções: Dados, Contas, Senha, Sessões e Apagar.

O Usuário muda o próprio nome, vê cada Conta com o e-mail usado nela, liga e desliga Google e GitHub, troca a senha, se tiver uma, e vê em quais navegadores está conectado, podendo encerrar uma Sessão ou todas as outras. Ele também apaga o próprio cadastro com tudo o que é dele, depois de digitar o e-mail e confirmar por um link que recebe.

As ações que abrem ou destroem o acesso pedem um login recente, e as mudanças de senha e de Contas geram um aviso por e-mail.

## User Stories

1. Como Usuário, eu quero abrir o Perfil pelo menu do cabeçalho, para que eu encontre os meus dados de qualquer tela.
2. Como Usuário, eu quero mudar o meu nome, para que o Stood me chame do jeito certo.
3. Como Usuário, eu quero ver o meu e-mail e a minha foto, para que eu saiba com quais dados estou no Stood.
4. Como Usuário, eu quero que entrar de novo por Google ou GitHub não troque o nome que eu escolhi, para que a minha mudança não se perca.
5. Como Usuário, eu quero ver as Contas que uso para entrar, cada uma com o e-mail usado nela, para que eu saiba qual Google ou GitHub está ligado.
6. Como Usuário, eu quero ligar um Google ou GitHub, mesmo com e-mail diferente do meu, para que eu entre por ele sem criar um segundo Usuário.
7. Como Usuário, eu quero ligar mais de uma Conta do mesmo provedor, para que eu troque o Google antigo pelo novo sem ficar sem entrada.
8. Como Usuário, eu quero que ligar uma Conta que já entra em outro Usuário, ou cujo e-mail é o de outro Usuário, seja recusado com aviso, para que ninguém caia nos Stoods de outra pessoa.
9. Como Usuário, eu quero que o cadastro com um e-mail que já está numa Conta de outro Usuário seja recusado com aviso, para que eu não acabe com dois Usuários.
10. Como Usuário, eu quero desligar um Google ou GitHub depois de confirmar, sabendo que entrar de novo por um e-mail igual ao meu o religa, para que eu decida sem surpresa.
11. Como Usuário, eu quero que a minha última Conta não possa ser desligada, para que eu não fique sem como entrar.
12. Como Usuário, eu quero que desligar uma Conta encerre as minhas outras Sessões, para que quem entrou por ela seja desconectado.
13. Como Usuário com uma Conta só, eu quero uma sugestão para ligar uma segunda, para que eu não perca o Stood se perder o acesso a ela.
14. Como Usuário com senha, eu quero trocá-la informando a atual, encerrando as minhas outras Sessões, para que uma senha descoberta deixe de valer em todo lugar.
15. Como Usuário sem senha, eu quero não ver a seção Senha, para que a tela só mostre o que posso usar.
16. Como Usuário, eu quero ver as minhas Sessões com navegador, sistema e último uso, e qual é a atual, para que eu reconheça uma que não é minha.
17. Como Usuário, eu quero encerrar uma Sessão ou todas as outras, para que eu saia de um computador que não uso mais.
18. Como Usuário, eu quero que ligar e desligar Conta e apagar o cadastro peçam para entrar de novo quando o meu login tem mais de 1 dia, voltando depois ao Perfil, para que um computador destravado não baste para tomar o meu acesso.
19. Como Usuário, eu quero receber um e-mail quando a minha senha muda ou uma Conta é ligada ou desligada, para que eu perceba algo que não fiz.
20. Como Usuário, eu quero pedir para apagar o meu cadastro digitando o meu e-mail, com a sugestão de exportar os Stoods antes, para que eu não apague sem querer.
21. Como Usuário, eu quero confirmar numa página aberta por um link enviado ao meu e-mail, para que só quem tem o meu e-mail e o meu acesso consiga apagar.
22. Como Usuário, eu quero que o link leve a entrar primeiro quando eu o abro onde não estou conectado, para que eu conclua por outro navegador.
23. Como Usuário, eu quero que, ao apagar, tudo o que é meu suma na hora e eu volte à página inicial com um aviso, para que eu tenha certeza de que terminou.
24. Como Usuário, eu quero poder me cadastrar de novo com o mesmo e-mail depois de apagar, para que eu recomece do zero.
25. Como Usuário, eu quero que o cadastro e o Perfil aceitem o mesmo tamanho de nome, para que um nome aceito num não seja recusado no outro.

## Decisões de Implementação

### Regras do domínio

- **Perfil**: A tela em que o Usuário vê e muda os próprios dados, em `/perfil`, numa página só. Não é sinônimo de Usuário.
- **Dados**: Só o nome muda, de 1 a 80 caracteres aparado nas pontas. A mesma regra vale no cadastro com e-mail e senha. O nome que vem do Google ou do GitHub entra como está, e login ou Conta ligada depois não o sobrescrevem. E-mail e foto são só para ver; a foto continua sendo a do provedor, ou a inicial do nome.
- **Contas**: Segue o [ADR 0003](../../docs/adr/0003-ligar-contas-no-perfil.md). Liga e desliga Google e GitHub, inclusive mais de uma Conta do mesmo provedor, nunca a última. A Conta de e-mail e senha aparece só para quem a tem e não pode ser desligada. Provedor que não envia e-mail não é ligado, porque a recusa por e-mail de outro Usuário não teria como ser conferida.
- **Recusa no cadastro**: Um e-mail que já está numa Conta de outro Usuário é recusado em qualquer cadastro, por e-mail e senha ou por provedor, com a mensagem de e-mail já cadastrado que existe hoje.
- **Conta antiga**: A Conta ligada antes desta etapa não tem e-mail guardado até o próximo login por ela. Até lá, aparece sem e-mail e não entra nas recusas por e-mail.
- **Senha**: Só para quem já tem. Pede a atual, aplica a regra de senha forte e encerra as outras Sessões, mantendo a atual. Quem não tem senha não a cria, como no [ADR 0002](../../docs/adr/0002-autenticacao.md).
- **Sessões**: Mostra navegador, sistema, último uso por dia ("hoje", "ontem", "há 5 dias") e qual é a atual, sem IP. Sessão vencida não aparece. Encerra uma ou todas as outras; a atual se encerra por "Sair".
- **Login recente**: Ligar ou desligar Conta e pedir para apagar exigem que a Sessão atual tenha até 1 dia de criada. Passado disso, o botão "Entrar de novo" encerra a Sessão, leva a `/entrar` e volta ao Perfil, e o Usuário repete a ação. Renovar a Sessão não conta como entrar de novo.
- **Avisos**: Trocar a senha e ligar ou desligar uma Conta mandam um e-mail ao e-mail do Usuário com o que mudou, quando e o que fazer se não foi ele. Falha no envio não desfaz a mudança.
- **Apagar**: O botão é "Apagar meu cadastro". O Usuário digita o próprio e-mail, sem diferenciar maiúsculas, e recebe um link de 1 hora e um uso; pedir outro invalida o anterior, e falha no envio aparece na tela. O link abre uma página com o botão final "Apagar tudo", só para o mesmo Usuário conectado; abrir o link não apaga nada. O botão apaga na hora e sem volta, inclusive um Foco em andamento, encerra todas as Sessões e volta à página inicial com "Seu cadastro foi apagado". O mesmo e-mail pode se cadastrar de novo.
- **Autorização no provedor**: Desligar ou apagar remove o que o Stood guarda. A permissão dada no Google ou no GitHub só sai por lá, e a tela diz isso.
- **Limite de tentativas**: Trocar a senha e pedir o link de apagar aceitam 3 tentativas a cada 10 segundos, como entrar com e-mail e senha.

### Modelo

- **E-mail da Conta**: A tabela de Contas ganha o e-mail que o provedor envia, opcional, gravado ao criar ou ligar a Conta e atualizado a cada login por ela. A Conta de e-mail e senha usa o e-mail do Usuário e deixa a coluna vazia. O e-mail é comparado sem diferenciar maiúsculas.
- **Migration**: Parte da `main`, então é a `0010`. Só cria a coluna e o que a busca por e-mail precisar.
- **Apagar**: Usa a cascata que já existe a partir do Usuário, sem tabela nova.

### Login e Service

- **Regras no servidor**: As rotas da biblioteca de login podem ser chamadas fora da tela, então nome, foto, senha forte, Contas e login recente são conferidos no servidor, na configuração do login. Pela rota, a foto não pode ser trocada.
- **Senha fraca**: A regra de senha forte passa a valer também na troca de senha. Hoje ela só é aplicada no cadastro e na redefinição; a correção começa por um teste que falha.
- **Chamada pela tela**: Trocar senha, ligar Conta, desligar Conta e pedir o link de apagar usam o client da biblioteca, porque o limite de tentativas só vale por HTTP, como as telas de login já fazem.
- **Leitura**: O Perfil lê Dados, Contas e Sessões pelo Service, no Server Component, depois de `requireSession()`. O client nunca recebe o token de uma Sessão nem os tokens do provedor: encerrar uma Sessão usa o id dela, e o Service confere que ela é do Usuário.
- **Navegador e sistema**: Uma regra pura lê o texto que o navegador envia e devolve o nome dos dois, ou "Navegador desconhecido" quando não reconhece.
- **Volta depois de entrar**: A tela de entrar passa a aceitar um destino, só entre os caminhos que o Stood conhece, para não mandar o Usuário a outro site.

### Telas

- **Menu do cabeçalho**: Ganha "Perfil", acima de "Sair".
- **Rota**: `/perfil` e a página de confirmar o apagar ficam no grupo protegido e entram no `matcher` do middleware.
- **Contas**: Cada Conta numa linha, com o provedor e o e-mail, e os botões de ligar Google e GitHub. Quem tem uma só vê a sugestão de ligar outra, e o desligar dela aparece desativado com o motivo. Recusa ao ligar volta ao Perfil com a mensagem.
- **Confirmações**: Desligar e encerrar Sessões pedem confirmação num diálogo. O de desligar diz que as outras Sessões serão encerradas e que entrar de novo por um e-mail igual religa a Conta.
- **Apagar**: Última seção, separada das outras, com o aviso de que não dá para desfazer e a sugestão de exportar os Stoods antes.

### Documentação no mesmo PR

- **Política de Privacidade e Termos**: Passam a citar o e-mail de cada Conta, os avisos por e-mail, o apagar pelo próprio Usuário e que a foto do provedor é carregada direto do Google ou do GitHub, que recebem o IP. `LEGAL_UPDATED_AT` muda junto; ela também ficou para trás na remoção do PDF.
- **CLAUDE.md e README**: A descrição de Conta cita o Perfil.
- **Glossário e ADR**: Sessão, Perfil, a nova definição de Conta e o ADR 0003 já foram registrados no `/grill-me`.

## Decisões de Teste

- **Ponto de teste único**: Unit tests do tema de login em `src/lib/`, confirmados com o usuário, com Postgres real e a biblioteca de login chamada direto; Google, GitHub e envio de e-mail simulados. Sem end to end: a tela é conferida no navegador.
- **Dados**: Muda o nome aparando as pontas; recusa vazio e acima de 80, no Perfil e no cadastro; login pelo provedor não sobrescreve o nome; a rota da biblioteca não troca a foto.
- **Contas**:
  - Liga Google e GitHub com e-mail igual e diferente, guarda o e-mail da Conta e mantém o do Usuário.
  - Liga uma segunda Conta do mesmo provedor.
  - Recusa Conta que já entra em outro Usuário, e-mail de outro Usuário e provedor sem e-mail.
  - Recusa o cadastro, por senha e por provedor, com e-mail que está numa Conta de outro Usuário.
  - Desliga e encerra as outras Sessões, mantendo a atual; recusa a última, a Conta de senha e a Conta de outro Usuário.
  - Login por uma Conta antiga preenche o e-mail dela.
- **Senha**: Troca com a atual certa, encerra as outras Sessões e mantém a atual; recusa a atual errada e a nova fraca.
- **Sessões**: Lista só as do Usuário e válidas, marca a atual e não devolve token; encerra uma e todas as outras; não encerra a de outro Usuário. Regra pura do navegador e do sistema, inclusive o não reconhecido, e do último uso por dia.
- **Login recente**: Ligar, desligar e pedir para apagar são recusados com Sessão de mais de 1 dia e aceitos com Sessão nova.
- **Avisos**: Cada mudança manda o e-mail certo ao e-mail do Usuário; falha no envio não desfaz a mudança.
- **Apagar**: Recusa e-mail digitado diferente; o link vence, vale uma vez e o novo invalida o anterior; abrir o link não apaga; recusa outro Usuário e quem não está conectado; apaga em cascata Stoods, Arquivos, Tags, Focos, Meta semanal, Compromissos, Contas e Sessões, sem tocar em outro Usuário; o mesmo e-mail se cadastra de novo.
- **Limite de tentativas**: A quarta tentativa em 10 segundos é recusada na troca de senha e no pedido do link.
- **Destino depois de entrar**: Aceita os caminhos do Stood e descarta endereço de outro site.
- **Prior art**: Os testes do login social (provedor simulado e mesma recusa por código), da troca de senha por link (encerra as outras Sessões) e da Sessão (encerrar na hora).

## Fora de Escopo

- Enviar ou remover a própria foto.
- Trocar o e-mail do Usuário.
- Criar senha para quem só entra por Google ou GitHub, e desligar a Conta de e-mail e senha.
- Baixar todos os dados do Usuário de uma vez e prazo para se arrepender de apagar.
- Mostrar IP ou lugar das Sessões.
- Juntar dois Usuários.
- Estatísticas de estudo e perfil público.
- Retirar a autorização no Google ou no GitHub.

## Notas Adicionais

- **E-mail da Conta na biblioteca**: A documentação pública da Better Auth traz uma forma de guardar o e-mail do provedor em cada Conta. É preciso confirmar que existe na versão instalada, 1.7.15; se não existir, atualizar a biblioteca pede aprovação. `node_modules` não pode ser lido, então a confirmação é por tipo e por teste.
- **Ligar Conta e login recente**: A documentação não diz se a biblioteca exige login recente ao ligar. Se não exigir, a regra entra na nossa configuração.
- **Link de apagar**: O link pronto da biblioteca apaga ao ser aberto, o que contraria a página com o botão final. O link do e-mail aponta para a nossa página, e o botão dela usa o código recebido.
- **Corridas**: As recusas por e-mail conferem e gravam em momentos diferentes. Se duas ações ao mesmo tempo puderem criar a situação recusada, a garantia precisa ficar no banco ou numa trava.
- **Entrega**: Um PR só, com commits separados por assunto.
