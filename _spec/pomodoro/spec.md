## Declaração do Problema

O Usuário estuda no Quadro, mas não tem como organizar o estudo em blocos de tempo com descanso nem saber quanto estudou na semana. Sem esse número, ele não percebe se está mantendo o ritmo, não consegue se comprometer com uma quantidade de horas e não vê para quais Stoods o tempo está indo.

## Solução

O Quadro ganha um Pomodoro na barra do Quadro. O Usuário inicia um Foco, que roda pela duração escolhida, faz a Pausa quando o Foco acaba e começa outro Foco quando quiser. Cada Foco conta como Tempo estudado e fica ligado ao Stood em que começou.

Na Biblioteca, um painel mostra o Tempo estudado da semana, a Meta semanal com uma barra de progresso e o Tempo estudado da semana em cada Stood. Quando há um Foco em andamento, o painel avisa e mostra o tempo restante.

O Foco continua mesmo se o Usuário recarregar a página, sair do Quadro ou fechar a aba, e aparece igual em qualquer aba, aparelho ou Stood.

## User Stories

1. Como Usuário, eu quero iniciar um Foco na barra do Quadro, para que eu estude por um tempo definido sem olhar o relógio.
2. Como Usuário, eu quero escolher a duração do Foco e da Pausa, com 25 e 5 minutos como padrão, para que o Pomodoro siga o meu ritmo.
3. Como Usuário, eu quero que as durações e a opção de som fiquem guardadas no meu navegador, para que eu não precise configurá-las a cada visita.
4. Como Usuário, eu quero ouvir um som quando o Foco ou a Pausa acabam, para que eu saiba a hora de parar ou de voltar sem acompanhar o timer.
5. Como Usuário, eu quero desligar o som, para que eu possa estudar em silêncio ou com um Vídeo tocando.
6. Como Usuário, eu quero que a Pausa só comece quando eu clicar, para que eu termine o raciocínio antes de descansar.
7. Como Usuário, eu quero que o próximo Foco só comece quando eu clicar, e poder iniciar um Foco sem fazer a Pausa, para que eu decida quando volto a estudar.
8. Como Usuário, eu quero interromper o Foco, para que eu possa parar quando precisar, contando o tempo que já estudei.
9. Como Usuário, eu quero que um Foco interrompido com menos de 1 minuto não conte, para que um clique sem querer não vire Tempo estudado.
10. Como Usuário, eu quero que o Foco continue se eu recarregar a página, sair do Quadro ou fechar a aba, para que eu não perca o Foco por acidente.
11. Como Usuário, eu quero que um Foco que terminou enquanto eu estava fora conte inteiro, para que o tempo estudado não se perca porque a tela estava fechada.
12. Como Usuário, eu quero ver o mesmo Foco em qualquer aba, aparelho ou Stood, com o nome do Stood em que ele começou, para que eu não conte a mesma hora duas vezes nem me confunda sobre onde o Foco está.
13. Como Usuário, eu quero interromper o Foco a partir de qualquer Stood, para que eu não precise voltar ao Stood em que ele começou.
14. Como Usuário, eu quero que a Pausa continue depois de recarregar a página, para que recarregar não apague meu descanso.
15. Como Usuário, eu quero ver o tempo restante no título da aba enquanto houver um Foco ou uma Pausa, para que eu acompanhe o Pomodoro em outra aba.
16. Como Usuário, eu quero ver na Biblioteca o Tempo estudado da semana, para que eu saiba quanto estudei desde segunda-feira.
17. Como Usuário, eu quero ver na Biblioteca o Tempo estudado da semana em cada Stood, do maior para o menor, para que eu saiba para quais assuntos meu tempo está indo.
18. Como Usuário, eu quero definir, mudar e remover a Meta semanal, para que eu me comprometa com uma quantidade de estudo, ou desista dela, quando quiser.
19. Como Usuário, eu quero ver o progresso do Tempo estudado em relação à Meta semanal numa barra, para que eu saiba se estou perto de cumpri-la.
20. Como Usuário, eu quero ver na Biblioteca que há um Foco em andamento e quanto falta, para que eu não esqueça um Foco rodando quando saio do Quadro.

## Decisões de Implementação

### Regras do domínio

- **Escopo da etapa**: Timer, registro do Tempo estudado, total da semana, Tempo estudado da semana por Stood e Meta semanal. As estatísticas ficam para a etapa seguinte (ver Fora de Escopo).
- **Foco**: Pertence ao Usuário e guarda o Stood em que começou, o horário de início e a duração com que começou. Fica em andamento até ser interrompido ou até passar o horário previsto de fim.
- **Um Foco por vez**: O Usuário tem no máximo um Foco em andamento, em qualquer aba, aparelho ou Stood. Iniciar um Foco com outro em andamento é recusado com o retorno de falha esperada (`{ ok: false, reason }`), e a tela passa a mostrar o Foco que já existe.
- **Fim do Foco**: Um Foco que não foi interrompido termina no horário previsto e conta a duração inteira, mesmo que nenhuma tela estivesse aberta. Não existe processo em segundo plano que encerre o Foco: o fim é calculado a partir do início e da duração sempre que o Foco é lido.
- **Interromper**: Encerra o Foco em andamento e grava o horário em que ele foi interrompido. Se o Foco tinha menos de 1 minuto, ele é descartado e não conta. Não há como congelar e retomar o Foco.
- **Tempo estudado de um Foco**: O tempo entre o início e o fim real, ou seja, a interrupção ou o fim previsto, o que vier primeiro. O Foco em andamento não entra na soma: ele aparece à parte e entra quando termina.
- **Durações**: O Foco aceita de 5 a 120 minutos e a Pausa de 1 a 60, em minutos inteiros, com padrão de 25 e 5 e sem Pausa longa. O limite do Foco também é garantido no banco.
- **Pausa**: Só existe na tela. Não vai para o banco, fica guardada no navegador para sobreviver a recarregar e não aparece em outro aparelho.
- **Semana**: Vai de segunda a domingo, no horário de Brasília para todos os Usuários. O Foco conta inteiro na semana em que começou, mesmo que termine na semana seguinte.
- **Meta semanal**: Uma só por Usuário, guardada no banco. Começa vazia, aceita de 30 minutos a 80 horas em passos de 30 minutos e pode ser removida. Mudar a meta vale para a semana atual e para as próximas, sem histórico. A meta é cumprida com o Tempo estudado de qualquer Stood.
- **Apagar um Stood**: Hoje o Stood não tem essa opção. Quando ela existir, os Focos do Stood continuam contando no Tempo estudado e continuam dizendo em qual Stood foram feitos, com o nome que o Stood tinha ao ser apagado (por exemplo, "Cálculo I: 2 h").

### Modelo

- **Tabela de Focos**: Cada Foco tem dono, Stood (que pode ficar nulo), horário de início, duração em minutos e horário de interrupção (nulo enquanto não houver). A ligação com o Stood usa a FK composta com o dono, como Pasta e Arquivo, para que o Foco só aponte para um Stood do mesmo Usuário. Apagar o Stood anula só o Stood do Foco, mantendo o dono. Apagar o Usuário apaga os Focos em cascata.
- **Nome do Stood apagado**: Esta etapa não guarda o nome do Stood no Foco. A etapa que criar o "apagar Stood" acrescenta ao Foco o nome do Stood e, na mesma transação em que apaga o Stood, copia o nome atual dele para os Focos antes de a ligação ser anulada. Copiar só nesse momento preserva o nome final, mesmo que o Stood tenha sido renomeado depois de os Focos começarem.
- **Restrições no banco**: Duração entre 5 e 120 minutos, e horário de interrupção depois do início e antes do fim previsto.
- **Meta semanal**: Fica numa tabela própria, com uma linha por Usuário e a meta em minutos, apagada em cascata com o Usuário. Ela não vira coluna nova em `users`, porque essa tabela segue o formato da biblioteca de autenticação. Remover a meta apaga a linha. O limite de 30 minutos a 80 horas em passos de 30 minutos também é garantido no banco.
- **Datas**: Todas com fuso, como o resto do schema. A conta da semana converte para o horário de Brasília na hora de somar.
- **Migration nova**: Gerada pelo drizzle-kit depois que outras branches com migration chegarem na `main`, para não colidir a numeração.

### Service do Pomodoro

Um tema novo de Service com a regra e as queries, sem nada da camada HTTP:

- **Iniciar Foco**: Recebe o dono, o Stood e a duração. Confere se o Stood é do dono, serializa por Usuário para que duas abas não iniciem dois Focos ao mesmo tempo e recusa se já houver Foco em andamento.
- **Interromper Foco**: Recebe o dono. Encerra o Foco em andamento, aplicando a regra de 1 minuto. Sem Foco em andamento, devolve falha esperada.
- **Foco em andamento**: Recebe o dono e o horário atual. Devolve o Foco em andamento com o nome do Stood e o fim previsto, ou nada.
- **Resumo da semana**: Recebe o dono e o horário atual. Devolve o Tempo estudado da semana, o Tempo estudado de cada Stood com Foco na semana (do maior para o menor), a Meta semanal e o Foco em andamento.
- **Definir e remover a Meta semanal**: Recebe o dono e a meta em minutos, ou nada para remover.
- **Regras puras do navegador**: Leitura e validação das durações e do som guardados no navegador, voltando ao padrão quando o valor é inválido, no mesmo estilo das preferências do Quadro. Também a leitura da Pausa guardada.

### Telas

- **Barra do Quadro**: Um controle compacto do Pomodoro, sempre visível, com iniciar Foco, iniciar Pausa, Interromper, o tempo restante e o acesso às durações e ao som. Em outro Stood, mostra "Foco em <Stood>".
- **Biblioteca**: Um painel junto de "Continuar de onde parou" com o Tempo estudado da semana, a Meta semanal com barra de progresso, o botão para definir, mudar ou remover a meta, o Tempo estudado de cada Stood e o aviso de Foco em andamento com o tempo restante, sem controles.
- **Título da aba**: Mostra o tempo restante enquanto houver um Foco ou uma Pausa.
- **Leitura**: As páginas do Quadro e da Biblioteca leem o Foco em andamento e o resumo pelo Service, no Server Component, depois de `requireSession()`, e passam ao componente interativo só os campos que ele usa.
- **Escrita**: Iniciar Foco, Interromper e definir ou remover a meta são Server Actions que validam a entrada com Zod, pegam o dono da sessão e chamam o Service. O dono nunca vem do formulário.
- **Abas e aparelhos**: A tela relê o Foco em andamento ao carregar e quando a aba volta a ficar visível. Assim, um Foco iniciado em outro lugar aparece sem atualização em tempo real, e o servidor continua sendo quem garante um Foco por vez.

### Documentação no mesmo PR

- **CLAUDE.md**: Tira o Pomodoro de "Fora do escopo inicial" e descreve a funcionalidade no Contexto.
- **Política de Privacidade**: Acrescenta o Tempo estudado (Focos, com o Stood em que começaram) e a Meta semanal como dados guardados para prestar o serviço, e atualiza `LEGAL_UPDATED_AT`, conforme a rule de LGPD.
- **Glossário**: A seção Pomodoro do `docs/GLOSSARY.md` já foi escrita na etapa de `/grill-me`.

## Decisões de Teste

- **Ponto de teste único**: Unit tests do tema Pomodoro em `src/lib/`, confirmados com o usuário. Sem teste de integração nem end to end.
- **Service, com Postgres real**:
  - Iniciar Foco: grava o Foco no Stood do dono, recusa com Foco em andamento, recusa Stood de outro Usuário, recusa duração fora de 5 a 120 minutos e, em concorrência, duas chamadas simultâneas criam um único Foco.
  - Interromper Foco: grava a interrupção, descarta o Foco com menos de 1 minuto e devolve falha esperada sem Foco em andamento.
  - Foco em andamento: devolve o Foco dentro da duração, deixa de devolver depois do fim previsto e não devolve o Foco de outro Usuário.
  - Resumo da semana: soma Focos encerrados e Focos esquecidos pela duração inteira, deixa de fora o Foco em andamento, divide por Stood do maior para o menor, conta o Foco na semana em que começou (domingo às 23h50 até segunda à 0h15), usa o horário de Brasília na virada de domingo para segunda e não soma Focos de outro Usuário.
  - Meta semanal: define, muda e remove, e recusa valor fora de 30 minutos a 80 horas ou fora dos passos de 30 minutos.
  - Apagar o Usuário apaga Focos e meta em cascata, e apagar a linha do Stood no banco mantém os Focos contando no Tempo estudado.
- **Funções puras**: Leitura das durações e do som com padrão e com valor inválido, e leitura da Pausa guardada.
- **Relógio**: `vi.useFakeTimers({ toFake: ["Date"] })` com `vi.setSystemTime` nas funções puras. No banco, Focos gravados com início no passado.
- **Prior art**: Os testes de Service com banco, isolamento por dono e recusa por Result do Stood, e os testes de leitura de preferências do navegador com padrão e valor inválido do Quadro.

## Fora de Escopo

- Estatísticas pessoais: Tempo estudado de hoje, total desde sempre, histórico de semanas e lista de Focos.
- Apagar ou corrigir um Foco registrado.
- Meta semanal dividida por Stood, com as regras de soma, mudança de meta, Stood apagado e validade por semana.
- Histórico de metas por semana.
- Pausa longa e contagem de ciclos.
- Congelar e retomar um Foco.
- Notificação do navegador, Pausa e Foco que começam sozinhos.
- Pomodoro fora do Quadro (o painel da Biblioteca só mostra, sem controles).
- Fuso horário por Usuário.
- Atualização em tempo real entre abas e aparelhos abertos ao mesmo tempo.
- Apagar um Stood, que ainda não existe no produto, e a cópia do nome do Stood para os Focos, que entra junto com essa opção.

## Notas Adicionais

- **Abas e aparelhos**: A releitura do Foco quando a aba volta a ficar visível foi deduzida da decisão de um Foco por vez em todas as abas e aparelhos. Ela não foi discutida no `/grill-me`. Se o comportamento esperado for atualização imediata nas abas já abertas, a decisão volta para o `/grill-me`.
- **Ordem das migrations**: Se outra branch com migration estiver para entrar na `main`, gere a migration do Pomodoro só depois do merge, para não colidir a numeração no journal do drizzle-kit.
- **Próxima etapa**: As estatísticas e a Meta semanal por Stood dependem dos Focos guardados com o Stood, o que esta etapa já entrega.
- **Etapa de apagar Stood**: Decide como o Stood apagado aparece no painel (por exemplo, "Cálculo I (apagado)"), se um Stood novo com o mesmo nome soma com o apagado ou aparece separado, e atualiza a Política de Privacidade para dizer que o nome de um Stood apagado continua no histórico de Focos.
