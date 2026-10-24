import { eq, sql } from "drizzle-orm";
import { closeDatabase, db } from "./client";
import { auditLogs, roles, userRoles, users } from "./schema";

async function bootstrapAdministrator(email: string | undefined) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      "Provide the email address of an account that has already registered.",
    );
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1879048192)`);

    const [administratorRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, "administrator"))
      .limit(1);
    const [user] = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (!administratorRole) {
      throw new Error("Administrator role is missing. Run `npm run db:seed`.");
    }
    if (!user) {
      throw new Error("No registered user exists with that email address.");
    }

    const existingAdministrators = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, administratorRole.id))
      .limit(1);

    if (existingAdministrators.length > 0) {
      throw new Error(
        "An administrator already exists; bootstrap is restricted to the first administrator.",
      );
    }

    await tx.insert(userRoles).values({
      userId: user.id,
      roleId: administratorRole.id,
    });

    await tx.insert(auditLogs).values({
      actorId: user.id,
      action: "bootstrap.initial_administrator",
      resourceType: "user",
      resourceId: user.id,
      outcome: "success",
      metadata: { source: "one-time-command-line-bootstrap" },
    });

    console.info(
      `Initial administrator access granted to ${user.email}. Treat this as a one-time bootstrap operation.`,
    );
  });
}

bootstrapAdministrator(process.argv[2])
  .catch((error: unknown) => {
    console.error("Administrator bootstrap failed.", error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
