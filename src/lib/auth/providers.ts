// Conta de e-mail e senha, no nome que a biblioteca usa
export const CREDENTIAL_PROVIDER_ID = "credential";

export const SOCIAL_PROVIDERS = ["google", "github"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export const SOCIAL_PROVIDER_NAMES: Record<SocialProvider, string> = { google: "Google", github: "GitHub" };

export function isSocialProvider(providerId: string): providerId is SocialProvider {
  return SOCIAL_PROVIDERS.some((provider) => provider === providerId);
}

export function getProviderName(providerId: string) {
  return isSocialProvider(providerId) ? SOCIAL_PROVIDER_NAMES[providerId] : "e-mail e senha";
}
