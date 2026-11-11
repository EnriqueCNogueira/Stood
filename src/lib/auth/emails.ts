import type { EmailMessage } from "@/lib/email/email";

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
