import { AuthCard } from "@/app/_components/auth/auth-card";
import { SignUpForm } from "@/app/_components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthCard title="Criar conta" description="Cadastre-se com e-mail e senha ou entre com Google ou GitHub.">
      <SignUpForm />
    </AuthCard>
  );
}
