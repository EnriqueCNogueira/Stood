import { AuthCard } from "@/app/_components/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Esqueci a senha" description="Mandamos para o seu e-mail um link para criar uma senha nova.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
