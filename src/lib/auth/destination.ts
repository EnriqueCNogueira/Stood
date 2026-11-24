// Para onde a tela de entrar leva depois: só caminhos que o Stood conhece, para não servir de desvio a outro site

export const DEFAULT_DESTINATION = "/biblioteca";
export const PROFILE_PATH = "/perfil";
export const CONFIRM_DELETION_PATH = "/perfil/apagar";
export const SIGN_IN_PATH = "/entrar";
// Caminho pedido, posto pelo middleware, para a tela de entrar devolver o Usuário a ele
export const REQUESTED_PATH_HEADER = "x-stood-path";
// Rota, sob /auth, que pede o link de apagar o cadastro
export const REQUEST_DELETION_PATH = "/profile/request-deletion";

const CONFIRM_DELETION_PATTERN = /^\/perfil\/apagar\?codigo=[\w-]{1,128}$/;

export function parseDestination(destination: unknown): string {
  if (typeof destination !== "string") return DEFAULT_DESTINATION;
  const isKnown = destination === PROFILE_PATH || CONFIRM_DELETION_PATTERN.test(destination);
  return isKnown ? destination : DEFAULT_DESTINATION;
}

// Endereço da tela de entrar, com o destino só quando ele não é o de sempre
export function buildSignInPath(destination: unknown): string {
  const parsed = parseDestination(destination);
  return parsed === DEFAULT_DESTINATION ? SIGN_IN_PATH : `${SIGN_IN_PATH}?destino=${encodeURIComponent(parsed)}`;
}

export function buildConfirmDeletionPath(code: string) {
  return `${CONFIRM_DELETION_PATH}?codigo=${code}`;
}
