## Declaração do Problema

Com muitos Stoods, o Usuário não consegue agrupar os que têm algo em comum, como os da mesma prova, do mesmo semestre ou da mesma área. A Biblioteca lista todos os Stoods em ordem alfabética, e encontrar os de um grupo exige lembrar o nome de cada um.

## Solução

O Usuário cria Tags e marca cada Stood com uma ou mais delas, como "Prova", "Semestre 1" ou "Exatas". As Tags são escolhidas no diálogo do Stood, que sugere as Tags existentes e cria uma nova quando o Usuário digita um nome que ainda não existe.

Na Biblioteca, acima da lista de Stoods da barra lateral, o Usuário liga uma ou mais Tags para ver só os Stoods que têm qualquer uma delas. Um botão "Gerenciar Tags" abre um diálogo para criar, renomear e apagar Tags e, ao abrir uma Tag, escolher de uma vez quais Stoods ela marca. As Tags de cada Stood também aparecem nos cartões de "Continuar de onde parou" e na barra do Quadro.

## User Stories

1. Como Usuário, eu quero marcar um Stood com Tags no diálogo do Stood, ao criar ou ao editar, para que eu agrupe meus estudos sem sair do que estou fazendo.
2. Como Usuário, eu quero que o campo de Tags sugira as Tags que já criei enquanto digito, para que eu reutilize a mesma Tag em vez de criar uma parecida.
3. Como Usuário, eu quero criar uma Tag nova digitando um nome que ainda não existe e apertando Enter, para que eu não precise criá-la antes em outro lugar.
4. Como Usuário, eu quero tirar uma Tag de um Stood pelo "x" ao lado dela, para que o Stood deixe o grupo quando ele não fizer mais sentido.
5. Como Usuário, eu quero que as Tags do Stood só mudem quando eu salvar, e que "Cancelar" descarte tudo, para que eu possa experimentar sem medo de mudar algo sem querer.
6. Como Usuário, eu quero filtrar a lista de Stoods da Biblioteca ligando uma ou mais Tags, vendo os Stoods que têm qualquer uma delas, para que eu encontre um grupo de estudos de uma vez.
7. Como Usuário, eu quero ver a lista inteira quando nenhuma Tag está ligada e um aviso quando nenhum Stood tem as Tags ligadas, para que eu entenda o que o filtro está mostrando.
8. Como Usuário, eu quero que a Biblioteca abra sem filtro quando eu chego por um link, mas mantenha o filtro ao recarregar a página, para que eu não ache que um Stood sumiu por causa de um filtro esquecido e não perca o filtro com um F5.
9. Como Usuário, eu quero criar, renomear e apagar Tags num diálogo "Gerenciar Tags" na Biblioteca, para que eu organize minhas Tags num lugar só.
10. Como Usuário, eu quero que renomear uma Tag para um nome que já existe seja recusado, para que duas Tags não acabem misturadas sem eu pedir.
11. Como Usuário, eu quero que apagar uma Tag a tire de todos os Stoods sem apagar nenhum Stood, e que eu seja avisado de quantos Stoods ela marca, para que eu saiba o tamanho da mudança antes de confirmar.
12. Como Usuário, eu quero ver as Tags de um Stood nos cartões de "Continuar de onde parou" e na barra do Quadro, para que eu saiba como cada Stood está organizado.
13. Como Usuário, eu quero que as Tags apareçam sempre em ordem alfabética, para que eu as encontre no mesmo lugar em toda tela.
14. Como Usuário, eu quero ser avisado quando chegar ao limite de Tags de um Stood ou da conta, para que eu entenda por que não consigo adicionar outra.
15. Como Usuário, eu quero abrir uma Tag em "Gerenciar Tags" e marcar ou desmarcar os Stoods dela numa lista, salvando de uma vez, para que eu organize vários Stoods sem abrir o Quadro de cada um.
16. Como Usuário, eu quero ver desativado, com o motivo, o Stood que já tem 10 Tags na lista de uma Tag, para que eu entenda por que não consigo marcá-lo.

## Decisões de Implementação

### Regras do domínio

- **Tag**: Pertence ao Usuário e pode existir sem marcar nenhum Stood, até ser apagada. Um Stood pode ter várias Tags e uma Tag pode marcar vários Stoods.
- **Nome**: De 1 a 30 caracteres depois de aparado nas pontas, sem outras restrições de caractere, e único por Usuário sem diferenciar maiúsculas. A regra fica no Service e também no banco.
- **Limites**: Até 10 Tags por Stood e até 100 Tags por Usuário. O Service recusa com o retorno de falha esperada (`{ ok: false, reason }`) e serializa a gravação por Usuário, para duas abas não passarem do limite juntas.
- **Renomear**: Vale para todos os Stoods marcados. Um nome que já existe é recusado com o motivo de nome repetido; nunca junta duas Tags.
- **Apagar**: Tira a Tag de todos os Stoods e mantém os Stoods. O Service devolve quantos Stoods a Tag marca, para a tela confirmar antes de apagar quando o número é maior que zero.
- **Ordem**: Alfabética sem diferenciar acento nem maiúsculas, com o mesmo critério da lista de Stoods, em toda tela.
- **Sem cor**: Todas as Tags têm a mesma aparência nesta etapa.

### Modelo

- **Tabela de Tags**: Tabela raiz de dado do Usuário, com dono, nome e data de criação. Segue a regra de dono da rule de banco: dono obrigatório com cascade para o Usuário e `UNIQUE (id, owner_id)` como alvo da FK composta da ligação. O nome é único por dono sem diferenciar maiúsculas, num índice sobre o nome em minúsculas, e tem CHECK de tamanho e de espaço nas pontas.
- **Ligação entre Stood e Tag**: Tabela com dono, Stood e Tag, com chave primária no par Stood e Tag. A ligação só aceita Stood e Tag do mesmo dono, amarrados pelas FKs compostas com o dono, e some em cascata quando o Stood, a Tag ou o Usuário é apagado.
- **Migration**: Gerada pelo drizzle-kit só depois que as branches com migration pendente, do Otavio e do Pomodoro, chegarem na `main`, para não colidir a numeração. Até lá, o código que não depende do banco pode ser feito, e uma migration local só para testar é refeita no fim.

### Service de Tag

Um tema novo de Service, sem nada da camada HTTP:

- **Listar Tags do dono**: Devolve as Tags em ordem alfabética, cada uma com quantos Stoods marca, para "Gerenciar Tags" e para a confirmação de apagar.
- **Criar, renomear e apagar Tag**: Com as regras de nome, unicidade e limite acima. A violação do índice único vira o motivo de nome repetido.
- **Marcar os Stoods de uma Tag**: Recebe o dono, a Tag e a lista de Stoods escolhidos em "Gerenciar Tags" e troca as ligações da Tag por essa lista. Stood de outro dono ou id inválido ficam de fora. Se algum Stood que vai ganhar a Tag já tem 10 Tags, recusa a lista inteira com o motivo de limite do Stood, sem mudar nenhum Stood. Usa a mesma trava por Usuário das outras escritas de Tag.
- **Marcar as Tags de um Stood**: Recebe o dono, o Stood e a lista de Tags escolhidas no diálogo, que pode ter Tags existentes, por id, e nomes de Tags novas. Cria as Tags novas, ignora ids de Tags que não existem mais (por exemplo, apagadas em outra aba), troca a ligação do Stood pela lista final e confere os dois limites. Recebe a transação de quem chama, para rodar junto com a gravação do Stood.
- **Regras puras**: Validação do nome da Tag, ordenação e o filtro "qualquer uma" sobre uma lista de Stoods com suas Tags, que o client também usa.

### Service do Stood

- **Criar e editar com Tags**: Criar e editar Stood passam a receber as Tags escolhidas e gravam nome, descrição e Tags numa transação só. Se as Tags forem recusadas, por limite ou nome inválido, nada é gravado, nem o nome nem a descrição.
- **Listas com Tags**: A lista da barra lateral, "Continuar de onde parou" e o Stood do Quadro passam a trazer as Tags de cada Stood, em ordem alfabética, sem N+1: uma consulta das ligações do dono para todos os Stoods da lista.

### Telas

- **Diálogo do Stood**: Ganha o campo de Tags abaixo da descrição. Enquanto o Usuário digita, sugere as Tags do dono que casam com o texto. Enter escolhe a sugestão destacada ou cria a Tag nova, e as escolhidas aparecem embaixo com um "x". Tudo vai no "Salvar" junto com nome e descrição, e "Cancelar" descarta. A mensagem de limite aparece no próprio diálogo.
- **Barra lateral da Biblioteca**: Acima da lista de Stoods, mostra como botões de ligar e desligar só as Tags que marcam algum Stood, mais o botão "Gerenciar Tags". O filtro fica no endereço (`?tags=` com os ids das Tags), que a página lê para filtrar a lista e "Continuar de onde parou": o F5 e o voltar do navegador mantêm o filtro, e os links para a Biblioteca (cabeçalho e "Voltar" do Quadro) abrem sem filtro. Lista vazia pelo filtro mostra "Nenhum Stood com essas Tags", e "Continuar de onde parou" vazio pelo filtro mostra "Nenhum Stood recente com essas Tags".
- **Gerenciar Tags**: Diálogo com a lista de Tags, um campo para criar, edição do nome de cada Tag e o botão de apagar. Clicar no nome de uma Tag abre, na própria linha, a lista de todos os Stoods em ordem alfabética com caixas de marcar, já marcadas para os Stoods que têm a Tag. Nada muda até o "Salvar", e "Cancelar" ou clicar de novo no nome fecha sem salvar. O Stood que já tem 10 Tags, sem esta, aparece com a caixa desativada e "já tem 10 Tags" ao lado. A lista usa os Stoods que a Biblioteca já carregou, sem consulta nova. Apagar uma Tag que marca Stoods pede confirmação com o número de Stoods ("A Tag Prova marca 3 Stoods. Apagar mesmo assim?"). Sem Stood marcado, apaga direto.
- **Cartões e Quadro**: As Tags aparecem nos cartões de "Continuar de onde parou" e na barra do Quadro, junto da descrição, só para ver.
- **Leitura e escrita**: As páginas leem as Tags pelo Service, no Server Component, depois de `requireSession()`, e passam ao componente interativo só os campos que ele usa. Criar, renomear e apagar Tag são Server Actions que validam a entrada com Zod, pegam o dono da sessão e revalidam a Biblioteca. As Actions de criar e editar Stood passam a aceitar as Tags. O dono nunca vem do formulário.

### Dados de exemplo e documentação

- **Seed de desenvolvimento**: Passa a criar Tags como "Prova", "Exatas" e "Semestre 1" e a marcar alguns Stoods de exemplo, sem duplicar ao rodar de novo.
- **CLAUDE.md**: Tira "tags" de "Fora do escopo inicial" e descreve a funcionalidade no Contexto.
- **Política de Privacidade**: Inclui as Tags no conteúdo que o Usuário cria e atualiza `LEGAL_UPDATED_AT`, conforme a rule de LGPD. As Tags são apagadas em cascata com o Usuário.
- **Glossário**: O termo Tag já foi registrado no `docs/GLOSSARY.md` durante o `/grill-me`.

## Decisões de Teste

- **Pontos de teste**: Dois, confirmados com o usuário, ambos de unit tests em `src/lib/` com o Postgres real. Sem teste de integração nem end to end.
- **Tema Tag (novo)**:
  - Criar Tag: grava aparando o nome, recusa nome vazio ou acima de 30 caracteres, recusa nome repetido sem diferenciar maiúsculas, aceita o mesmo nome de outro Usuário e recusa a 101ª Tag do Usuário, inclusive com duas criações simultâneas.
  - Renomear Tag: troca o nome, recusa nome repetido e trata a Tag de outro Usuário como inexistente.
  - Apagar Tag: tira a Tag de todos os Stoods, mantém os Stoods e não apaga a Tag de outro Usuário.
  - Listar Tags: devolve em ordem alfabética, sem diferenciar acento nem maiúsculas, com a contagem de Stoods de cada uma e só as do dono.
  - Marcar os Stoods de uma Tag: troca os Stoods marcados pela lista escolhida, mantém a Tag no Stood que já tem 10 Tags incluindo esta, ignora Stood de outro Usuário e id inválido, recusa a lista inteira quando um Stood novo passaria de 10 Tags e trata a Tag de outro Usuário como inexistente.
  - Marcar as Tags de um Stood: troca a ligação pela lista final, cria as Tags novas, ignora ids que não existem mais, recusa a 11ª Tag do Stood e recusa Tag ou Stood de outro Usuário.
  - Banco: recusa ligação entre Stood e Tag de donos diferentes, recusa nome repetido sem diferenciar maiúsculas e apaga Tags e ligações em cascata com o Usuário.
  - Regras puras: validação do nome e filtro "qualquer uma" (sem Tag ligada mostra todos, com Tags ligadas mostra quem tem qualquer uma, e lista vazia quando ninguém tem).
- **Testes do Stood (já existentes)**:
  - Criar e editar Stood com Tags: grava nome, descrição e Tags juntos, cria a Tag nova só ao salvar e não grava nada quando as Tags são recusadas.
  - Listas: a barra lateral, "Continuar de onde parou" e o Stood do Quadro devolvem as Tags de cada Stood em ordem alfabética.
- **Prior art**: Os testes do Service do Stood, com nome único sem diferenciar maiúsculas, isolamento por dono e recusa por Result, e os testes de concorrência do Pomodoro, em que duas chamadas simultâneas criam um único registro.

## Fora de Escopo

- Cor das Tags.
- Tags em Pastas ou Arquivos.
- Clicar numa Tag no cartão ou no Quadro para abrir a Biblioteca filtrada.
- Filtro que exige todas as Tags ligadas ao mesmo tempo.
- Juntar duas Tags.
- Editar Stood pela Biblioteca, que hoje só tem o diálogo de criar.
- Tags na barra lateral, ao lado de cada Stood.

## Notas Adicionais

- **Ordem das branches**: A branch do Pomodoro também muda o glossário, o CLAUDE.md, a Política de Privacidade e a data `LEGAL_UPDATED_AT`. Ao juntar as duas, os textos se somam, e a data fica a mais recente.
- **Marcar Stood já criado**: Como a Biblioteca não edita Stoods, marcar um Stood já criado exige abrir o Quadro dele e usar o lápis. Se isso incomodar no uso, editar pela Biblioteca vira uma etapa própria.
- **Migration**: A numeração depende da ordem de merge. Gere a migration das Tags só depois que as migrations do Otavio e do Pomodoro estiverem na `main`.
