import { sql } from "drizzle-orm";
import { closeDatabase, db } from "./client";
import { initializeRoleCatalog } from "./role-catalog";

async function seed() {
  await db.transaction(async (tx) => {
    const savedRoles = await initializeRoleCatalog(tx);

    const memberRole = savedRoles.find(({ code }) => code === "member");
    if (!memberRole) {
      throw new Error('Unable to initialize the "member" role.');
    }

    await tx.execute(sql`
      INSERT INTO user_roles (user_id, role_id)
      SELECT "user".id, ${memberRole.id}
      FROM "user"
      WHERE NOT EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_roles.user_id = "user".id
      )
      ON CONFLICT DO NOTHING
    `);
  });
}

seed()
  .then(async () => {
    console.info("Role and permission catalog initialized.");
    await closeDatabase();
  })
  .catch(async (error: unknown) => {
    console.error("Database seeding failed.", error);
    await closeDatabase();
    process.exitCode = 1;
  });
