import type { Metadata } from "next";
import { ContactEmail, DATA_CONTROLLER, LegalList, LegalPage, LegalSection } from "@/app/_components/legal-page";

export const metadata: Metadata = { title: "Privacidade · Stood" };

// Página pública, fora do matcher do middleware
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      lead="Como o Stood trata os seus dados pessoais, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD)."
      other={{ href: "/termos", label: "Termos de uso" }}
    >
      <LegalSection title="Quem é responsável">
        <p>
          O Stood é um projeto acadêmico, feito por estudantes na disciplina de Engenharia de Software da Universidade Federal de São Paulo (UNIFESP). Ele não é um serviço oficial da UNIFESP.
        </p>
        <p>
          O controlador dos dados pessoais, que decide como eles são tratados, é <strong>{DATA_CONTROLLER}</strong>. Ele também atende os pedidos dos titulares pelo e-mail <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection title="Quais dados coletamos">
        <LegalList>
          <li>
            <strong>Ao entrar com Google ou GitHub:</strong> nome, e-mail e o endereço da foto de perfil que o provedor envia, e os tokens de acesso dessa Conta, guardados cifrados. Guardamos o e-mail de cada Conta ligada ao seu cadastro, que pode ser diferente do seu.
          </li>
          <li>
            <strong>Ao criar Conta com e-mail e senha:</strong> nome, e-mail e senha. A senha é guardada só como hash, nunca em texto puro.
          </li>
          <li>
            <strong>Sessão:</strong> um cookie de sessão que mantém você conectado por até 30 dias, com o endereço IP e o navegador (user agent) de cada sessão.
          </li>
          <li>
            <strong>Conteúdo:</strong> os Stoods, Pastas e Arquivos que você cria ou importa, as Tags que você cria para agrupar os Stoods, os Compromissos da Agenda (título, dia, horário, Stood e repetição) e as Janelas abertas no Quadro de cada Stood, com posição e tamanho, para ele abrir como você deixou. As Imagens são guardadas como você envia, junto com os metadados que a câmera ou o celular gravou nelas, como a data e, se estava ligada, a localização.
          </li>
          <li>
            <strong>Pomodoro:</strong> cada Foco que você faz, com o horário de início, a duração, a hora em que foi interrompido e o Stood em que começou, e a Meta semanal, se você definir uma.
          </li>
          <li>
            <strong>Preferências da tela:</strong> o tema do site, a largura e o estado das barras laterais, as opções do Quadro (fundo, grade e tema), as durações e o som do Pomodoro e a Pausa em andamento ficam só no seu navegador (localStorage) e não são enviados para nós.
          </li>
        </LegalList>
        <p>Não usamos ferramentas de análise, rastreamento ou publicidade.</p>
      </LegalSection>

      <LegalSection title="Para que usamos">
        <LegalList>
          <li>Identificar você ao entrar e manter a sua sessão.</li>
          <li>Enviar e-mails de confirmação de cadastro e de troca de senha, o link para apagar o cadastro e avisos quando a senha muda ou uma Conta é ligada ou desligada.</li>
          <li>Mostrar no seu Perfil os seus dados, as Contas que você usa para entrar e as sessões abertas, só para você.</li>
          <li>Guardar e mostrar os seus Stoods, só para você.</li>
          <li>Mostrar o seu Tempo estudado na semana e em cada dia da Agenda, no total e em cada Stood, e o progresso da Meta semanal.</li>
          <li>Guardar os seus Compromissos, mostrá-los na Agenda e lembrar os próximos na Biblioteca, só para você.</li>
          <li>Proteger o serviço contra abuso, como tentativas repetidas de login.</li>
        </LegalList>
        <p>A base legal é a execução do serviço que você pediu ao criar a sua Conta (art. 7º, V, da LGPD). Não vendemos nem alugamos dados pessoais.</p>
      </LegalSection>

      <LegalSection title="Com quem compartilhamos">
        <p>Só com os serviços que fazem o Stood funcionar, cada um com a própria política de privacidade:</p>
        <LegalList>
          <li>
            <strong>Google Cloud (Cloud Run):</strong> hospedagem do site.
          </li>
          <li>
            <strong>Neon:</strong> banco de dados PostgreSQL onde ficam a sua Conta e os seus Stoods.
          </li>
          <li>
            <strong>Resend:</strong> envio dos e-mails de confirmação, de troca de senha, de apagar o cadastro e dos avisos.
          </li>
          <li>
            <strong>Google e GitHub:</strong> quando você escolhe entrar por eles ou ligá-los ao seu cadastro. A sua foto de perfil carrega direto deles no seu navegador, e eles recebem o seu endereço IP.
          </li>
          <li>
            <strong>YouTube:</strong> ao adicionar um Vídeo, o Stood envia ao YouTube só o link do vídeo para mostrar o título, o canal e a miniatura. A miniatura e o player do Vídeo aberto no Quadro, no modo de privacidade aprimorada (youtube-nocookie.com), carregam direto do YouTube no seu navegador, e o YouTube recebe o seu endereço IP e trata o que você assiste pela política de privacidade dele.
          </li>
        </LegalList>
        <p>O site e o banco de dados ficam em servidores nos Estados Unidos, então os seus dados são transferidos para fora do Brasil, como permite o art. 33 da LGPD.</p>
      </LegalSection>

      <LegalSection title="Por quanto tempo guardamos">
        <p>
          Os dados ficam guardados enquanto você usar o Stood. A sessão expira em 30 dias, quando você sai ou quando a encerra no Perfil. Você pode apagar o seu cadastro, com tudo o que é seu, no Perfil: os dados saem do Stood na hora. O banco de dados (Neon) ainda permite recuperá-los por até 6 horas, e o Resend guarda por 30 dias os e-mails que enviamos. O link de confirmar vale por 1 hora. Se preferir, escreva para <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection title="Seus direitos">
        <p>
          Pela LGPD (art. 18), você pode pedir a confirmação de que tratamos seus dados, o acesso a eles, a correção, a portabilidade, a eliminação e a
          informação sobre com quem compartilhamos. No Perfil, você vê e corrige os seus dados e apaga o seu cadastro; para os demais pedidos, escreva para <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection title="Segurança">
        <p>
          O site usa conexão cifrada (HTTPS), a senha é guardada como hash e os tokens do Google e do GitHub são cifrados no banco. Como projeto acadêmico, o Stood não oferece garantia de
          disponibilidade; mantenha cópias do que for importante.
        </p>
      </LegalSection>

      <LegalSection title="Mudanças nesta política">
        <p>Quando esta política mudar, a data no topo da página é atualizada.</p>
      </LegalSection>
    </LegalPage>
  );
}
