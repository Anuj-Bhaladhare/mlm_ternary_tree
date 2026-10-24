import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
  APIError,
  createAuthEndpoint,
  formCsrfMiddleware,
} from "better-auth/api";
import { betterAuth } from "better-auth";
import { getServerEnv }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     from "@/lib/env";
import { adminRegistrationSchema } from "@/modules/auth/rules";
import { db } from "@/server/db";
import { authSchema, roles, userRoles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  AccountDomainError,
  isUserEligibleForSession,
  registerAdministrator,
} from "./account-service";

const env = getServerEnv();

const adminRegistrationPlugin = {
  id: "admin-registration",
  endpoints: {
    registerAdministrator: createAuthEndpoint(
      "/admin-register",
      {
        method: "POST",
        body: adminRegistrationSchema,
        use: [formCsrfMiddleware],
      },
      async (context) => {
        try {
          await registerAdministrator(context.body);
          return context.json({ data: { registered: true } });
        } catch (error) {
          if (error instanceof AccountDomainError) {
            const status =
              error.code === "ADMIN_EMAIL_TAKEN"
                ? "CONFLICT"
                : "BAD_REQUEST";
            throw APIError.from(status, {
              code: error.code,
              message: error.message,
            });
          }

          throw error;
        }
      },
    ),
  },
  rateLimit: [
    {
      window: 60,
      max: 5,
      pathMatcher: (path: string) => path === "/admin-register",
    },
  ],
};

export const auth = betterAuth({
  appName: "Ternary Tree Management",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    // Accounts are provisioned transactionally by an administrator. Public
    // Better Auth registration would otherwise create unlinked users.
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  plugins: [adminRegistrationPlugin],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const [memberRole] = await db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.code, "member"))
            .limit(1);

          if (!memberRole) {
            throw new Error(
              "Default roles are not initialized. Run `npm run db:seed` before accepting registrations.",
            );
          }

          await db
            .insert(userRoles)
            .values({ userId: user.id, roleId: memberRole.id })
            .onConflictDoNothing();
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          if (!(await isUserEligibleForSession(session.userId))) {
            // Keep the response indistinguishable from an invalid credential
            // and prevent inactive/PENDING members from receiving a session.
            throw APIError.from("UNAUTHORIZED", {
              code: "INVALID_EMAIL_OR_PASSWORD",
              message: "Invalid email or password.",
            });
          }
        },
      },
    },
  },
});
