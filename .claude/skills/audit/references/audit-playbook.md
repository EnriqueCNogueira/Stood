# Playbook da auditoria

O que procurar, por categoria. Cada subagente (ou passada de auditoria direta) recebe a seção relevante mais o **Formato do achado** no fim. Adapte a profundidade ao tamanho do repositório: uma CLI de 2 mil linhas recebe uma passada mais leve que um monorepo de 500 mil linhas.

Um achado só é achado com evidência. "Provavelmente tem queries N+1 em algum lugar" não é achado; `orders/api.ts:142 faz uma query por item do pedido dentro de um loop` é.

---

## 1. Correção / Bugs

A categoria de maior confiança: bugs reais encontrados lendo o código, não especulação.

- Tratamento de erro: exceções engolidas, blocos catch vazios, `catch (e) { console.log(e) }` em caminhos críticos, estados de erro ausentes no código de UI.
- Riscos de async: promises sem await, race conditions em estado compartilhado, cancelamento/limpeza ausentes (closures obsoletas em effects do React, listeners nunca removidos).
- Fluxos de null/undefined: non-null assertions (`!`) em valores que podem ser null, optional chaining escondendo um valor que precisa existir, indexação de array sem checagem.
- Condições de borda: off-by-one, tratamento de coleção vazia, suposições de fuso horário/locale, integer overflow em contadores/IDs.
- Máquinas de estado: combinações de estado impossíveis representáveis nos tipos, enums de status com ramos não tratados (procure `default:` que silenciosamente não faz nada).
- Concorrência: check-then-act em recursos compartilhados, transações ausentes em operações com várias escritas, idempotência de operações reexecutadas (webhooks, filas).
- Escapes do sistema de tipos: concentrações de `any` / casts com `as` / `@ts-ignore`; cada um é um lugar onde o compilador foi desautorizado.
- Vazamento de recursos: handles, conexões e subscriptions não fechados; `finally` ausente.

## 2. Segurança

Revise apenas o que for diretamente sustentado por evidência no código. Mantenha os achados enquadrados como manutenção defensiva: identifique o padrão de código, explique o impacto em produção e descreva a correção. Mantenha os planos no nível de mudanças de código, mudanças de configuração e testes; não inclua strings de demonstração executáveis nem detalhes passo a passo de uso indevido.

**Regra de manuseio:** nunca copie o valor de um segredo para um achado ou plano, porque esses arquivos são commitados. Cite apenas o `file:line` e o tipo de credencial ("chave live do Stripe em `config.ts:12`"), e o esboço da correção sempre inclui rotação, não só remoção (um segredo commitado está queimado mesmo depois de apagado).

**Intencional não é achado:** convenções padrão de plataforma são comportamento intencional: respeitar `https_proxy`/`NO_PROXY`, ler `~/.netrc`, uma ferramenta explicitamente de dev local chamar os gerenciadores de pacotes configurados. Um trade-off registrado explicitamente num ADR ou doc de decisão também está resolvido, não é achado. Sinalize esses casos só quando a *implementação* adicionar risco além da convenção ou da própria decisão documentada, e note que um **ADR desatualizado é por si só um achado**: se o código se afastou do que o doc de decisão diz, reporte o desvio da decisão (o doc ou o código está errado; de qualquer forma o time deveria saber), não use o doc para suprimi-lo.

- Higiene de credenciais: chaves/tokens/senhas hardcoded, credenciais em arquivos `.env` commitados, credenciais logadas ou persistidas em stores de eventos/histórico. Os achados devem nomear só o tipo e a localização da credencial e então recomendar remoção, rotação e um caminho de configuração mais seguro.
- Dados que chegam a interpretadores ou APIs privilegiadas: operações SQL ou de shell montadas a partir de dados da requisição (SQL/command injection), sinks de HTML alimentados por conteúdo controlado pelo usuário (XSS), APIs de execução dinâmica usadas com entrada de runtime, ou caminhos de sistema de arquivos derivados de dados da requisição (path traversal). Descreva a API mais segura ou a fronteira de validação; não forneça exemplos executáveis.
- Controle de acesso: endpoints/server actions sem checagem de identidade no servidor, autorização aplicada só no cliente, acesso a objeto por ID sem checagem de dono ou tenant (IDOR), ou checagens de autenticidade da requisição ausentes (CSRF) em rotas que mudam estado.
- Contratos de entrada: fronteiras de API que confiam no corpo da requisição sem validação de schema, tratamento de upload de arquivo sem restrições claras de tipo/tamanho/armazenamento, ou atribuição ampla de objeto a partir de dados da requisição para modelos de persistência (mass assignment).
- Postura de dependências: rode o comando de audit do ecossistema (`npm audit`, `pip-audit`, `cargo audit`) em modo somente leitura. Reporte só advisories critical/high que afetem código de runtime alcançável ou caminhos de build/distribuição; evite o ruído de baixo sinal do audit.
- Configuração de produção: CORS amplo demais onde credenciais são permitidas, headers de endurecimento de resposta ausentes (por exemplo CSP) onde existem superfícies sensíveis no navegador, cookies sem os atributos `HttpOnly`/`Secure`/`SameSite` adequados, ou comportamento de debug/verbose ativado na configuração de produção.
- Minimização de dados: PII ou dados operacionais sensíveis em logs, stack traces devolvidos aos clientes, ou detalhes internos de erro expostos em respostas da API.

## 3. Performance

Procure os ganhos algorítmicos e arquiteturais, não micro-otimizações.

- Padrões N+1: query/fetch por item dentro de loops ou por linha renderizada de uma lista; batching ou dataloader ausentes.
- Complexidade errada: varreduras aninhadas sobre a mesma coleção, `find`/`filter` repetidos dentro de loops quentes onde caberia uma busca por chave num Map.
- Lacunas de cache: computações ou fetches caros idênticos repetidos por requisição/render; memoização ausente em fronteiras claras de função; nenhum cache HTTP/de camada de dados para dados estáveis.
- Tamanho do payload: over-fetching (select *, objetos completos onde IDs bastariam), paginação ausente em listas sem limite, JSON grande enviado aos clientes.
- Frontend (se aplicável): composição do bundle (dependências pesadas para uso trivial), code-splitting ausente em rotas pouco acessadas, imagens/fontes não otimizadas, fetch no cliente para dados disponíveis na hora do render, cascatas de render. Para React/Next.js, siga as convenções de framework do repositório e quaisquer diretrizes de boas práticas instaladas.
- Backend: trabalho síncrono que deveria estar numa fila, índices ausentes sugeridos pelos padrões de query (marque para verificação; não afirme sem evidência no schema), padrões de conexão por requisição onde existe pooling.
- Build/CI: CI lenta por falta de cache, passos redundantes no pipeline, suítes de teste que poderiam rodar em paralelo.

## 4. Cobertura de testes

O objetivo não é uma porcentagem, é *qual código sem teste é perigoso*.

- Mapeie os caminhos críticos (dinheiro, auth, mutação de dados, a funcionalidade para a qual o repositório existe) e confira quais têm cobertura nula ou trivial.
- Módulos com muito churn (git log) + sem testes = maior risco de refatoração; marque como candidatos a "testes de caracterização primeiro".
- Qualidade dos testes existentes: testes que não afirmam nada significativo, mocking pesado que testa os mocks, testes de snapshot que ninguém lê, padrões instáveis (timers reais, rede real, dependência de ordem).
- Camadas de teste ausentes: suítes só de unidade sem nenhuma cobertura de integração nas fronteiras de API, ou o inverso (E2E lento para o que um teste de unidade pegaria).
- Infraestrutura de verificação: existe um jeito de um comando só para saber se o codebase funciona? Se não, esse é o achado #1 e um plano pré-requisito para qualquer mudança arriscada.

## 5. Dívida técnica e arquitetura

- Duplicação: a mesma lógica reimplementada em 3+ lugares (procure funções/componentes quase idênticos); cópias divergentes que se afastaram.
- Violações de camada: UI importando internals da camada de dados, dependências circulares, módulos "utils" que viraram gaveta de bagunça com alto fan-in.
- Código morto: módulos não exportados e não usados, feature flags totalmente liberadas mas ainda ramificando, blocos comentados sem explicação, dependências no manifesto que não são mais importadas.
- God objects/módulos: arquivos uma ordem de grandeza maiores que a mediana do repositório e que tudo toca; funções com dezenas de parâmetros ou aninhamento condicional profundo.
- Padrões inconsistentes: três jeitos de fazer data fetching / tratamento de erro / estilo no mesmo repositório; escolha o vencedor (aquele em que o time convergiu mais recentemente) e planeje a consolidação.
- Abstrações desencaixadas: abstrações prematuras com uma única implementação, ou abstrações ausentes onde a mesma mudança sempre exige tocar N arquivos em conjunto.

## 6. Dependências e migrações

- Atraso de versão major no framework/runtime principal (não todo bump de minor, só os que têm custo real em ficar para trás: EOL, fim de correções de segurança, incompatibilidade com o ecossistema).
- APIs deprecadas em uso que têm prazo de remoção anunciado.
- Dependências abandonadas (sem release há anos, repositórios arquivados) em caminhos críticos.
- Dependências duplicadas resolvendo o mesmo problema (duas libs de data, dois clientes HTTP).
- Divergência entre lockfile e manifesto, inconsistências de pinning de versão num monorepo.
- Para cada candidato a migração, estime o raio de impacto (arquivos tocados): isso define o esforço e se vale recomendar.

## 7. DX e ferramentas

- Ausentes ou quebrados: script de typecheck, config de lint, formatador, hooks de pre-commit, editorconfig.
- Ciclos de feedback lentos: dev server ou inicialização de testes medidos em minutos, sem watch mode, CI sem cache.
- Atrito no onboarding: passos de setup do README errados/incompletos, variáveis de ambiente obrigatórias não documentadas, sem `.env.example`.
- `CLAUDE.md`/`AGENTS.md` ausente: em repositórios onde agentes vão executar os planos, isso é de alta alavancagem; recomende um e inclua o esboço dele como plano.
- Mensagens de erro/logging: logs não estruturados em serviços, request IDs/correlação ausentes, depuração que exige mudar código.

## 8. Docs

Menor prioridade padrão; só sinalize onde a ausência tem um custo concreto:

- Superfície de API pública (pacotes publicados) sem docs de referência.
- Decisões arquiteturais que ninguém consegue reconstruir (por que X em vez de Y) em áreas ativamente disputadas.
- Docs desatualizados que estão ativamente errados (pior que ausentes): instruções de setup, exemplos de API que não compilam mais.

## 9. Direção: funcionalidades e para onde levar o projeto

Olhando para frente: não o que está quebrado, mas o que este codebase quer se tornar. **Regra de fundamentação:** toda sugestão deve citar evidência do próprio repositório; uma sugestão que serviria para qualquer projeto da categoria ("adicionar modo escuro", "adicionar IA") é ruído, não achado. Fontes de sinal fundamentado de direção:

- **Intenção inacabada**: concentrações de TODO/FIXME em torno de um tema, feature flags nunca liberadas, módulos stub ou construídos pela metade, código de funcionalidade comentado, trabalho abandonado no meio de uma funcionalidade visível no histórico do git.
- **Declarado mas não entregue**: promessas no README/docs/roadmap sem código correspondente, flags de CLI ou opções de config que não fazem nada, templates de issue para funcionalidades que não existem. Um PRD ou `PRODUCT.md` que nomeia usuários, casos de uso ou uma direção que o código ainda não alcançou é o sinal de fundamentação mais forte que existe: prefira-o à intenção inferida e nunca proponha algo que um doc de decisão já rejeitou (anote a contradição em vez disso).
- **Assimetrias de superfície**: pares de uma direção só (export sem import, create sem bulk-create, webhooks de saída mas não de entrada), entidades com CRUD menos uma operação, uma API pública de que o código interno claramente precisou e contornou na mão.
- **O possível adjacente**: capacidades que a arquitetura existente torna desproporcionalmente baratas: um sistema de plugins a uma interface de distância, uma API pública a um arquivo de rota da camada de serviço existente, uma integração que o modelo de dados já suporta.
- **Atrito que vale virar produto**: coisas que os usuários deste projeto evidentemente fazem à mão em volta dele (visíveis em docs, exemplos, issues) e que o projeto poderia absorver.

Achados de direção usam o formato padrão com duas adaptações: **Impacto** é valor de produto/usuário (quem quer isto e por que agora), e **Confiança** reflete o quão fundamentada a evidência é, não a certeza de que é a decisão certa. A estratégia pertence ao mantenedor; o trabalho do consultor é dar opções fundamentadas com trade-offs honestos. As estimativas de esforço aqui são mais grosseiras; diga isso. Planos para achados de direção selecionados costumam ser um *plano de design/spike* (investigar, prototipar, definir a API, listar as questões em aberto) em vez de um plano de construir tudo; delimite-os assim.

---

## Formato do achado

Todo achado, de toda categoria e de todo subagente, volta neste formato:

```markdown
### [CATEGORIA-NN] Título curto no imperativo

- **Evidência**: `path/file.ts:123`: descrição em uma frase do que está lá. (Repita por local; os 2 a 5 locais mais fortes, anote "e ~N lugares parecidos" se for generalizado.)
- **Impacto**: O que dá errado / o que está sendo pago por causa disto. Concreto: "todo render da lista de pedidos faz 1+N queries", não "subótimo".
- **Esforço**: S (horas) / M (cerca de um dia) / L (vários dias), para a *correção*, incluindo testes.
- **Risco**: O que a correção pode quebrar; LOW/MED/HIGH mais uma linha do porquê.
- **Confiança**: HIGH (li o código, certeza) / MED (sinal forte, precisa de verificação) / LOW (cheiro, precisa de investigação). Achados de confiança LOW podem ser reportados, mas recebem um plano de "investigar", não de "corrigir".
- **Esboço da correção**: 1 a 3 frases. Não é o plano, só o suficiente para julgar o esforço com honestidade.
```

## Rubrica de priorização

Ordene os achados por **alavancagem = impacto ÷ esforço, descontada pela confiança e pelo risco da correção**. Critérios de desempate:

1. Qualquer coisa que desbloqueie outros achados (base de verificação, testes de caracterização) sobe.
2. Achados de segurança com confiança HIGH ficam acima de achados de outras categorias com alavancagem equivalente.
3. Prefira achados cuja correção tenha uma história de verificação limpa: modelos executores têm sucesso nesses.
4. "Não vale a pena" é um veredito válido; registre-o com uma linha de justificativa para o usuário saber que foi considerado.
