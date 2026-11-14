---
description: Tokens, componentes, estados, acessibilidade, temas e mobile das telas
paths: ["**/*.tsx"]
---

# Design

> **Quando aplicar:** Ao criar ou editar qualquer elemento visual, porque cor fixa, tamanho solto ou layout que só funciona num tema quebram a identidade visual sem erro no build.

## Princípio

- **Siga o que já existe**: Antes de escrever classe nova, olhe uma tela parecida e repita o padrão dela: largura, margem, espaçamento, títulos e degraus de tela grande.
- **Reutilize**: As classes base ficam em `src/app/_components/ui.ts`; padrão que se repete em duas telas vai para lá.

## Tokens

- **Só token**: Cor, raio, sombra, fonte e tamanho de texto vêm do `@theme` de `src/app/globals.css`, nunca hex, `rgb` ou `text-[Npx]`, porque valor fixo não acompanha o tema.
- **Tom suave**: Opacidade sobre o token (`bg-accent/12`) em vez de cor nova; token novo só com valor nos dois temas e após `AskUserQuestion`.
- **Laranja**: `accent` é fundo, texto laranja usa `accent-text` e texto sobre o laranja usa `on-accent`.

## Componentes

- **Ícones**: Lucide (`lucide-react`); botão só de ícone leva `aria-label` e o ícone, `aria-hidden`.
- **Logo e imagens**: Logo do Stood por `StoodLogo`; imagem em PNG recortado, otimizado e com pelo menos 2x o tamanho exibido.

## Estados

- **Foco e desabilitado**: Todo interativo tem `FOCUS`; desabilitado usa `opacity-45` e não reage ao hover.
- **Hover**: Muda cor, brilho ou posição, nunca tamanho, para o layout não pular.
- **Dados**: Lista ou tela com dado tem estado vazio, carregando e erro (`role="alert"`).
- **Movimento**: Transição curta, e animação para com `prefers-reduced-motion`.

## Acessibilidade e texto

- **Estrutura**: Um `h1` por página, títulos em ordem e imagem decorativa com `alt=""`.
- **Teclado**: Tudo alcançável por Tab, e menu fecha com Esc.
- **Texto**: Nomes do [glossário](../../docs/GLOSSARY.md) com inicial maiúscula; botão começa com verbo, em caixa de frase.

## Temas e mobile

- **Dois temas**: O tema é o `data-theme` do `<html>`; `dark:` só quando o papel muda, o normal é o token trocar sozinho.
- **Mobile primeiro**: Classe sem prefixo é o celular, e nada rola na horizontal em 375px.

## Checklist

- [ ] Nenhuma cor fixa, valor arbitrário ou `text-[Npx]` no diff.
- [ ] Foco visível, um `h1` e botão só de ícone com `aria-label`.
- [ ] Conferido nos dois temas e em 375px.
