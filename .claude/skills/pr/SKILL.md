---
name: pr
description: Finaliza o desenvolvimento de uma branch. Confere o diff, roda o portão de qualidade e entrega o título e o texto do PR para outro dev revisar.
---

# PR

Fecha o desenvolvimento da branch com o texto do PR que outro dev vai revisar. **Não revisa código, não commita e não abre o PR**: para revisar, use `/review` antes.

## 1. Conferir o diff

Ler o diff da branch atual contra a branch pai, mais o que ainda não foi commitado. Apontar o que parece não intencional (log de debug, `console.log`, credencial, arquivo temporário, dependência nova sem motivo) e perguntar se sai antes de seguir. Não remover nada sem resposta.

## 2. Rodar o portão de qualidade

Rodar os comandos do portão de qualidade do `CLAUDE.md`, na ordem dele.

- **Resultado real**: Mostrar o que passou e o que falhou, com a saída do erro. Nunca dizer que passou sem ter rodado.
- **Falhou**: Parar e perguntar com `AskUserQuestion` se deve corrigir agora ou seguir. Se seguir, o Contexto do PR registra numa frase qual comando falhou e que a correção está pendente.
- **Banco**: Sem `DATABASE_URL` ou com o Postgres fora, `pnpm test` falha por ambiente; dizer isso em vez de tratar como bug.

## 3. Escrever título e texto

Título em uma linha curta, no formato de commit do `CLAUDE.md`. Texto em markdown, num bloco de código para copiar, que quem revisa entende em menos de um minuto:

```markdown
## Contexto
<Um ou dois parágrafos curtos: a função, o problema, o bug ou o pedido que originou a mudança.>

## <Principal mudança>
<Um parágrafo curto: o que mudou no sistema e por quê.>

## <Outras mudanças principais>
<Um parágrafo curto, no mesmo formato.>
```

- **Só duas partes**: O texto tem apenas o Contexto e os blocos das principais mudanças, sem outra seção.
- **Um bloco por mudança principal**: Uma subseção por grupo de alterações relacionadas, não por arquivo, quantas o PR tiver.
- **Efeito, não arquivo**: Cada parágrafo diz o que muda no sistema, não o que foi mexido nem o que foi combinado na conversa.
- **Referências**: Citar a issue no Contexto, quando houver.
- **Frontend**: Quando a mudança é visual, pedir um print do antes e depois, com legenda curta para adicionar no PR.

## Regras de texto

- **Curto e direto**: Frases curtas, sem repetir a mesma ideia e sem preâmbulo.
- **Tópicos**: Título curto em negrito, dois pontos e descrição começando com maiúscula.
- **Sem travessão**: Use vírgula, dois pontos, parênteses ou ponto final.
- **Sem enfeite**: Sem emoji, seta decorativa, caixa alta para ênfase nem adjetivo de venda ("robusto", "poderoso").
- **Português**: Texto do PR em português; nomes de código entre crases, como estão no repositório.
