import type { Metadata } from "next";
import { AccountsSection } from "@/app/_components/profile/accounts-section";
import { DeletionSection } from "@/app/_components/profile/deletion-section";
import { NameForm } from "@/app/_components/profile/name-form";
import { PasswordForm } from "@/app/_components/profile/password-form";
import { ProfileSection } from "@/app/_components/profile/profile-section";
import { SessionsSection } from "@/app/_components/profile/sessions-section";
import { UserAvatar } from "@/app/_components/user-avatar";
import { getAccounts } from "@/lib/auth/accounts";
import { buildAuthErrorMessage } from "@/lib/auth/errors";
import { isFreshSession } from "@/lib/auth/freshness";
import { getSessions } from "@/lib/auth/profile";
import { CREDENTIAL_PROVIDER_ID } from "@/lib/auth/providers";
import { requireCurrentSession } from "@/lib/auth/session";
import { buildLastUsedLabel } from "@/lib/auth/user-agent";

export const metadata: Metadata = { title: "Perfil · Stood" };

type ProfilePageProps = { searchParams: Promise<{ error?: string | string[] }> };

// Perfil: o Usuário vê e muda os próprios dados. A recusa ao ligar uma Conta volta no endereço, como em /entrar.
export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const current = await requireCurrentSession();
  const { error } = await searchParams;
  const now = new Date();
  const [accounts, sessions] = await Promise.all([getAccounts(current.user.id), getSessions(current, now)]);
  const isFresh = isFreshSession(current.session.createdAt, now);
  const hasPassword = accounts.some((account) => account.providerId === CREDENTIAL_PROVIDER_ID);

  return (
    <main className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-5 px-4 pt-7 pb-16 md:pt-10 2xl:pt-14">
      <h1 className="text-3xl font-medium tracking-tight 2xl:text-4xl">Perfil</h1>

      <ProfileSection id="profile-data" title="Dados">
        <div className="flex items-center gap-3">
          <UserAvatar name={current.user.name} email={current.user.email} image={current.user.image} className="size-12 text-lg" />
          <div className="min-w-0">
            <p className="text-meta text-text-muted">E-mail</p>
            <p className="truncate text-ui">{current.user.email}</p>
          </div>
        </div>
        <NameForm name={current.user.name} />
      </ProfileSection>

      <AccountsSection
        accounts={accounts}
        userEmail={current.user.email}
        isFresh={isFresh}
        linkError={typeof error === "string" ? buildAuthErrorMessage({ code: error }) : undefined}
      />

      {hasPassword && (
        <ProfileSection id="profile-password" title="Senha" description="Trocar a senha encerra as suas outras sessões.">
          <PasswordForm />
        </ProfileSection>
      )}

      <SessionsSection
        sessions={sessions.map(({ id, browser, system, lastUsedAt, isCurrent }) => ({
          id,
          label: system ? `${browser} no ${system}` : browser,
          lastUsed: buildLastUsedLabel(lastUsedAt, now),
          isCurrent,
        }))}
      />

      <DeletionSection email={current.user.email} isFresh={isFresh} />
    </main>
  );
}
