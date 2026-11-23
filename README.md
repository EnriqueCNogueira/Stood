# Stood

Acesse em [stood.dev](https://stood.dev).

O Stood reúne seu estudo inteiro em uma tela só: a videoaula, as anotações, os slides, os PDFs, as imagens e os desenhos de uma matéria num único quadro. Você organiza do seu jeito e, quando volta, seus arquivos estão salvos, centralizados e prontos para você continuar o estudo. Menos tempo procurando arquivo, mais tempo aprendendo.

## O problema

Hoje, antes de você começar a estudar qualquer coisa, é necessário abrir o conteúdo (Vídeos, Slides, PDFs, Livros), o bloco de notas, um aplicativo de desenho, etc. A aula está no YouTube, as anotações num bloco de notas, os slides e os PDFs no Drive, os desenhos em outro aplicativo. Cada ferramenta guarda um pedaço e nenhuma guarda o conjunto.

O custo aparece depois. Quando você quer acessar esse estudo novamente, o conteúdo continua lá, mas o contexto sumiu: Onde está a anotação daquele vídeo, qual slide acompanhava aquela anotação, onde foi parar o mapa mental. Reconstruir é difícil, e o esforço feito meses antes se perde.

## A solução

O Stood é o lugar onde o estudo acontece e fica salvo. Cada estudo vira um quadro: um espaço em que vídeos, notas, slides, PDFs, imagens e desenhos ficam organizados na mesma tela, cada um na sua janela. Junto com o conteúdo, o Stood guarda a história: ao conectar seu Stood no Github, você salva todas as versões do seu estudo.

### Home

A Home é a porta de entrada, o lugar onde você consegue acessar e criar seus Stoods. A barra de busca encontra vídeos do YouTube e cria um novo Stood com ele. O botão "Novo Stood" cria um quadro vazio.

Logo abaixo, "Continuar de onde parou" mostra seus Stoods: um clique e todo o conteúdo aparece para você continuar estudando.

### Quadro de estudo

O quadro sempre abre vazio e você monta do seu jeito. Uma aba lateral lista as janelas que você já tem e pode adicionar, basta arrastar um deles para o quadro e ele abre numa janela própria, que você move, redimensiona e fecha quando quiser.

Cada quadro comporta no máximo 10 janelas e entre elas, até 2 vídeos, o bastante para uma aula inteira sem virar bagunça. Tudo é salvo sozinho enquanto você estuda.

### Tipos de Janelas

| Janela | O que é |
| --- | --- |
| Vídeo | Vídeos do Youtube |
| Nota | Arquivos `.md` para fazer suas anotações |
| Desenho | Excalidraw para rabiscar fluxos, mapas mentais, cálculos ou desenhos |
| Imagem | Fotos e Prints que complementam seus estudos |
| PDF | Apostilas, livros, artigos, etc para ler ao lado das suas anotações |

### Funcionalidades

- **Biblioteca**: Todos os seus Stoods num lugar só, numa lista sem pastas. Dentro de cada Stood, você organiza os arquivos em Pastas da forma que quiser.
- **Matérias**: Na Biblioteca, Stoods prontos de Cálculo 1, Programação Orientada a Objetos e Engenharia de Software, com videoaulas do conteúdo. Um clique cria a sua cópia, que você edita à vontade sem mudar a Matéria.
- **Salvamento automático**: Notas e desenhos são salvos enquanto você escreve, sem botão de salvar.
- **Captura de tela**: Um clique no vídeo guarda aquele momento da aula como imagem, junto dos outros arquivos do estudo.
- **Publicação no GitHub**: Seu Stood vai inteiro para o GitHub com um clique, e cada publicação guarda uma versão dele.
- **Pomodoro**: Na barra do quadro, você estuda em Focos com Pausas entre eles, com as durações que escolher. Na Biblioteca, você vê quanto estudou na semana, em cada Stood, e o progresso da sua meta semanal.
- **Importar e exportar**: Você pode importar qualquer arquivo compatível para o seu Stood (como Imagens, PDFs, Anotações e links do Youtube). E pode exportar para o Github ou Arquivo compactado (`.zip`).
- **Conta**: Entrada por Google, GitHub ou e-mail e senha. O perfil tem só nome, e-mail e o avatar do provedor.

## Como rodar

- **Requisitos**: Node 24, pnpm 12 e PostgreSQL 18.

1. **Instalar as dependências**: `pnpm install`.
2. **Subir o Postgres no Docker**: `docker run --name stood-postgres -e POSTGRES_USER=stood -e POSTGRES_PASSWORD=stood -e POSTGRES_DB=stood -p 5432:5432 -d postgres:18`.
3. **Criar o `.env.local` e preencher como na tabela abaixo**: `cp .env.example .env.local`.
4. **Criar as tabelas, de novo a cada migration nova**: `pnpm exec drizzle-kit migrate`.
5. **Subir o site em `http://localhost:3000`**: `pnpm dev`.

### Variáveis de ambiente

| Variável | Obrigatória | Valor para rodar local |
| --- | --- | --- |
| `DATABASE_URL` | Sim | `postgres://stood:stood@localhost:5432/stood` |
| `BETTER_AUTH_SECRET` | Sim | 32 caracteres ou mais |
| `BETTER_AUTH_URL` | Sim | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` | Sim | As suas, ou qualquer texto para rodar sem login pelo Google |
| `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` | Sim | As suas, ou qualquer texto para rodar sem login pelo GitHub |
| `RESEND_API_KEY` | Só em produção | Vazia: o link de confirmação do e-mail sai no terminal |

- **Segredo**: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- **OAuth**: Retorno em `http://localhost:3000/auth/callback/google` e `/auth/callback/github`.
