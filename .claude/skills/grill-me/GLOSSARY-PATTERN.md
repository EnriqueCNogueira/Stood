# Padrão do GLOSSARY.md

## Estrutura

```md
# {Nome do Projeto}

{Uma ou duas frases descrevendo o domínio deste projeto e por que ele existe.}

## Linguagem

**Pedido**:
{Uma descrição do termo em uma ou duas frases}
_Evitar_: Compra, transação

**Fatura**:
Uma solicitação de pagamento enviada a um cliente após a entrega.
_Evitar_: Conta, cobrança

**Cliente**:
Uma pessoa ou organização que faz pedidos.
_Evitar_: Comprador, freguês, conta
```

## Regras

- **Seja opinativo.** Quando existirem várias palavras para o mesmo conceito, escolha a melhor e liste as outras em `_Evitar_`.
- **Mantenha as definições enxutas.** Uma ou duas frases no máximo. Defina o que a coisa É, não o que ela faz.
- **Inclua só termos específicos do domínio deste projeto.** Conceitos gerais de programação (timeouts, tipos de erro, padrões utilitários) não entram, mesmo que o projeto os use muito. Antes de adicionar um termo, pergunte: este é um conceito único deste domínio ou um conceito geral de programação? Só o primeiro entra.
- **Agrupe termos em subtítulos** quando surgirem agrupamentos naturais. Se todos os termos pertencem a uma única área coesa, uma lista plana basta.

## Localização

Existe um único `GLOSSARY.md`, sempre em `docs/`, na raiz do repositório. Se ele não existir, crie `docs/GLOSSARY.md` de forma preguiçosa quando o primeiro termo for resolvido.
