import { createAuthClient } from "better-auth/react";

// Client da Better Auth para as telas: chama /auth/*, onde vale o rate limit da lib.
export const authClient = createAuthClient({ basePath: "/auth" });
