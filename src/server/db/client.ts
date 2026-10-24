import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getServerEnv } from "../../lib/env-config";
import * as schema from "./schema";

const client = postgres(getServerEnv().DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export const closeDatabase = () => client.end({ timeout: 5 });
