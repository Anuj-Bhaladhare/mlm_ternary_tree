export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { getAdminCreationKey } = await import("./lib/env-config");
  getAdminCreationKey();

  const { ensureConfiguredAdministrator } = await import(
    "./server/auth/configured-admin"
  );

  await ensureConfiguredAdministrator();
}
