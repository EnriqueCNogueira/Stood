## Declaração do Problema

Depois do cadastro, o Usuário não consegue mudar nada do que é dele. O menu do cabeçalho mostra nome, e-mail e foto, mas não deixa corrigir o nome, ver por quais Contas ele entra, trocar a senha sem passar por "esqueci a senha" nem saber onde está conectado. Para corrigir ou apagar os próprios dados, ele precisa escrever um e-mail e esperar. O Stood também não tem nada de pessoal: chama todos pelo primeiro nome do cadastro e usa a foto do provedor, ou uma inicial.

## Solução

O Stood ganha o Perfil, uma página aberta pelo menu do cabeçalho com cinco seções: Dados, Contas, Senha, Sessões e Apagar.

O Usuário muda o próprio nome, vê cada Conta com o e-mail usado nela, liga e desliga Google e GitHub, troca a senha, se tiver uma, e vê em quais navegadores está conectado, podendo encerrar uma Sessão ou todas as outras. Ele também apaga o próprio cadastro com tudo o que é dele, depois de digitar o e-mail e confirmar por um link que recebe.

O Perfil também é dele: o Usuário escolhe um Apelido, escreve uma Bio, envia uma Foto e marca o Humor do dia, que aparecem na saudação da Biblioteca e no menu do cabeçalho, só para ele.

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
14. Como Usuário com senha, eu quero trocá-la informando a atual, a nova e a confirmação da nova, encerrando as minhas outras Sessões, para que uma senha descoberta deixe de valer em todo lugar e eu não erre ao digitar a nova.
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
26. Como Usuário, eu quero mostrar e esconder o que digito em cada campo da troca de senha, para que eu confira antes de salvar.
27. Como Usuário, eu quero escolher um Apelido opcional, para que o Stood me chame como eu prefiro na saudação e no menu.
28. Como Usuário, eu quero escrever uma Bio curta e opcional, para que eu me veja descrito do meu jeito no menu e no Perfil.
29. Como Usuário, eu quero salvar Foto, nome, Apelido e Bio de uma vez, para que eu não precise de um botão para cada um.
30. Como Usuário, eu quero marcar o meu Humor do dia numa lista pronta, na Biblioteca ou no Perfil, para que o Stood mostre como eu estou hoje.
31. Como Usuário, eu quero que o Humor valha só no dia e que eu possa tirá-lo, para que um Humor antigo não diga o que já não sinto.
32. Como Usuário, eu quero enviar uma Foto com prévia antes de salvar, para que eu veja como ela fica recortada.
33. Como Usuário, eu quero ser avisado quando o arquivo escolhido não serve, mantendo a Foto atual, para que eu escolha outro sem perder nada.
34. Como Usuário, eu quero remover a Foto que enviei, voltando à do provedor ou à inicial, para que eu desfaça a escolha.
35. Como Usuário, eu quero que só eu veja o meu Apelido, a minha Bio, o meu Humor e a minha Foto, para que eles continuem meus.
36. Como Usuário, eu quero apagar cada um deles no Perfil, para que eu use só o que quiser.
37. Como Usuário, eu quero ver os meus Dados sem campos e abrir a edição por um lápis, podendo cancelar, para que a página mostre quem eu sou e só vire formulário quando eu pedir.

## Decisões de Implementação

### Regras do domínio

- **Perfil**: A tela em que o Usuário vê e muda os próprios dados, em `/perfil`, numa página só. Não é sinônimo de Usuário.
- **Dados**: Só o nome muda, de 1 a 80 caracteres aparado nas pontas. A mesma regra vale no cadastro com e-mail e senha. O nome que vem do Google ou do GitHub entra como está, e login ou Conta ligada depois não o sobrescrevem. O e-mail é só para ver.
- **Contas**: Segue o [ADR 0003](../../docs/adr/0003-ligar-contas-no-perfil.md). Liga e desliga Google e GitHub, inclusive mais de uma Conta do mesmo provedor, nunca a última. A Conta de e-mail e senha aparece só para quem a tem e não pode ser desligada. Provedor que não envia e-mail não é ligado, porque a recusa por e-mail de outro Usuário não teria como ser conferida.
- **Recusa no cadastro**: Um e-mail que já está numa Conta de outro Usuário é recusado em qualquer cadastro, por e-mail e senha ou por provedor, com a mensagem de e-mail já cadastrado que existe hoje.
- **Conta antiga**: A Conta ligada antes desta etapa não tem e-mail guardado até o próximo login por ela. Até lá, aparece sem e-mail e não entra nas recusas por e-mail.
- **Senha**: Só para quem já tem. Pede a atual, a nova e a confirmação da nova, aplica a regra de senha forte e encerra as outras Sessões, mantendo a atual. Quem não tem senha não a cria, como no [ADR 0002](../../docs/adr/0002-autenticacao.md).
- **Sessões**: Mostra navegador, sistema, último uso por dia ("hoje", "ontem", "há 5 dias") e qual é a atual, sem IP. Sessão vencida não aparece. Encerra uma ou todas as outras; a atual se encerra por "Sair".
- **Login recente**: Ligar ou desligar Conta e pedir para apagar exigem que a Sessão atual tenha até 1 dia de criada. Passado disso, o botão "Entrar de novo" encerra a Sessão, leva a `/entrar` e volta ao Perfil, e o Usuário repete a ação. Renovar a Sessão não conta como entrar de novo.
- **Avisos**: Trocar a senha e ligar ou desligar uma Conta mandam um e-mail ao e-mail do Usuário com o que mudou, quando e o que fazer se não foi ele. Falha no envio não desfaz a mudança.
- **Apagar**: O botão é "Apagar meu cadastro". O Usuário digita o próprio e-mail, sem diferenciar maiúsculas, e recebe um link de 1 hora e um uso; pedir outro invalida o anterior, e falha no envio aparece na tela. O link abre uma página com o botão final "Apagar tudo", só para o mesmo Usuário conectado; abrir o link não apaga nada. O botão apaga na hora e sem volta, inclusive um Foco em andamento, encerra todas as Sessões e volta à página inicial com "Seu cadastro foi apagado". O mesmo e-mail pode se cadastrar de novo.
- **Apelido**: Opcional, de 1 a 30 caracteres aparado nas pontas, e pode ser igual ao de outro Usuário. A saudação da Biblioteca usa o Apelido inteiro; sem ele, o primeiro nome, como hoje.
- **Bio**: Opcional, até 160 caracteres aparada nas pontas, numa linha só.
- **Humor**: Opcional, escolhido entre oito, cada um com emoji e palavra: 😎 Motivação, 🎯 Concentração, 🥳 Animação, 😌 Tranquilidade, 🤔 Dúvidas, 😴 Cansaço, 😬 Pressão e 😕 Desânimo. São substantivos para não supor o gênero de ninguém, sem texto livre, que poderia virar dado de saúde. Vale só no dia em que foi marcado, no horário de Brasília. Só o último é guardado, sem histórico: vencido, some da tela, e o registro só é trocado quando o Usuário marca outro, ou apagado quando ele tira.
- **Foto**: Opcional, uma por Usuário. Aparece a enviada; sem ela, a do provedor; sem as duas, a inicial. Aceita PNG, JPEG ou WebP de até 5 MB, e o navegador recorta o quadrado do centro, reduz a 256 por 256 e envia um JPEG de até 200 KB. O formato e o tamanho são conferidos de novo, pelos bytes, no servidor e no banco. Remover a enviada volta para a do provedor, que não pode ser escondida nesta etapa.
- **Quem vê**: Apelido, Bio, Humor e Foto são só do próprio Usuário. Nenhuma tela os mostra a outro.
- **Autorização no provedor**: Desligar ou apagar remove o que o Stood guarda. A permissão dada no Google ou no GitHub só sai por lá, e a tela diz isso.
- **Limite de tentativas**: Trocar a senha e pedir o link de apagar aceitam 3 tentativas a cada 10 segundos, como entrar com e-mail e senha.

### Modelo

- **E-mail da Conta**: A tabela de Contas ganha o e-mail que o provedor envia, opcional, gravado ao criar ou ligar a Conta e atualizado a cada login por ela. A Conta de e-mail e senha usa o e-mail do Usuário e deixa a coluna vazia. O e-mail é comparado sem diferenciar maiúsculas.
- **E-mail protegido no banco**: Um gatilho recusa a Conta com o e-mail de outro Usuário e o Usuário com o e-mail de uma Conta alheia, com uma trava pelo e-mail para duas ações ao mesmo tempo.
- **Perfil**: Tabela própria, uma linha por Usuário, com Apelido, Bio, o Humor e o dia em que ele foi marcado, todos opcionais. O banco confere tamanhos, espaço nas pontas, quebra de linha na Bio, o Humor da lista e que Humor e dia andam juntos. Não são colunas da tabela de Usuários, que é da biblioteca de login.
- **Foto**: Tabela própria, uma linha por Usuário, com os bytes e a data em que mudou. O banco confere o tamanho. Não usa a tabela das Imagens, que exige um Arquivo de um Stood.
- **Migrations**: A `0010` traz o e-mail da Conta e o gatilho; a `0011`, o Perfil e a Foto. As duas tabelas novas apagam em cascata com o Usuário.
- **Apagar**: Usa a cascata que já existe a partir do Usuário, sem tabela nova.

### Login e Service

- **Regras no servidor**: As rotas da biblioteca de login podem ser chamadas fora da tela, então nome, foto, senha forte, Contas e login recente são conferidos no servidor, na configuração do login. Pela rota, a foto não pode ser trocada.
- **Senha fraca**: A regra de senha forte passa a valer também na troca de senha. Hoje ela só é aplicada no cadastro e na redefinição; a correção começa por um teste que falha.
- **Chamada pela tela**: Trocar senha, ligar Conta e pedir o link de apagar usam o client da biblioteca, porque o limite de tentativas só vale por HTTP, como as telas de login já fazem. Desligar Conta é uma Server Action, porque precisa da trava por Usuário que protege a última Conta.
- **Rotas desligadas**: As rotas da biblioteca cuja regra fica no Stood, ou que ele não usa, deixam de responder.
- **Leitura**: O Perfil lê Dados, Contas e Sessões pelo Service, no Server Component, depois de `requireSession()`. O client nunca recebe o token de uma Sessão nem os tokens do provedor: encerrar uma Sessão usa o id dela, e o Service confere que ela é do Usuário.
- **Navegador e sistema**: Uma regra pura lê o texto que o navegador envia e devolve o nome dos dois, ou "Navegador desconhecido" quando não reconhece.
- **Service do Perfil**: Um tema novo, fora do login, lê e grava Apelido, Bio, Humor e Foto. A confirmação da senha nova fica só na tela; as demais regras valem no servidor.
- **Foto no navegador**: O recorte e a redução reusam o jeito de redesenhar imagens da exportação, e o formato é conferido pela mesma regra das Imagens. Refazer a imagem costuma tirar os metadados da câmera.
- **Rota da Foto**: Serve os bytes só ao próprio Usuário, com login, sem deixar o navegador adivinhar outro tipo, como a das Imagens. O endereço muda quando a Foto muda, para a nova aparecer na hora.
- **Uma consulta a mais por página**: O cabeçalho lê o Perfil do Usuário uma vez por requisição, sem os bytes da Foto.
- **Volta depois de entrar**: A tela de entrar passa a aceitar um destino, só entre os caminhos que o Stood conhece, para não mandar o Usuário a outro site.

### Telas

- **Menu do cabeçalho**: Mostra a Foto, o Apelido (ou o nome, sem ele), o Humor do dia, a Bio e o e-mail, e ganha "Perfil", acima de "Sair". O nome completo fica só no Perfil.
- **Rota**: `/perfil` e a página de confirmar o apagar ficam no grupo protegido e entram no `matcher` do middleware.
- **Dados, visão**: Tudo centralizado: Foto, nome em destaque, Apelido, Bio, Humor do dia e, por último, o e-mail. Sem campos, descrições nem botão de salvar, e o que está vazio não aparece. O Humor salva ao escolher.
- **Dados, edição**: Um lápis no canto abre a Foto, com prévia e remover, e os campos de nome, Apelido e Bio, com descrição e contador. Um "Salvar" grava tudo, primeiro os textos e depois a Foto; "Cancelar" ou o X descarta. Recusa mantém a edição aberta, com a mensagem no campo.
- **Saudação da Biblioteca**: "Olá, Johny" seguido de um botão com o Humor do dia ou, sem ele, "Como você está hoje?". O botão abre a lista, com a opção de tirar. O leitor de tela lê a palavra do Humor, não o emoji.
- **Senha**: Três campos, atual, nova e confirmação, cada um com um botão de mostrar e esconder. Confirmação diferente mostra a mensagem no campo e não envia nada; depois de trocar, os campos voltam vazios e escondidos.
- **Contas**: Cada Conta numa linha, com o provedor e o e-mail, e os botões de ligar Google e GitHub. Quem tem uma só vê a sugestão de ligar outra, e o desligar dela aparece desativado com o motivo. Recusa ao ligar volta ao Perfil com a mensagem.
- **Confirmações**: Desligar e encerrar Sessões pedem confirmação num diálogo. O de desligar diz que as outras Sessões serão encerradas e que entrar de novo por um e-mail igual religa a Conta.
- **Apagar**: Última seção, separada das outras, com o aviso de que não dá para desfazer e a sugestão de exportar os Stoods antes.

### Documentação no mesmo PR

- **Política de Privacidade e Termos**: Passam a citar o Apelido, a Bio, o Humor e a Foto, com o tempo em que cada um é guardado, o e-mail de cada Conta, os avisos por e-mail, o apagar pelo próprio Usuário e que a foto do provedor é carregada direto do Google ou do GitHub, que recebem o IP. Os Termos ganham a seção sobre apagar o cadastro, e a Política, os prazos em que o banco e o serviço de e-mail ainda guardam cópias. `LEGAL_UPDATED_AT` muda junto.
- **CLAUDE.md e README**: Descrevem o Perfil, com as melhorias.
- **Rule de LGPD**: Passa a apontar onde o e-mail de contato fica hoje.
- **Seed de desenvolvimento**: Fica como está; as melhorias são opcionais e se conferem no navegador.
- **Glossário e ADR**: Sessão, Perfil, Apelido, Bio, Humor, Foto, a nova definição de Conta e o ADR 0003 já foram registrados no `/grill-me`.

## Decisões de Teste

- **Pontos de teste**: Dois, confirmados com o usuário, ambos de unit tests em `src/lib/` com Postgres real. O tema de login cobre Dados, Contas, Senha, Sessões e apagar, com a biblioteca chamada direto e Google, GitHub e envio de e-mail simulados. O tema do Perfil, novo, cobre Apelido, Bio, Humor e Foto. Sem end to end: a tela é conferida no navegador.
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
- **Apelido e Bio**: Grava aparando as pontas, junto com o nome; vazio apaga; recusa acima do limite e quebra de linha na Bio, sem gravar nada dos três; aceita Apelido igual ao de outro Usuário.
- **Humor**: Marca, troca e tira; vale até o fim do dia de Brasília e some depois; recusa o que não está na lista; não muda o de outro Usuário.
- **Foto**: Grava e troca a Foto do próprio Usuário; recusa arquivo vazio, acima do limite e que não é JPEG pelos bytes; remover volta à do provedor; não devolve a Foto de outro Usuário; o endereço muda quando ela muda.
- **Saudação**: Usa o Apelido inteiro e, sem ele, o primeiro nome.
- **Banco**: Recusa tamanho, Humor e dia fora das regras, e apaga o Perfil e a Foto em cascata com o Usuário, no mesmo teste de apagar o cadastro.
- **Limite de tentativas**: A quarta tentativa em 10 segundos é recusada na troca de senha e no pedido do link.
- **Destino depois de entrar**: Aceita os caminhos do Stood e descarta endereço de outro site.
- **Prior art**: Os testes das Imagens (formato pelos bytes, limite e dono), os das Tags (nome aparado e limite) e os da Agenda (dia no horário de Brasília). Os testes do login social (provedor simulado e mesma recusa por código), da troca de senha por link (encerra as outras Sessões) e da Sessão (encerrar na hora).

## Fora de Escopo

- Esconder a foto do provedor sem enviar outra, e ajustar o recorte da Foto à mão.
- Humor com texto livre e histórico de Humores.
- Apelido único, e qualquer tela que mostre Apelido, Bio, Humor ou Foto a outro Usuário.
- Trocar o e-mail do Usuário.
- Criar senha para quem só entra por Google ou GitHub, e desligar a Conta de e-mail e senha.
- Baixar todos os dados do Usuário de uma vez e prazo para se arrepender de apagar.
- Mostrar IP ou lugar das Sessões.
- Juntar dois Usuários.
- Estatísticas de estudo e perfil público.
- Retirar a autorização no Google ou no GitHub.

## Notas Adicionais

- **E-mail da Conta na biblioteca**: A forma pronta da documentação pública da Better Auth não existe na versão instalada, 1.7.15. O e-mail vem de outro gancho documentado, que recebe os dados do provedor, guardado só durante a requisição.
- **Ligar Conta e login recente**: A biblioteca não exige login recente ao ligar; a regra está na nossa configuração.
- **Link de apagar**: O link pronto da biblioteca apaga ao ser aberto, o que contraria a página com o botão final. O link do e-mail aponta para a nossa página, e o botão dela usa o código recebido.
- **Estado**: Tudo implementado, inclusive o que veio na segunda entrevista (Apelido, Bio, Humor e Foto).
- **Entrega**: Um PR só, com commits separados por assunto.
