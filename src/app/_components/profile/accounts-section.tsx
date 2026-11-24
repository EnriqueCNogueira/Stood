"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { GithubLogo, GoogleLogo } from "@/app/_components/brand-icons";
import { ConfirmDialog } from "@/app/_components/profile/confirm-dialog";
import { type DeleteAccountActionResult, deleteAccountAction } from "@/app/_components/profile/profile-actions";
import { ProfileSection, SignInAgainNotice } from "@/app/_components/profile/profile-section";
import { BUTTON } from "@/app/_components/ui";
import { authClient } from "@/lib/auth/client";
import { PROFILE_PATH } from "@/lib/auth/destination";
import { buildAuthErrorMessage } from "@/lib/auth/errors";
import { CREDENTIAL_PROVIDER_ID, SOCIAL_PROVIDERS, SOCIAL_PROVIDER_NAMES, type SocialProvider, getProviderName } from "@/lib/auth/providers";

type OwnedAccount = { id: string; providerId: string; email: string | null };

type AccountsSectionProps = { accounts: OwnedAccount[]; userEmail: string; isFresh: boolean; linkError?: string };

const REASON_MESSAGES: Record<Extract<DeleteAccountActionResult, { ok: false }>["reason"], string> = {
  "login-antigo": "Entre de novo para desligar uma Conta.",
  "conta-nao-encontrada": "Esta Conta não está mais ligada.",
  "conta-de-senha": "A Conta de e-mail e senha não pode ser desligada.",
  "ultima-conta": "Esta é a sua única Conta. Ligue outra antes de desligar.",
  "entrada-invalida": "Não deu certo. Tente de novo.",
};

const LOGOS = { google: GoogleLogo, github: GithubLogo };

// Contas de entrar, com o e-mail de cada uma; ligar e desligar pedem login recente
export function AccountsSection({ accounts, userEmail, isFresh, linkError }: AccountsSectionProps) {
  const [error, setError] = useState(linkError);
  const [isPending, setIsPending] = useState(false);
  const isOnlyAccount = accounts.length === 1;

  async function link(provider: SocialProvider) {
    setIsPending(true);
    setError(undefined);
    const { error: linkRefusal } = await authClient.linkSocial({ provider, callbackURL: PROFILE_PATH, errorCallbackURL: PROFILE_PATH });
    // Sem erro, o navegador já saiu para o Google ou o GitHub
    if (linkRefusal) {
      setError(buildAuthErrorMessage(linkRefusal));
      setIsPending(false);
    }
  }

  async function unlink(accountId: string) {
    const result = await deleteAccountAction({ accountId });
    return result.ok ? null : REASON_MESSAGES[result.reason];
  }

  return (
    <ProfileSection id="profile-accounts" title="Contas" description="As formas de entrar no seu Stood.">
      {error && <FormMessage tone="error">{error}</FormMessage>}
      {!isFresh && <SignInAgainNotice action="ligar ou desligar uma Conta" />}

      <ul className="grid grid-cols-1 divide-y divide-border rounded-md border border-border">
        {accounts.map((account) => (
          <li key={account.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <AccountLogo providerId={account.providerId} />
            <div className="min-w-0 flex-1">
              <p className="text-ui font-medium">{buildAccountTitle(account.providerId)}</p>
              <p className="truncate text-meta text-text-muted">{buildAccountEmail(account, userEmail)}</p>
            </div>
            {account.providerId !== CREDENTIAL_PROVIDER_ID &&
              (isOnlyAccount || !isFresh ? (
                <button
                  type="button"
                  disabled
                  title={isOnlyAccount ? REASON_MESSAGES["ultima-conta"] : REASON_MESSAGES["login-antigo"]}
                  className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}
                >
                  Desligar
                </button>
              ) : (
                <ConfirmDialog
                  title={`Desligar ${buildAccountTitle(account.providerId)}`}
                  confirmLabel="Desligar Conta"
                  trigger="Desligar"
                  triggerLabel={`Desligar ${buildAccountTitle(account.providerId)}, ${buildAccountEmail(account, userEmail)}`}
                  triggerClassName={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}
                  onConfirm={() => unlink(account.id)}
                >
                  <p>As suas outras sessões serão encerradas.</p>
                  <p>Se o e-mail desta Conta for igual ao seu, entrar de novo por ela a liga outra vez.</p>
                  <p className="text-text-muted">
                    A permissão que você deu ao Stood continua lá: para retirá-la, use as configurações do {buildAccountTitle(account.providerId)}.
                  </p>
                </ConfirmDialog>
              ))}
          </li>
        ))}
      </ul>

      {isOnlyAccount && (
        <p className="text-ui text-text-muted">
          Você só tem uma Conta. Ligue outra para não perder o seu Stood se ficar sem acesso a ela.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {SOCIAL_PROVIDERS.map((provider) => {
          const Logo = LOGOS[provider];
          return (
            <button
              key={provider}
              type="button"
              disabled={isPending || !isFresh}
              onClick={() => link(provider)}
              className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
            >
              <Logo />
              Ligar {SOCIAL_PROVIDER_NAMES[provider]}
            </button>
          );
        })}
      </div>
    </ProfileSection>
  );
}

function AccountLogo({ providerId }: { providerId: string }) {
  if (providerId === "google") return <GoogleLogo size={18} />;
  if (providerId === "github") return <GithubLogo size={18} />;
  return <Mail size={18} strokeWidth={1.75} aria-hidden className="text-text-muted" />;
}

function buildAccountTitle(providerId: string) {
  return providerId === CREDENTIAL_PROVIDER_ID ? "E-mail e senha" : getProviderName(providerId);
}

// A Conta antiga só mostra o e-mail depois do próximo login por ela
function buildAccountEmail({ providerId, email }: OwnedAccount, userEmail: string) {
  if (providerId === CREDENTIAL_PROVIDER_ID) return userEmail;
  return email ?? "O e-mail aparece no próximo login por ela";
}
