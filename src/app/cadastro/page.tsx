import { AuthCard } from "@/components/auth-card";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <AuthCard title="Criar conta" description="Cadastre-se com e-mail e senha ou entre com Google ou GitHub.">
      <SignUpForm />
    </AuthCard>
  );
}
