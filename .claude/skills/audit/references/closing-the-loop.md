# Fechando o ciclo: execute, reconcile, issues

O trabalho do consultor não termina no plano. Este arquivo cobre os três fluxos de acompanhamento: despachar um executor e revisar o trabalho dele (`execute`), manter vivo o backlog de planos (`reconcile`) e publicar os planos onde o trabalho é pego (`--issues`).

A regra fundadora continua igual: **o consultor nunca edita código-fonte.** No `execute`, um *subagente executor separado* edita código num git worktree isolado; o consultor despacha, revisa e dá um veredito, como um tech lead que não faz push de commits na sua branch.

---

## `execute <plan>`: despachar e revisar

### Pré-condições (confira todas antes de despachar)

- O repositório é um repositório git (o isolamento por worktree exige isso). Se não for: pare e diga isso.
- O arquivo do plano existe e as dependências dele aparecem como DONE em `plans/README.md`. Se não: pare e nomeie a dependência que falta.
- Rode você mesmo a verificação de drift do plano. Se arquivos do escopo mudaram desde o `Planejado em`, reconcilie o plano primeiro (veja abaixo); não entregue um plano desatualizado a um executor.

### Despacho

Crie **um** subagente `general-purpose` com `isolation: "worktree"`. Modelo do executor: padrão `sonnet`; use o que o usuário nomear, se nomear um (`execute 003 haiku`).

O prompt do subagente deve conter:

1. **O texto completo do arquivo do plano, embutido.** O worktree contém só arquivos commitados: se `plans/` não estiver commitado, o executor não consegue lê-lo. Nunca suponha; sempre embuta.
2. O preâmbulo do executor:

> Você é o executor do plano de implementação abaixo. Siga-o passo a
> passo. Rode todo comando de verificação e confirme o resultado esperado antes
> de seguir. Toque só nos arquivos listados como no escopo. Se qualquer condição
> de parada ocorrer, pare imediatamente e reporte. Não improvise em volta de obstáculos.
> Commite seu trabalho no worktree seguindo a seção de fluxo de git do plano.
> Uma exceção: pule a instrução do plano de atualizar `plans/README.md`;
> seu revisor mantém o índice. Antes de reportar, confira cada afirmação do
> seu relatório contra um resultado real de ferramenta desta sessão: reporte só
> aquilo para o que você consegue apontar evidência; se uma verificação falhou ou foi
> pulada, diga isso claramente. Ao terminar, responda exatamente no formato de
> relatório abaixo.

3. O formato do relatório:

```
STATUS: COMPLETE | STOPPED
STEPS: por passo, feito/pulado + resultado do comando de verificação
STOPPED BECAUSE: (só se STOPPED) qual condição de parada, o que foi observado
FILES CHANGED: lista
NOTES: qualquer coisa que o revisor deva saber (desvios, surpresas, decisões de julgamento)
```

### Revisão (o trabalho real do consultor aqui)

Nota sobre worktrees novos: eles compartilham o histórico do git, mas não `node_modules` nem artefatos de build; o executor precisa instalar as dependências primeiro, e ferramentas de checagem que resolvem a partir de `dist/` podem precisar de um build, mesmo que a tabela de comandos do plano (levantada no reconhecimento da árvore principal) não tenha mencionado. Espere isso; não é um desvio.

Revise como um tech lead revisando um PR contra a spec, sem nunca corrigir nada você mesmo:

1. **Rode de novo todo critério de pronto** no worktree. Não confie no relatório do executor: verifique.
2. **Conformidade com o escopo**: `git -C <worktree> diff --stat` contra a lista do escopo do plano. Qualquer arquivo fora do escopo reprova a revisão, ponto final.
3. **Leia o diff inteiro.** Julgue-o contra "Por que importa" (resolve o problema de verdade?) e contra as convenções do repositório citadas no plano (parece com o resto do codebase?).
4. **Audite os testes novos.** Executores burlam critérios: um teste que não afirma nada significativo passa no `pnpm test` e não prova nada. Leia o que os testes afirmam.

### Veredito

**Desvios documentados são julgados pelo mérito, não bloqueados por reflexo.** O "não improvise" existe para impedir drift silencioso; um executor que bate num obstáculo real (por exemplo, a abordagem do plano quebra mocks de teste existentes), se adapta minimamente e explica isso em NOTES fez a coisa certa. Aprove se a adaptação servir à intenção do plano e ficar no escopo; trate desvios *não documentados* como reprovação na revisão.

| Veredito | Quando | Ação |
|---|---|---|
| **APPROVE** | Critérios passam, escopo limpo, qualidade se sustenta | Atualize o status no índice para DONE. Apresente ao usuário: resumo do diff, caminho e branch do worktree, qualquer coisa de NOTES. **Fazer merge é decisão do usuário: nunca faça merge, push ou commit na branch dele.** |
| **REVISE** | Lacunas corrigíveis | SendMessage para o mesmo executor com feedback específico e acionável ("critério 3 falha: X; o tratamento de erro em `api.ts:90` engole o erro, use o padrão Result conforme o plano"). **No máximo 2 rodadas de revisão**, depois BLOCK. |
| **BLOCK** | Condição de parada atingida, escopo violado sem conserto ou revisões esgotadas | Marque BLOCKED no índice com o motivo. Refine ou reescreva o plano com o que foi aprendido. Diga ao usuário o que aconteceu e o que mudou no plano. |

Rodar comandos de verificação dentro do worktree do executor é permitido: ele é isolado e descartável. A regra de não rodar comandos que alteram protege a working tree do usuário, não o worktree.

---

## `reconcile`: manter `plans/` vivo

Processe o que aconteceu desde a última sessão. Leia `plans/README.md` e todo arquivo de plano, depois, por status:

- **DONE**: confira por amostragem se os critérios de pronto ainda valem no HEAD atual (só os baratos). Marque como verificado no índice. Não apague arquivos de plano: eles são o registro.
- **BLOCKED**: leia o motivo. Investigue o obstáculo de fundo no codebase. Ou reescreva o plano contornando-o (número novo se a abordagem mudou fundamentalmente, atualização no lugar caso contrário) ou marque REJECTED com uma linha de justificativa.
- **IN PROGRESS** (parado): sinalize ao usuário; um executor provavelmente morreu no meio da execução. Confira o worktree, se existir um.
- **TODO**: rode a verificação de drift. Se houve drift: verifique de novo se o achado ainda existe (pode ter sido corrigido de passagem), depois atualize os trechos de "Estado atual" e o SHA de `Planejado em`. Se o achado sumiu, marque REJECTED ("corrigido de forma independente").

Termine com um relatório curto: o que está verificado como feito, o que foi atualizado, o que foi rejeitado e o que pode ser executado agora.

---

## `--issues`: publicar planos como issues do GitHub

Modificador em qualquer invocação de planejamento (`/audit --issues`, `/audit security --issues`). A flag é a autorização do usuário para criar issues: nunca as crie sem ela.

1. Preflight: `gh auth status` funciona e o repositório tem um remote do GitHub. Se qualquer um falhar, escreva os arquivos de plano normalmente e diga por que as issues foram puladas.
2. Checagem de visibilidade: `gh repo view --json visibility`. Se o repositório for **público**, avise o usuário que issues são visíveis publicamente e obtenha confirmação explícita antes de publicar qualquer plano que descreva uma vulnerabilidade de segurança, a localização de uma credencial ou outro achado sensível.
3. Mostre a lista de títulos que vão virar issues; confirme uma vez se for interativo.
4. Por plano: `gh issue create --title "<plan title>" --body-file <plan file>`. Labels: `audit` mais a categoria; aplique só se os labels existirem ou puderem ser criados sem erro; pule os labels em vez de falhar.
5. Registre a URL de cada issue no bloco Status do plano (`- **Issue**: <url>`) e no índice.

O arquivo do plano continua sendo a fonte da verdade; a issue é distribuição. A regra de autocontenção compensa aqui: o corpo da issue não precisa de edição para fazer sentido para quem (ou o que) pegá-la.
