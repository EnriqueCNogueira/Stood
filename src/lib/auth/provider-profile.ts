import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export type ProviderProfile = { providerId: string; accountId: string; email: string | null };

// Perfil que o provedor enviou nesta requisição. A biblioteca o entrega ao montar o Usuário, mas não ao gravar a Conta,
// então ele fica guardado até lá. Vale só dentro da requisição, para o de uma pessoa nunca servir a outra.
const requestProfile = new AsyncLocalStorage<{ current?: ProviderProfile }>();

export function handleWithProviderProfile<T>(handler: () => Promise<T>): Promise<T> {
  return requestProfile.run({}, handler);
}

export function updateProviderProfile(profile: ProviderProfile) {
  const store = requestProfile.getStore();
  if (store) store.current = profile;
}

export function findProviderProfile(providerId: string): ProviderProfile | undefined {
  const profile = requestProfile.getStore()?.current;
  return profile?.providerId === providerId ? profile : undefined;
}
