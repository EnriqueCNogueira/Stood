# Modelo de plano de handoff

Todo plano é escrito para um modelo executor com **zero contexto**: ele não viu a sessão do consultor, a auditoria, os outros planos nem qualquer conversa anterior. Pode ser um modelo menor/mais barato. Suponha que ele é competente em seguir instruções explícitas e fraco em preencher lacunas, se recuperar de ambiguidade ou saber quando parar.

Três propriedades tornam um plano executável por um modelo mais fraco:

1. **Contexto autocontido**: tudo o que é necessário está no arquivo: caminhos, trechos de código, convenções, comandos.
2. **Portões de verificação**: todo passo termina com um comando e o resultado esperado. O executor nunca precisa *julgar* se teve sucesso.
3. **Limites rígidos e saídas de emergência**: lista explícita do que está fora do escopo e condições de "pare e reporte" em vez de deixar o modelo improvisar quando a realidade não bate com o plano.

Nome do arquivo: `plans/NNN-short-slug.md`, numerado na ordem de execução recomendada.

---

## Modelo

```markdown
# Plano NNN: <Título no imperativo: o que será verdade depois deste plano>

> **Instruções ao executor**: Siga este plano passo a passo. Rode todo
> comando de verificação e confirme o resultado esperado antes de ir para o
> próximo passo. Se qualquer item da seção "Condições de parada" ocorrer, pare e
> reporte; não improvise. Ao terminar, atualize a linha de status deste plano
> em `plans/README.md`, a menos que um revisor tenha despachado você e dito que
> ele mantém o índice.
>
> **Verificação de drift (rode primeiro)**: `git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`
> Se algum arquivo do escopo mudou desde que este plano foi escrito, compare os
> trechos de "Estado atual" com o código vivo antes de continuar; se não
> baterem, trate como uma condição de parada.

## Status

- **Prioridade**: P1 | P2 | P3
- **Esforço**: S | M | L
- **Risco**: LOW | MED | HIGH
- **Depende de**: plans/NNN-*.md (ou "nenhum")
- **Categoria**: bug | security | perf | tests | tech-debt | migration | dx | docs | direction
- **Planejado em**: commit `<short SHA>`, <YYYY-MM-DD>
- **Issue**: <URL da issue do GitHub, só quando publicado via `--issues`; omita caso contrário>

## Por que importa

2 a 5 frases. O problema, seu custo concreto e o que melhora quando isto
entrar. Escrito para que o executor (e um revisor humano) entenda a intenção:
é a intenção que permite uma decisão correta quando um detalhe não bate.

## Estado atual

Os fatos de que o executor precisa, embutidos; nunca "como discutido" ou "veja a auditoria":

- Os arquivos relevantes, cada um com uma linha sobre seu papel:
  - `src/orders/api.ts`: endpoint da lista de pedidos; contém o N+1 (linhas 130–160)
- Trechos do código como existe hoje (curtos, com marcadores `file:line`),
  o suficiente para o executor confirmar que está olhando para a coisa certa.
- As convenções do repositório que se aplicam aqui, apontando um arquivo de exemplo:
  "O tratamento de erro segue o padrão Result: veja `src/lib/result.ts` e seu
  uso em `src/users/api.ts:40-60`. Siga-o."
- Qualquer vocabulário documentado ou restrição de design que o plano deve respeitar,
  embutido a partir dos docs de intenção/design encontrados no reconhecimento: os termos
  relevantes do `CONTEXT.md` que o executor deve usar em nomes e comentários, os
  tokens/componentes do `DESIGN.md` a reutilizar, ou o ADR com cuja decisão este
  trabalho deve se manter consistente. Cite as linhas específicas: o executor não leu esses docs.

## Comandos necessários

| Propósito | Comando                  | Esperado no sucesso |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `pnpm typecheck`         | exit 0, sem erros   |
| Testes    | `pnpm test -- <filter>`  | todos passam        |
| Lint      | `pnpm lint`              | exit 0              |

(Comandos exatos deste repositório, verificados no reconhecimento, não adivinhados.)

## Ferramentas sugeridas ao executor

(Opcional: inclua só quando skills/ferramentas relevantes plausivelmente existirem no
ambiente do executor. Caso contrário, pule a seção.)

- Skills que o executor deve invocar se disponíveis, e para quê:
  "use `vercel-react-best-practices` ao escrever a memoização do passo 3".
- Docs de referência que valem a leitura antes de começar, por caminho ou URL.

## Escopo

**No escopo** (os únicos arquivos que você deve modificar):
- `src/orders/api.ts`
- `src/orders/api.test.ts` (criar)

**Fora do escopo** (não toque, mesmo que pareçam relacionados):
- `src/orders/legacy-api.ts`: caminho deprecado, com remoção agendada;
  mudá-lo desperdiça esforço e arrisca os clientes v1 ainda presos a ele.
- Qualquer mudança no formato público da resposta: clientes dependem dele.

## Fluxo de git

(Preenchido a partir do reconhecimento: siga as convenções observadas no repositório.)

- Branch: `advisor/NNN-<slug>` (ou a convenção de nomes de branch do repositório, se houver uma evidente)
- Commit por passo ou por unidade lógica; estilo de mensagem: <siga o repositório, por exemplo conventional commits; inclua um exemplo do `git log`>
- Não faça push nem abra PR a menos que o operador tenha instruído.

## Passos

### Passo 1: <título no imperativo>

O que fazer, com precisão. Cite arquivos/símbolos exatos. Inclua o formato
do código alvo quando ele for essencial (o padrão a produzir, não necessariamente
cada linha).

**Verificar**: `<command>` → <saída esperada>

### Passo 2: ...

(Cada passo pequeno o bastante para ser verificado de forma independente. Ordene os passos para
que o codebase nunca fique quebrado entre eles quando possível, por exemplo: adicionar o caminho novo,
trocar os chamadores, depois remover o caminho antigo.)

## Plano de testes

- Testes novos a escrever, em qual arquivo, cobrindo quais casos (liste-os:
  caminho feliz, o bug/regressão específico que este plano corrige, edge cases nomeados).
- Qual teste existente usar como padrão estrutural:
  "modele a partir de `src/users/api.test.ts`".
- Verificação: `<test command>` → todos passam, incluindo N testes novos.

## Critérios de pronto

Verificáveis por máquina. Todos devem valer:

- [ ] `pnpm typecheck` termina com exit 0
- [ ] `pnpm test` termina com exit 0; os testes novos de <X> existem e passam
- [ ] `grep -rn "<old pattern>" src/` não retorna resultados
- [ ] Nenhum arquivo fora da lista do escopo foi modificado (`git status`)
- [ ] Linha de status em `plans/README.md` atualizada

## Condições de parada

Pare e reporte (não improvise) se:

- O código nos locais de "Estado atual" não bate com os trechos
  (o codebase teve drift desde que este plano foi escrito).
- A verificação de um passo falhar duas vezes depois de uma tentativa razoável de correção.
- A correção parecer exigir tocar um arquivo fora do escopo.
- Você descobrir que a suposição "<key assumption>" é falsa.

## Notas de manutenção

Para o humano/agente dono deste código depois que a mudança entrar:

- Que mudanças futuras vão interagir com isto (por exemplo "se paginação for adicionada
  a este endpoint, o batching do passo 2 precisa ser revisto").
- O que um revisor deve examinar com atenção no PR.
- Qualquer follow-up explicitamente adiado para fora deste plano (e por quê).
```

---

## Arquivo de índice: `plans/README.md`

Escrito uma vez pelo consultor depois de todos os planos, atualizado pelos executores:

```markdown
# Planos de implementação

Gerados pela skill audit em <date>. Execute na ordem abaixo, a menos que
as dependências digam o contrário. Cada executor: leia o plano inteiro antes de começar,
respeite as condições de parada dele e atualize sua linha ao terminar.

## Ordem de execução e status

| Plano | Título | Prioridade | Esforço | Depende de | Status |
|-------|--------|------------|---------|------------|--------|
| 001   | ...    | P1         | S       | nenhum     | TODO   |
| 002   | ...    | P1         | M       | 001        | TODO   |

Valores de status: TODO | IN PROGRESS | DONE | BLOCKED (com motivo em uma linha) | REJECTED (com justificativa em uma linha: achado corrigido de forma independente ou abordagem abandonada)

## Notas de dependência

- 002 exige 001 porque <motivo>.

## Achados considerados e rejeitados

- <achado>: não vale a pena porque <uma linha>. (Para ninguém auditá-lo de novo.)
```

## Barra de qualidade: confira antes de terminar cada plano

- Um modelo que nunca viu este repositório conseguiria executar isto só com o arquivo do plano e o repositório? Se algum passo exigir conhecimento da sessão do consultor, embuta esse conhecimento.
- Toda verificação é um comando com um resultado esperado, não um julgamento ("garanta que funciona")?
- Todo passo nomeia arquivos e símbolos exatos, não "o módulo relevante"?
- As condições de parada são específicas dos riscos reais deste plano, não texto genérico?
- Um revisor que lesse só "Por que importa" + "Critérios de pronto" entenderia o que está aprovando?
- Nenhum valor de segredo em lugar nenhum do arquivo, só localizações e tipos de credencial.
- O SHA de "Planejado em" está preenchido e os caminhos do escopo na verificação de drift batem com a seção Escopo.
