# Padrão de ADR

ADRs ficam em `docs/adr/` e usam numeração sequencial: `0001-slug.md`, `0002-slug.md` etc.

Crie o diretório `docs/adr/` de forma preguiçosa: só quando o primeiro ADR for necessário.

## Template

```md
# {Título curto da decisão}

{1 a 3 frases: qual é o contexto, o que decidimos e por quê.}
```

Só isso. Um ADR pode ser um único parágrafo. O valor está em registrar *que* uma decisão foi tomada e *por quê*, não em preencher seções.

## Seções opcionais

Inclua estas só quando agregarem valor real. A maioria dos ADRs não vai precisar delas.

- **Status** no frontmatter (`proposed | accepted | deprecated | superseded by ADR-NNNN`): útil quando decisões são revisitadas
- **Opções Consideradas**: só quando vale lembrar as alternativas rejeitadas
- **Consequências**: só quando efeitos posteriores não óbvios precisam ser destacados

## Numeração

Procure em `docs/adr/` o maior número existente e incremente em um.

## Quando oferecer um ADR

As três condições precisam ser verdadeiras:

1. **Difícil de reverter**: o custo de mudar de ideia depois é significativo
2. **Surpreendente sem contexto**: um leitor futuro vai olhar o código e se perguntar "por que fizeram assim?"
3. **Resultado de um trade-off real**: havia alternativas genuínas e você escolheu uma por motivos específicos

Se uma decisão é fácil de reverter, pule: você simplesmente vai reverter. Se não é surpreendente, ninguém vai se perguntar o porquê. Se não havia alternativa real, não há nada a registrar além de "fizemos o óbvio".

### O que se qualifica

- **Forma da arquitetura.** "Estamos usando um monorepo." "O write model é event-sourced, o read model é projetado no Postgres."
- **Padrões de integração entre contextos.** "Ordering e Billing se comunicam por eventos de domínio, não por HTTP síncrono."
- **Escolhas de tecnologia que trazem lock-in.** Banco de dados, message bus, provedor de autenticação, destino de deploy. Não toda biblioteca: só as que levariam um trimestre para trocar.
- **Decisões de fronteira e escopo.** "Os dados do Cliente pertencem ao contexto Customer; os outros contextos o referenciam só por ID." Os "não" explícitos valem tanto quanto os "sim".
- **Desvios deliberados do caminho óbvio.** "Estamos usando SQL manual em vez de ORM por causa de X." Qualquer coisa em que um leitor razoável presumiria o oposto. Isso impede o próximo engenheiro de "consertar" algo que foi deliberado.
- **Restrições que não aparecem no código.** "Não podemos usar AWS por exigências de compliance." "O tempo de resposta precisa ficar abaixo de 200ms por causa do contrato da API do parceiro."
- **Alternativas rejeitadas quando a rejeição não é óbvia.** Se você considerou GraphQL e escolheu REST por motivos sutis, registre; senão alguém vai sugerir GraphQL de novo daqui a seis meses.
