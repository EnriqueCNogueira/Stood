---
name: grill-me
description: Uma entrevista implacável para refinar um plano ou design, que também cria docs (ADRs e glossário) ao longo do caminho.
disable-model-invocation: true
---

# Grill me

Entrevista o usuário até um entendimento compartilhado do plano ou design e registra glossário e ADRs ao longo do caminho. **Nunca altera código nem age sobre o plano antes de o usuário confirmar o entendimento.**

As duas disciplinas rodam juntas, na mesma sessão: Grilling conduz a entrevista (passos 1, 2 e 4) e Domain Modeling refina a linguagem e escreve os docs (passo 3) durante as rodadas.

## 1. Mapear a design tree

Entreviste o usuário de forma implacável até chegarem a um entendimento compartilhado. Mapeie isso como uma design tree: cada decisão se ramifica nas decisões que dependem dela.

A frontier é toda decisão cujos pré-requisitos já estão resolvidos: as perguntas que você pode fazer _agora_ sem adivinhar respostas que ainda não ouviu.

- **Outra etapa**: Decisão que só cabe numa etapa futura (biblioteca, serviço ou detalhe que esta etapa não usa) não vira pergunta. Fica registrada como "decide na etapa" e sai da frontier.

## 2. Perguntar em rodadas

Faça a frontier inteira em uma rodada: numere cada pergunta e dê sua resposta recomendada. Depois espere as respostas do usuário antes da próxima rodada.

- **Sem AskUserQuestion**: Exceção deliberada a [skill-pattern.md](../../rules/skill-pattern.md#escrita), porque a frontier passa do limite de 4 perguntas da ferramenta. As perguntas vão em texto.

Formate cada pergunta assim:

```
<n> <título curto>: <descrição curta da pergunta>
- a) ...
- b) ...
...

Recomendação: <qual das opções é a recomendada e por quê>
```

Redija cada pergunta de modo que "sim" aceite sua resposta recomendada.

As perguntas que surgirem do Domain Modeling durante a sessão (conflito de termos, linguagem vaga, contradição com o código, oferta de ADR) seguem o mesmo formato.

Cada rodada que o usuário responde remodela a árvore: decisões resolvidas empurram a frontier para fora e desbloqueiam perguntas que dependiam delas. Recalcule a frontier e faça a próxima rodada. Uma pergunta cuja resposta depende de outra pergunta ainda aberta nesta rodada pertence a uma rodada _posterior_, não a esta.

Descobrir _fatos_ é trabalho seu, nunca do usuário. Quando uma pergunta da frontier precisar de um fato do ambiente (sistema de arquivos, ferramentas etc.), despache um sub-agent para encontrá-lo; não pergunte ao usuário nada que você mesmo poderia pesquisar. Não fique bloqueado nisso: uma exploração em andamento é um pré-requisito não resolvido, então só as perguntas que dependem dela esperam o sub-agent reportar; faça o resto da frontier agora. As _decisões_ são do usuário: apresente cada uma a ele e espere.

## 3. Modelar o domínio

Construa e refine ativamente o domain model do projeto enquanto projeta. Esta é a disciplina _ativa_: questionar termos, inventar cenários de edge case e registrar o glossário e as decisões no momento em que se cristalizam. (Apenas _ler_ o `GLOSSARY.md` para usar o vocabulário não é esta skill: isso é um hábito de uma linha que qualquer skill pode ter. Esta skill é para quando você está mudando o modelo, não apenas consumindo.)

O glossário e os ADRs ficam sempre em `docs/`, na raiz do repositório, e em nenhum outro lugar:

```
/
├── docs/
│   ├── GLOSSARY.md
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

Crie arquivos de forma preguiçosa: só quando tiver algo para escrever. Se não existir `docs/GLOSSARY.md`, crie um quando o primeiro termo for resolvido. Se não existir `docs/adr/`, crie quando o primeiro ADR for necessário.

- **Confronte com o glossário**: Quando o usuário usar um termo que conflita com a linguagem existente no `GLOSSARY.md`, aponte imediatamente. "Seu glossário define 'cancelamento' como X, mas você parece querer dizer Y. Qual dos dois?"
- **Afie a linguagem vaga**: Quando o usuário usar termos vagos ou sobrecarregados, proponha um termo canônico preciso. "Você está dizendo 'conta': quer dizer o Cliente ou o Usuário? São coisas diferentes."
- **Discuta cenários concretos**: Quando relações de domínio estiverem sendo discutidas, teste-as sob pressão com cenários específicos. Invente cenários que sondem edge cases e forcem o usuário a ser preciso sobre as fronteiras entre os conceitos.
- **Cruze com o código**: Quando o usuário afirmar como algo funciona, verifique se o código concorda. Se encontrar uma contradição, exponha: "Seu código cancela Pedidos inteiros, mas você acabou de dizer que cancelamento parcial é possível. Qual está certo?"
- **Atualize o `GLOSSARY.md` na hora**: Quando um termo for resolvido, atualize o `GLOSSARY.md` ali mesmo, sem acumular, no padrão de [GLOSSARY-PATTERN.md](./GLOSSARY-PATTERN.md). O `GLOSSARY.md` deve ser totalmente livre de detalhes de implementação: não é spec, rascunho nem repositório de decisões de implementação. É um glossário e nada mais.
- **Ofereça ADRs com parcimônia**: Só ofereça criar um ADR quando as três condições forem verdadeiras, no padrão de [ADR-PATTERN.md](./ADR-PATTERN.md). Se qualquer uma faltar, pule o ADR.
  1. Difícil de reverter: o custo de mudar de ideia depois é significativo.
  2. Surpreendente sem contexto: um leitor futuro vai se perguntar "por que fizeram assim?".
  3. Resultado de um trade-off real: havia alternativas genuínas e você escolheu uma por motivos específicos.

## 4. Fechar

A sessão termina quando a frontier está vazia: todo ramo da design tree visitado, nada assumido em silêncio. Não aja sobre isso até o usuário confirmar que vocês chegaram a um entendimento compartilhado.

Confirmado o entendimento, sugira `/to-spec` para transformar a conversa na spec da etapa.
