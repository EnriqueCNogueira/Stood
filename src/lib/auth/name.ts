export const MAX_USER_NAME_LENGTH = 80;

export type UserNameReason = "nome-vazio" | "nome-longo";

type ValidateUserNameResult = { ok: true; name: string } | { ok: false; reason: UserNameReason };

// Nome do Usuário no cadastro e no Perfil, aparado nas pontas; o que vem do provedor entra como está
export function validateUserName(name: string): ValidateUserNameResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, reason: "nome-vazio" };
  if (trimmed.length > MAX_USER_NAME_LENGTH) return { ok: false, reason: "nome-longo" };
  return { ok: true, name: trimmed };
}
