## Declaração do Problema

O Usuário estuda no Stood, mas não tem onde ver o que estudou em cada dia nem onde anotar o que vem pela frente. Provas, entregas e simulados ficam na cabeça ou em outro aplicativo, longe dos Stoods, e uma prova pode chegar sem aviso. O painel da semana do Pomodoro mostra só a semana atual, sem o histórico dia a dia.

## Solução

O Stood ganha uma página de Agenda, aberta por um link no cabeçalho. Ela mostra a grade do mês com o Tempo estudado de cada dia, a partir dos Focos do Pomodoro, e os Compromissos que o Usuário anota, como provas e entregas, ligados ou não a um Stood. Clicar num dia mostra o detalhe dele, com o Tempo estudado por Stood e os Compromissos do dia.

Um Compromisso pode se repetir todo dia, toda semana ou todo mês, como um simulado aos sábados. Cada Ocorrência pode ser alterada ou apagada sozinha, sem mudar as outras.

Na Biblioteca, uma seção "Próximos compromissos" lembra o Usuário do que vem nos próximos 14 dias, com destaque para hoje e amanhã.

## User Stories

1. Como Usuário, eu quero abrir a Agenda por um link no cabeçalho, de qualquer tela, para que eu chegue a ela sem procurar.
2. Como Usuário, eu quero ver a grade do mês, começando no domingo, e navegar para o mês anterior e o seguinte, para que eu veja o passado e o que vem pela frente.
3. Como Usuário, eu quero ver em cada dia da grade o Tempo estudado naquele dia, para que eu perceba meu ritmo de estudo ao longo do mês.
4. Como Usuário, eu quero ver até 2 títulos de Compromissos em cada dia da grade, com "+N" quando houver mais, para que eu saiba de relance o que tem em cada dia.
5. Como Usuário no celular, eu quero ver na grade só o Tempo estudado e a quantidade de Compromissos de cada dia, para que a grade continue legível numa tela estreita.
6. Como Usuário, eu quero que a Agenda abra com o dia de hoje escolhido e mostre o detalhe dele ao lado da grade (no celular, abaixo), para que eu veja na hora o que tenho hoje.
7. Como Usuário, eu quero ver no detalhe do dia o Tempo estudado em cada Stood, para que eu saiba o que estudei naquele dia.
8. Como Usuário, eu quero ver no detalhe do dia os Compromissos em ordem (primeiro os de dia inteiro, depois por horário), cada um com o Stood ao lado, para que eu entenda como o dia vai acontecer.
9. Como Usuário, eu quero criar um Compromisso com título, dia, horário opcional e Stood opcional, já com o dia escolhido preenchido, para que eu anote uma prova ou entrega em poucos passos.
10. Como Usuário, eu quero editar um Compromisso clicando nele, e apagá-lo com confirmação, para que eu corrija ou remova o que mudou.
11. Como Usuário, eu quero que um Compromisso se repita todo dia, toda semana (em um ou mais dias da semana) ou todo mês, até uma data final opcional, para que eu anote uma vez o simulado de todo sábado.
12. Como Usuário, eu quero que um Compromisso mensal no dia 31 apareça no último dia dos meses mais curtos, para que ele não suma em vários meses do ano.
13. Como Usuário, eu quero ver cada Ocorrência de um Compromisso recorrente no seu dia, com um ícone de repetição, para que eu distinga o que se repete do que é único.
14. Como Usuário, eu quero escolher entre "Só esta" e "Todas" ao mexer numa Ocorrência, para que eu mude o simulado de um sábado sem mudar os outros.
15. Como Usuário, eu quero mudar o título, o dia, o horário e o Stood de uma Ocorrência, ou apagá-la, sem afetar as outras, para que eu ajuste uma semana diferente.
16. Como Usuário, eu quero que mudar a série inteira preserve as Ocorrências que eu já mudei à mão, e que eu seja avisado antes de mudar a repetição quando isso for descartar essas mudanças, para que eu não perca ajustes sem saber.
17. Como Usuário, eu quero que os Compromissos e as Ocorrências passados continuem na Agenda, para que eu reveja quando foi cada prova.
18. Como Usuário, eu quero ver na Biblioteca os próximos 3 Compromissos dos próximos 14 dias, com "hoje", "amanhã" ou "em N dias", o Stood ao lado e destaque para hoje e amanhã, para que eu não seja pego de surpresa.
19. Como Usuário, eu quero que um Compromisso recorrente apareça na Biblioteca só pela próxima Ocorrência, para que ele não ocupe a lista inteira.
20. Como Usuário, eu quero que a seção da Biblioteca suma quando não tenho Compromissos nos próximos 14 dias, para que ela não ocupe espaço à toa.
21. Como Usuário, eu quero clicar num Compromisso da Biblioteca e vê-lo na Agenda, no dia dele, para que eu não precise procurá-lo na grade.
22. Como Usuário, eu quero ser avisado ao chegar ao limite de 500 Compromissos, para que eu entenda por que não consigo criar outro.

## Decisões de Implementação

### Regras do domínio

- **Compromisso**: Pertence ao Usuário. Tem título de 1 a 100 caracteres, aparado nas pontas, um dia e um horário opcional; sem horário, vale o dia inteiro. Pode estar ligado a um Stood do mesmo dono ou a nenhum. Não tem tipo nem duração de vários dias.
- **Stood apagado**: Hoje o Stood não tem essa opção. Quando ela existir, o Compromisso continua existindo sem Stood; a etapa de apagar Stood decide como ele aparece.
- **Dias e fuso**: Os dias da Agenda seguem o horário de Brasília, como a semana do Pomodoro. Um Foco conta no dia em que começou, e o Foco em andamento fica fora do Tempo estudado do dia, com as mesmas regras do painel da semana. A Agenda aceita os anos de 1900 a 2199: dia fora disso é recusado no Compromisso, e mês fora disso no endereço abre em hoje.
- **Grade**: Começa no domingo só na aparência. A semana do Pomodoro, do Tempo estudado e da Meta semanal continua de segunda a domingo.
- **Compromisso recorrente**: Repete todo dia, toda semana (em um ou mais dias da semana, começando marcado no dia da semana do dia de início) ou todo mês (no mesmo número de dia), sem intervalo como "a cada 2 semanas". Começa no dia de início e vai até uma data final opcional, que não pode ser antes do início; sem data final, repete sem fim. Na repetição mensal, um dia que não existe no mês cai no último dia daquele mês.
- **Ocorrência**: Cada dia em que um Compromisso recorrente aparece. Uma Ocorrência pode ser mudada (título, dia, horário e Stood) ou apagada sozinha. Uma Ocorrência movida aparece no novo dia, mesmo que ele fique depois da data final, porque a data final só limita as Ocorrências que a própria repetição cria. Se a série for encurtada, a Ocorrência mudada que ficou depois da nova data final continua na Agenda e ainda pode ser mudada ou apagada sozinha.
- **"Só esta" e "Todas"**: Ao editar ou apagar uma Ocorrência, o Usuário escolhe entre as duas; não existe "Esta e as seguintes". "Todas" muda a série e leva para ela só o que o Usuário mudou no formulário: o título, o horário e o Stood que são só daquela Ocorrência não vão para as outras, e o dia de início da série não muda. Mudanças só de título, horário, Stood ou data final preservam as Ocorrências mudadas ou apagadas à mão. Mudanças na repetição (tipo, dias da semana ou dia de início) descartam essas mudanças, e a tela avisa antes de salvar. Apagar "Todas" apaga a série e as mudanças.
- **Passado**: Compromissos e Ocorrências passados continuam na Agenda, sem destaque.
- **Limite**: Até 500 Compromissos por Usuário; um Compromisso recorrente conta como 1, e as mudanças em Ocorrências não contam.
- **Próximos compromissos**: Até 3, nos próximos 14 dias a partir de hoje, do mais próximo ao mais distante (no mesmo dia, primeiro os de dia inteiro, depois por horário). Um Compromisso de hoje fica na lista até o fim do dia, mesmo depois do horário. Um Compromisso recorrente entra só pela próxima Ocorrência.

### Modelo

- **Tabela de Compromissos**: Tabela raiz de dado do Usuário, com dono, título, dia (data sem fuso, no horário de Brasília), horário opcional (hora sem fuso) e Stood opcional. A ligação com o Stood usa a FK composta com o dono, como o Foco, com `ON DELETE SET NULL` só do Stood, escrita à mão no fim da migration, conforme a regra "Pai opcional" da rule de banco. Apagar o Usuário apaga os Compromissos em cascata.
- **Repetição no próprio Compromisso**: Colunas da regra de repetição (nenhuma, diária, semanal ou mensal), os dias da semana da repetição semanal e a data final opcional. Um Compromisso comum tem repetição nenhuma. As Ocorrências não viram linhas: são calculadas a partir da regra na leitura, o que permite repetição sem fim.
- **Mudanças em Ocorrências**: Tabela filha do Compromisso, com dono, Compromisso, o dia original da Ocorrência, se ela foi apagada e, se foi mudada, os novos título, dia, horário e Stood. Uma linha por Ocorrência mudada ou apagada, única por Compromisso e dia original, apagada em cascata com o Compromisso.
- **Restrições no banco**: Tamanho do título, data final não anterior ao dia de início, dias da semana preenchidos só na repetição semanal e coerência entre "apagada" e os campos de mudança.
- **Migration**: A branch parte das Tags, então a migration é a `0007`, depois da `0006` das Tags.

### Service da Agenda

Um tema novo de Service, com a regra separada das queries:

- **Regras puras**: Calcular as Ocorrências de um Compromisso num intervalo de dias (diária, semanal, mensal com ajuste de fim de mês, data final), aplicar as mudanças e as Ocorrências apagadas, ordenar os Compromissos de um dia, achar a próxima Ocorrência a partir de hoje e montar o texto "hoje", "amanhã" ou "em N dias". O client também usa a ordenação e os textos.
- **Mês da Agenda**: Recebe o dono e o mês. Devolve, para cada dia do mês, o Tempo estudado do dia e os Compromissos e Ocorrências daquele dia, e, para o dia escolhido, o Tempo estudado por Stood. Lê Focos, Compromissos e mudanças do dono numa quantidade fixa de consultas, sem N+1.
- **Criar, editar e apagar Compromisso**: Com as regras de título, dia, horário, Stood do dono, repetição e limite. Editar e apagar recebem o escopo ("só esta", com o dia original da Ocorrência, ou "todas") e devolvem o retorno de falha esperada (`{ ok: false, reason }`) quando algo é recusado. Editar "todas" com mudança de repetição apaga as mudanças em Ocorrências na mesma transação. Criar, editar e apagar usam a mesma trava por Usuário, para duas abas não gravarem por cima uma da outra.
- **Próximos compromissos**: Recebe o dono e devolve até 3 itens para a Biblioteca, já com a próxima Ocorrência de cada Compromisso recorrente.

### Telas

- **Cabeçalho**: Um link "Agenda" ao lado do menu da conta, para quem entrou. A rota `/agenda` entra no `matcher` do middleware.
- **Página da Agenda**: Grade do mês, com cabeçalho do mês e botões de anterior e seguinte. O mês e o dia escolhido ficam no endereço da página, para recarregar sem perder a posição. Hoje tem destaque na grade.
- **Célula do dia**: No computador, o Tempo estudado e até 2 títulos com "+N"; no celular, o Tempo estudado e um marcador com a quantidade de Compromissos. Ocorrências levam o ícone de repetição.
- **Detalhe do dia**: Ao lado da grade, ou abaixo no celular, com o Tempo estudado por Stood, os Compromissos em ordem com o Stood ao lado e o botão "Novo Compromisso" com o dia preenchido.
- **Diálogo do Compromisso**: Título, dia, horário opcional, Stood opcional entre os Stoods do Usuário e repetição (nenhuma, diária, semanal com escolha dos dias, mensal) com data final opcional. Ao salvar ou apagar uma Ocorrência, pergunta "Só esta" ou "Todas". Mudar a repetição de uma série com Ocorrências mudadas mostra o aviso de que essas mudanças serão descartadas. Apagar pede confirmação.
- **Biblioteca**: Seção "Próximos compromissos" acima de "Continuar de onde parou", com destaque laranja para hoje e amanhã e o link "Ver Agenda". Cada linha inteira é um link que mostra o Compromisso na Agenda, no mês e no dia em que ele aparece, sem abrir o diálogo dele. A seção não aparece sem Compromissos nos próximos 14 dias.
- **Leitura e escrita**: As páginas leem pelo Service no Server Component, depois de `requireSession()`, e passam ao componente interativo só os campos usados. Criar, editar e apagar são Server Actions que validam a entrada com Zod, pegam o dono da sessão e revalidam a Agenda e a Biblioteca. O dono nunca vem do formulário.

### Documentação no mesmo PR

- **CLAUDE.md**: Tira a Agenda de "Fora do escopo inicial" e descreve a funcionalidade no Contexto.
- **Política de Privacidade**: Inclui os Compromissos (título, dia, horário, Stood e repetição) no conteúdo do Usuário e atualiza `LEGAL_UPDATED_AT`, conforme a rule de LGPD. Os Termos também citam os Compromissos em "Seu conteúdo".
- **Glossário**: Agenda, Compromisso, Compromisso recorrente e Ocorrência já foram registrados no `/grill-me`.
- **Seed de desenvolvimento**: Cria alguns Compromissos de exemplo nas próximas semanas, um deles recorrente, sem duplicar ao rodar de novo.

## Decisões de Teste

- **Ponto de teste único**: Unit tests do tema Agenda em `src/lib/`, confirmados com o usuário. Sem teste de integração nem end to end.
- **Regras puras**:
  - Ocorrências: repetição diária, semanal em um e em vários dias, mensal, mensal no dia 31 em fevereiro (ano comum e bissexto), abril e junho, data final, sem data final dentro de um intervalo, nenhuma Ocorrência antes do dia de início.
  - Mudanças: Ocorrência apagada some, Ocorrência mudada aparece no novo dia com os novos dados, Ocorrência movida para depois da data final continua aparecendo.
  - Ordem do dia: dia inteiro antes dos horários, horário crescente, empate por título.
  - Próxima Ocorrência e textos: hoje, amanhã, em N dias, Compromisso de hoje depois do horário, recorrente entra uma vez só.
  - Endereço do dia na Agenda: leva ao dia, já no mês dele.
  - Anos aceitos: limites de 1900 e 2199 e recusa fora deles.
  - Edição a partir de uma Ocorrência: movida para depois da data final é aceita, data final antes do início da série é recusada e "todas" leva só o que mudou.
- **Service, com Postgres real**:
  - Criar: grava aparando o título, recusa título vazio ou acima de 100, recusa data final antes do início, recusa Stood de outro Usuário, recusa o 501º Compromisso, inclusive com duas criações simultâneas.
  - Editar e apagar: "só esta" cria a mudança da Ocorrência sem afetar as outras; "todas" muda a série e preserva mudanças de Ocorrência quando a repetição não muda; mudar a repetição descarta as mudanças; apagar "todas" leva junto as mudanças; a Ocorrência mudada depois do fim de uma série encurtada pode ser mudada e apagada; editar e apagar esperam a gravação que já começou; Compromisso de outro Usuário é tratado como inexistente.
  - Mês da Agenda: Tempo estudado por dia no horário de Brasília (Foco que começa às 23h50 conta no dia em que começou), Foco em andamento fora da soma, Tempo estudado por Stood no dia escolhido, Compromissos e Ocorrências do mês, isolamento por dono.
  - Próximos compromissos: até 3, só nos próximos 14 dias, próxima Ocorrência do recorrente, nada de outro Usuário.
  - Banco: recusa Compromisso ligado ao Stood de outro Usuário e apaga Compromissos e mudanças em cascata com o Usuário.
- **Relógio**: As funções recebem a data de hoje como parâmetro; nos testes com banco, os Focos são gravados no passado, como nos testes do Pomodoro.
- **Prior art**: Os testes do Service do Pomodoro (semana no horário de Brasília, Foco em andamento, concorrência) e os do Service de Tag (limite por Usuário com trava, isolamento por dono).

## Fora de Escopo

- Lembrete por e-mail ou notificação do navegador; exigiria um agendador externo e serviço novo (ver o ADR de hospedagem sobre o Cloud Run desligar sem uso).
- Visão da semana na Agenda.
- Tipo de Compromisso (Prova, Entrega).
- Compromissos de vários dias.
- Repetição com intervalo ("a cada 2 semanas") e "Esta e as seguintes".
- Compromissos na barra do Quadro.
- Apagar Stood, que ainda não existe, e como o Compromisso sem Stood aparece depois disso.

## Notas Adicionais

- **Fila de PRs**: A Agenda parte da branch das Tags, que parte da do Pomodoro, que parte da do Otavio. A ordem de merge é Otavio, Pomodoro, Tags e Agenda. Mudanças pedidas na revisão de uma branch de baixo precisam ser trazidas para as de cima.
- **Tamanho**: A repetição com "Só esta" é a parte mais trabalhosa. A regra fica em funções puras para os casos de borda serem testados sem banco.
- **Cabeçalho**: O link "Agenda" é o primeiro link de navegação do cabeçalho. Se outras telas principais surgirem, vale pensar num menu de navegação.
