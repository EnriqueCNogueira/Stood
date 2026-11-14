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
            <strong>Ao entrar com Google ou GitHub:</strong> nome, e-mail e foto de perfil que o provedor envia, e os tokens de acesso dessa Conta, guardados cifrados.
          </li>
          <li>
            <strong>Ao criar Conta com e-mail e senha:</strong> nome, e-mail e senha. A senha é guardada só como hash, nunca em texto puro.
          </li>
          <li>
            <strong>Sessão:</strong> um cookie de sessão que mantém você conectado por até 30 dias, com o endereço IP e o navegador (user agent) de cada sessão.
          </li>
          <li>
            <strong>Conteúdo:</strong> os Stoods, Pastas e Arquivos que você cria ou importa.
          </li>
          <li>
            <strong>Preferências da tela:</strong> o tema do site e a largura da barra lateral ficam só no seu navegador (localStorage) e não são enviados para nós.
          </li>
        </LegalList>
        <p>Não usamos ferramentas de análise, rastreamento ou publicidade.</p>
      </LegalSection>

      <LegalSection title="Para que usamos">
        <LegalList>
          <li>Identificar você ao entrar e manter a sua sessão.</li>
          <li>Enviar e-mails de confirmação de cadastro e de troca de senha.</li>
          <li>Guardar e mostrar os seus Stoods, só para você.</li>
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
            <strong>Resend:</strong> envio dos e-mails de confirmação e de troca de senha.
          </li>
          <li>
            <strong>Google e GitHub:</strong> quando você escolhe entrar por eles.
          </li>
        </LegalList>
        <p>O site e o banco de dados ficam em servidores nos Estados Unidos, então os seus dados são transferidos para fora do Brasil, como permite o art. 33 da LGPD.</p>
      </LegalSection>

      <LegalSection title="Por quanto tempo guardamos">
        <p>
          Os dados ficam guardados enquanto você usar o Stood. A sessão expira em 30 dias ou quando você sai. Para apagar os seus dados, escreva para <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection title="Seus direitos">
        <p>
          Pela LGPD (art. 18), você pode pedir a confirmação de que tratamos seus dados, o acesso a eles, a correção, a portabilidade, a eliminação e a
          informação sobre com quem compartilhamos. Faça o pedido pelo e-mail <ContactEmail />.
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
