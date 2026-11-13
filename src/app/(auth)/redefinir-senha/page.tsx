import { AuthCard, FormMessage } from "@/app/_components/auth-card";
import { TEXT_LINK } from "@/app/_components/ui";
import { buildAuthErrorMessage } from "@/lib/auth/errors";
import { ResetPasswordForm } from "./reset-password-form";

// O link do e-mail passa por /auth/reset-password e chega aqui com ?token=, ou com ?error= se expirou
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;

  return (
    <AuthCard title="Criar senha nova">
      {token && !error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="grid gap-3">
          <FormMessage tone="error">{buildAuthErrorMessage({ code: "INVALID_TOKEN" })}</FormMessage>
          <a href="/esqueci-a-senha" className={TEXT_LINK}>
            Pedir um link novo
          </a>
        </div>
      )}
    </AuthCard>
  );
}
