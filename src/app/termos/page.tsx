import type { Metadata } from "next";
import { ContactEmail, DATA_CONTROLLER, LegalList, LegalPage, LegalSection } from "@/app/_components/legal-page";

export const metadata: Metadata = { title: "Termos · Stood" };

// Página pública, fora do matcher do middleware
export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      lead="As condições para usar o Stood. Ao criar uma Conta, você concorda com estes termos."
      other={{ href: "/privacidade", label: "Política de Privacidade" }}
    >
      <LegalSection title="O que é o Stood">
        <p>
          O Stood é um site gratuito para organizar estudos, feito como projeto acadêmico da disciplina de Engenharia de Software da Universidade Federal de São Paulo (UNIFESP). Ele não é um
          serviço oficial da UNIFESP. Como projeto de estudantes, pode mudar, ficar fora do ar ou ser encerrado sem aviso prévio.
        </p>
      </LegalSection>

      <LegalSection title="Sua Conta">
        <LegalList>
          <li>Você entra com Google, GitHub ou e-mail e senha, e é responsável por manter o acesso a eles em segurança.</li>
          <li>As informações do cadastro devem ser verdadeiras.</li>
          <li>Avise pelo e-mail de contato se perceber acesso indevido à sua Conta.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Seu conteúdo">
        <p>
          Os Stoods, Pastas e Arquivos que você cria continuam seus. Usamos esse conteúdo só para guardá-lo e mostrá-lo a você. Você é responsável pelo que envia e deve ter o direito de usar as
          Imagens, PDFs e demais Arquivos que importar.
        </p>
      </LegalSection>

      <LegalSection title="O que não é permitido">
        <LegalList>
          <li>Usar o Stood para qualquer atividade ilegal ou para guardar conteúdo que viole direitos de terceiros.</li>
          <li>Enviar código malicioso ou tentar acessar dados de outros Usuários.</li>
          <li>Sobrecarregar, burlar limites ou interferir no funcionamento do serviço.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Serviços de terceiros">
        <p>
          Vídeos do YouTube, login pelo Google e pelo GitHub e versões publicadas no GitHub seguem também os termos de cada um desses serviços. O Stood não controla nem responde por eles.
        </p>
      </LegalSection>

      <LegalSection title="Sem garantias">
        <p>
          O Stood é oferecido no estado em que se encontra, sem garantia de disponibilidade, de desempenho ou de que os dados nunca serão perdidos. Mantenha cópias do que for importante. Na medida
          permitida pela lei, os integrantes do projeto não respondem por danos decorrentes do uso do serviço.
        </p>
      </LegalSection>

      <LegalSection title="Encerramento">
        <p>
          Você pode parar de usar o Stood quando quiser e pedir que os seus dados sejam apagados pelo e-mail <ContactEmail />. Podemos suspender o acesso de quem descumprir estes
          termos.
        </p>
      </LegalSection>

      <LegalSection title="Lei aplicável e contato">
        <p>
          Estes termos seguem as leis do Brasil. O responsável pelo Stood é <strong>{DATA_CONTROLLER}</strong>, e dúvidas sobre os termos vão para <ContactEmail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
