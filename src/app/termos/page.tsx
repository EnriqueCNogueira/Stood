import type { Metadata } from "next";
import { ContactEmail, DATA_CONTROLLER, LegalList, LegalPage, LegalSection } from "@/app/_components/legal-page";
import { TEXT_LINK } from "@/app/_components/ui";

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
          <li>Toda Conta do Google ou do GitHub que você liga ao seu cadastro passa a abrir o seu Stood. Ligue só as suas.</li>
          <li>Avise pelo e-mail de contato se perceber acesso indevido à sua Conta.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Seu conteúdo">
        <p>
          Os Stoods, Pastas, Arquivos, Tags e Compromissos que você cria continuam seus. Usamos esse conteúdo só para guardá-lo e mostrá-lo a você. Você é responsável pelo que envia e deve ter o direito de usar as
          Imagens e demais Arquivos que importar.
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

      <LegalSection title="Apagar o cadastro">
        <LegalList>
          <li>
            Você pode parar de usar o Stood quando quiser e apagar o seu cadastro no Perfil, depois de digitar o seu e-mail e confirmar pelo link enviado a ele. Também pode pedir por{" "}
            <ContactEmail />.
          </li>
          <li>
            Apagar o cadastro apaga todos os seus Stoods, com as Pastas e os Arquivos, e também as suas Tags, Focos, Meta semanal, Compromissos, Contas e sessões. Não dá para desfazer, e não
            recuperamos o que foi apagado.
          </li>
          <li>Você é responsável por exportar antes os Stoods que quiser guardar e por proteger o acesso ao seu e-mail, que confirma o pedido.</li>
          <li>O que está fora do Stood não é apagado: os arquivos que você exportou e a permissão que deu no Google ou no GitHub, que só você retira por lá.</li>
          <li>
            Na medida permitida pela lei, não respondemos pelo conteúdo apagado por essa escolha. Os serviços que usamos podem manter cópias temporárias, pelos prazos da{" "}
            <a href="/privacidade" className={TEXT_LINK}>
              Política de Privacidade
            </a>
            .
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Encerramento">
        <p>Podemos suspender o acesso de quem descumprir estes termos.</p>
      </LegalSection>

      <LegalSection title="Lei aplicável e contato">
        <p>
          Estes termos seguem as leis do Brasil. O responsável pelo Stood é <strong>{DATA_CONTROLLER}</strong>, e dúvidas sobre os termos vão para <ContactEmail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
