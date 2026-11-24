import { CONTACT_EMAIL } from "@/lib/contact";
import { type EmailMessage, sendEmail } from "@/lib/email/email";

const NOTICE_TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" });
const NOTICE_HELP = `Se não foi você, troque a sua senha, confira as Contas e as Sessões no seu Perfil e escreva para ${CONTACT_EMAIL}.`;

export function buildVerificationEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Confirme seu e-mail no Stood",
    text: `Para confirmar seu e-mail e entrar no Stood, abra o link: ${url}\n\nSe você não criou uma conta no Stood, ignore este e-mail.`,
    html: `<p>Para confirmar seu e-mail e entrar no Stood, abra o link abaixo.</p><p><a href="${url}">Confirmar e-mail</a></p><p>Se você não criou uma conta no Stood, ignore este e-mail.</p>`,
  };
}

export function buildPasswordResetEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Troque sua senha do Stood",
    text: `Para criar uma senha nova no Stood, abra o link: ${url}\n\nSe você não pediu a troca, ignore este e-mail. Sua senha continua a mesma.`,
    html: `<p>Para criar uma senha nova no Stood, abra o link abaixo.</p><p><a href="${url}">Trocar senha</a></p><p>Se você não pediu a troca, ignore este e-mail. Sua senha continua a mesma.</p>`,
  };
}

// Para quem só entra pelo Google ou pelo GitHub: diz por onde entrar e não leva link
export function buildSocialOnlyPasswordResetEmail(to: string, providerNames: string[]): EmailMessage {
  const providers = providerNames.join(" ou ");
  return {
    to,
    subject: "Como entrar no Stood",
    text: `Você pediu para recuperar a senha, mas sua conta no Stood não tem senha: você entra pelo ${providers}. Na tela de entrar, use o botão "Entrar com ${providerNames[0]}".`,
    html: `<p>Você pediu para recuperar a senha, mas sua conta no Stood não tem senha: você entra pelo ${providers}.</p><p>Na tela de entrar, use o botão "Entrar com ${providerNames[0]}".</p>`,
  };
}

export function buildPasswordChangedEmail(to: string, now = new Date()): EmailMessage {
  return buildNotice(to, "A senha do seu Stood mudou", "A senha do seu Stood foi trocada, e as outras sessões foram encerradas.", now);
}

export function buildAccountLinkedEmail(to: string, providerName: string, accountEmail: string | null, now = new Date()): EmailMessage {
  const account = buildAccountLabel(providerName, accountEmail);
  return buildNotice(to, "Uma Conta foi ligada ao seu Stood", `A Conta ${account} foi ligada ao seu Stood e agora também serve para entrar nele.`, now);
}

export function buildAccountUnlinkedEmail(to: string, providerName: string, accountEmail: string | null, now = new Date()): EmailMessage {
  const account = buildAccountLabel(providerName, accountEmail);
  return buildNotice(to, "Uma Conta foi desligada do seu Stood", `A Conta ${account} foi desligada do seu Stood, e as outras sessões foram encerradas.`, now);
}

export function buildDeletionEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Confirme para apagar o seu cadastro no Stood",
    text: `Você pediu para apagar o seu cadastro no Stood, com todos os seus Stoods. Para confirmar, abra o link em até 1 hora e use o botão da página: ${url}\n\nSe você não pediu, ignore este e-mail. Nada será apagado.`,
    html: `<p>Você pediu para apagar o seu cadastro no Stood, com todos os seus Stoods.</p><p>Para confirmar, abra o link abaixo em até 1 hora e use o botão da página.</p><p><a href="${url}">Continuar para apagar</a></p><p>Se você não pediu, ignore este e-mail. Nada será apagado.</p>`,
  };
}

// Aviso de algo que já aconteceu: falhar no envio não desfaz a mudança, então só vai para o log, sem o e-mail
export async function sendNotice(message: EmailMessage): Promise<void> {
  try {
    await sendEmail(message);
  } catch {
    console.error("notice email failed");
  }
}

function buildNotice(to: string, subject: string, what: string, now: Date): EmailMessage {
  const when = `Aconteceu em ${NOTICE_TIME_FORMAT.format(now)}, no horário de Brasília.`;
  const paragraphs = [what, when, NOTICE_HELP];
  return { to, subject, text: paragraphs.join("\n\n"), html: paragraphs.map((paragraph) => `<p>${buildEscapedHtml(paragraph)}</p>`).join("") };
}

function buildAccountLabel(providerName: string, accountEmail: string | null) {
  return accountEmail ? `${providerName} (${accountEmail})` : providerName;
}

// O e-mail da Conta vem do provedor, então não entra no HTML como está
function buildEscapedHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
