import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getServerEnv } from "../../lib/env-config";

const env = getServerEnv();
const sql = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(sql);

async function runMigrations() {
  console.info("Applying pending database migrations from ./drizzle...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.info("Database migrations applied successfully.");
  await sql.end({ timeout: 5 });
}

runMigrations().catch(async (error: unknown) => {
  console.error("Database migration failed:", error);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
