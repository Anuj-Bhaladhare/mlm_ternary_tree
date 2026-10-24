import "server-only";

import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { getConfiguredAdminEnv } from "@/lib/env-config";
import { db } from "@/server/db";
import { accounts, auditLogs, userRoles, users } from "@/server/db/schema";
import { initializeRoleCatalog } from "@/server/db/role-catalog";

export async function ensureConfiguredAdministrator() {
  const configuredAdmin = getConfiguredAdminEnv();

  if (!configuredAdmin) {
    return;
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2481450292)`);
    const savedRoles = await initializeRoleCatalog(tx);
    const administratorRole = savedRoles.find(
      ({ code }) => code === "administrator",
    );

    if (!administratorRole) {
      throw new Error("Unable to initialize the administrator role.");
    }

    let [administrator] = await tx
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${configuredAdmin.email}`)
      .limit(1);

    const isNewAdministrator = administrator === undefined;

    if (!administrator) {
      const userId = crypto.randomUUID();
      const passwordHash = await hashPassword(configuredAdmin.password);

      [administrator] = await tx
        .insert(users)
        .values({
          id: userId,
          name: "Administrator",
          email: configuredAdmin.email,
          isActive: true,
          passwordSetAt: new Date(),
        })
        .returning({ id: users.id });

      await tx.insert(accounts).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });
    }

    if (isNewAdministrator) {
      await tx.insert(userRoles).values({
        userId: administrator.id,
        roleId: administratorRole.id,
      });

      await tx.insert(auditLogs).values({
        actorId: administrator.id,
        action: "admin.startup.initialized",
        resourceType: "user",
        resourceId: administrator.id,
        outcome: "success",
        metadata: { source: "environment_configuration" },
      });
      return;
    }

    const [existingAdminRole] = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(
        sql`${userRoles.userId} = ${administrator.id} AND ${userRoles.roleId} = ${administratorRole.id}`,
      )
      .limit(1);

    if (!existingAdminRole) {
      throw new Error(
        "The configured administrator email belongs to an account without administrator access. Refusing to elevate an existing account.",
      );
    }
  });
}
