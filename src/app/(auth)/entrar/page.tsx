import { AuthCard } from "@/app/_components/auth/auth-card";
import { SignInForm } from "@/app/_components/auth/sign-in-form";
import { parseDestination } from "@/lib/auth/destination";
import { buildAuthErrorMessage } from "@/lib/auth/errors";

// Página de login, com o formulário de login e os botões de login social
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; destino?: string | string[] }> }) {
  const { error, destino } = await searchParams;
  const initialError = error ? buildAuthErrorMessage({ code: error }) : undefined;

  return (
    <AuthCard title="Entrar no Stood" description="Use sua conta do Google, do GitHub ou seu e-mail.">
      <SignInForm initialError={initialError} destination={parseDestination(destino)} />
    </AuthCard>
  );
}
