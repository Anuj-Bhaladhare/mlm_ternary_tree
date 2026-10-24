import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("postgres://") ||
        value.startsWith("postgresql://"),
      "DATABASE_URL must be a PostgreSQL connection URL",
    ),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must contain at least 32 characters"),
  BETTER_AUTH_URL: z.string().url(),
});

const adminBootstrapEnvSchema = z.object({
  ADMIN_ID: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
    .transform((value) => value.toUpperCase()),
  ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
  // This must be an independently generated secret. It is only accepted while
  // the predefined administrator has no password and is never sent to clients.
  ADMIN_SETUP_TOKEN: z.string().min(32),
});

const adminCreationEnvSchema = z.object({
  ADMIN_CREATION_KEY: z.string().min(16),
});

const configuredAdminEnvSchema = z.object({
  APP_ADMIN_USER: z.string().trim().toLowerCase().pipe(z.email()),
  APP_ADMIN_PASSWORD: z.string().min(12).max(128),
});

export function getConfiguredAdminEnv(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const email = environment.APP_ADMIN_USER;
  const password = environment.APP_ADMIN_PASSWORD;

  if (email === undefined && password === undefined) {
    return null;
  }
  if (email === undefined || password === undefined) {
    throw new Error(
      "Set both APP_ADMIN_USER and APP_ADMIN_PASSWORD to enable administrator startup provisioning.",
    );
  }

  const result = configuredAdminEnvSchema.safeParse({
    APP_ADMIN_USER: email,
    APP_ADMIN_PASSWORD: password,
  });

  if (!result.success) {
    throw new Error(
      "Administrator startup configuration is invalid. Set APP_ADMIN_USER to a valid email and APP_ADMIN_PASSWORD to a 12–128 character password.",
    );
  }

  return {
    email: result.data.APP_ADMIN_USER,
    password: result.data.APP_ADMIN_PASSWORD,
  };
}

export function getAdminCreationKey(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const result = adminCreationEnvSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(
      "Administrator registration is not configured. Set ADMIN_CREATION_KEY to a random secret containing at least 16 characters.",
    );
  }

  return result.data.ADMIN_CREATION_KEY;
}

export function getServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter((field, index, allFields) => allFields.indexOf(field) === index);

    throw new Error(
      `Server configuration is missing or invalid: ${fields.join(", ")}`,
    );
  }

  return result.data;
}

export function getAdminBootstrapEnv() {
  const result = adminBootstrapEnvSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      "Administrator bootstrap is not configured. Set ADMIN_ID, ADMIN_EMAIL, and ADMIN_SETUP_TOKEN.",
    );
  }

  return result.data;
}
