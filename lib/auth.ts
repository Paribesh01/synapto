import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db/prisma";

/**
 * Better Auth configuration.
 *
 * Notes:
 * - Email/password enabled (no email verification for MVP).
 * - Prisma adapter stores users/sessions/accounts in `prisma/schema.prisma`.
 */
export const auth = betterAuth({
  baseURL: "http://localhost:3000",
  trustedOrigins: ["http://localhost:3000"],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {},
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
});

export type AuthSession = Awaited<
  ReturnType<typeof auth.api.getSession>
> extends infer T
  ? T
  : never;


