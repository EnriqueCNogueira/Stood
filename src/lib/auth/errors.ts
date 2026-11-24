// Mensagens de erro da Better Auth, traduzidas para português.

import { MAX_USER_NAME_LENGTH } from "@/lib/auth/name";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

const TOO_MANY_REQUESTS_STATUS = 429;

const MESSAGES_BY_CODE: Record<string, string> = {
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Este e-mail já tem cadastro. Entre pelo método que você usou.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  EMAIL_NOT_VERIFIED: "Confirme seu e-mail para entrar. Mandamos um link para você.",
  PASSWORD_TOO_SHORT: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  PASSWORD_TOO_WEAK: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres, com letra maiúscula, número e caractere especial.`,
  VALIDATION_ERROR: "Confira o e-mail: ele precisa estar num formato válido, como nome@exemplo.com.",
  USER_NAME_INVALID: `O nome precisa ter de 1 a ${MAX_USER_NAME_LENGTH} caracteres.`,
  INVALID_PASSWORD: "A senha atual está incorreta.",
  SESSION_NOT_FRESH: "Você entrou há mais de 1 dia. Entre de novo para continuar.",
  account_already_linked_to_different_user: "Esta Conta já entra em outro cadastro do Stood.",
  unable_to_link_account: "Esta Conta não pode ser ligada: o e-mail dela é de outro cadastro do Stood, ou o provedor não o enviou.",
  access_denied: "Você cancelou no Google ou no GitHub.",
  "login-antigo": "Você entrou há mais de 1 dia. Entre de novo para continuar.",
  "email-diferente": "Digite o e-mail do seu cadastro.",
  "email-nao-enviado": "Não foi possível mandar o e-mail. Tente de novo.",
  INVALID_TOKEN: "Este link expirou ou já foi usado. Peça um novo.",
  account_not_linked:
    "Este e-mail já tem cadastro com senha e ainda não foi confirmado. Confirme o e-mail pelo link que mandamos ou redefina a senha para entrar com Google ou GitHub.",
};

const GENERIC_MESSAGE = "Não deu certo. Tente de novo.";
const TOO_MANY_REQUESTS_MESSAGE = "Muitas tentativas. Espere um pouco e tente de novo.";

export function buildAuthErrorMessage(error: { code?: string; status?: number }): string {
  if (error.status === TOO_MANY_REQUESTS_STATUS) return TOO_MANY_REQUESTS_MESSAGE;
  return (error.code && MESSAGES_BY_CODE[error.code]) || GENERIC_MESSAGE;
}
