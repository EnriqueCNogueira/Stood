---
description: Tokens, estados, contraste, temas e mobile dos componentes visuais
paths: ["**/*.tsx"]
---

# Design

> **Quando aplicar:** Ao criar ou editar a marcação e as classes de um componente, porque cor fixa, estado sem foco ou layout que só funciona num tema quebram a identidade visual sem erro no build.

## Tokens

- **Fonte única**: Cores, raios, sombras e fontes estão no `@theme` de `src/app/globals.css`, com o uso de cada um comentado na linha.
- **Só token**: Cor por classe de token (`bg-surface`, `text-text-muted`, `border-border`), nunca hex, `rgb` ou valor arbitrário, porque cor fixa não acompanha o tema.
- **Tom suave**: Use opacidade sobre o token (`bg-accent/12`, `ring-danger/12`) em vez de criar cor nova.
- **Token novo**: Só quando nenhum existente serve, com valor nos dois temas, abre `AskUserQuestion` para alinhamento.
- **Mono**: `font-mono` só em metadado: duração, contagem, hash e caminho.

## Estados

- **Foco**: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`; campo de texto usa borda `accent` com anel `accent/12`.
- **Desabilitado**: `disabled:opacity-45 disabled:cursor-not-allowed`, e o hover não reage (`hover:not-disabled:`).
- **Hover**: Muda cor, brilho ou posição, nunca tamanho, para o layout não pular.

## Contraste e brilho

- **Laranja como texto**: Só `text-accent-text`; `accent` é fundo.
- **Sobre o laranja**: Texto `text-on-accent`, escuro nos dois temas, nunca branco.
- **Brilho**: `shadow-glow` só no botão primário; superfície de trabalho fica com borda fina.

## Temas e mobile

- **Dois temas**: Escuro (padrão) e claro, pelo `data-theme` do `<html>`; confira todo componente nos dois.
- **Variante `dark:`**: Só quando o papel muda entre temas; o normal é o token já trocar sozinho.
- **Mobile primeiro**: Classe sem prefixo é o celular; `sm`, `md` e `lg` acrescentam. Nada de rolagem horizontal em 375px.
- **Ícones**: Lucide em 16px com traço de 1,75; botão só de ícone leva `aria-label`.

## Checklist

- [ ] Nenhuma cor fixa, valor arbitrário de cor ou paleta crua no diff.
- [ ] Foco visível em todo elemento interativo e desabilitado com `opacity-45`.
- [ ] Laranja como texto só via `accent-text`.
- [ ] Conferido nos dois temas e em 375px sem rolagem horizontal.
