import "server-only";

import { z } from "zod";

// Tamanho mínimo de segredo de sessão da Better Auth
const MIN_AUTH_SECRET_LENGTH = 32;

const requiredString = z.string().min(1);

// Linha vazia copiada do .env.example conta como ausente
const optionalString = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    BETTER_AUTH_SECRET: z.string().min(MIN_AUTH_SECRET_LENGTH),
    BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
    GOOGLE_CLIENT_ID: requiredString,
    GOOGLE_CLIENT_SECRET: requiredString,
    GITHUB_CLIENT_ID: requiredString,
    GITHUB_CLIENT_SECRET: requiredString,
    RESEND_API_KEY: optionalString,
  })
  .refine((env) => env.NODE_ENV !== "production" || env.RESEND_API_KEY !== undefined, {
    path: ["RESEND_API_KEY"],
    message: "required in production",
  });

export type Env = z.infer<typeof envSchema>;

export function requireEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // Só os nomes: o valor de um segredo nunca vai para a mensagem
    const names = new Set(result.error.issues.map((issue) => String(issue.path[0])));
    throw new Error(`invalid environment variables: ${[...names].join(", ")}`);
  }
  return result.data;
}
