import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let connection: ReturnType<typeof postgres> | undefined;
export function getDatabase() {
  if (!process.env.DATABASE_URL) return null;
  connection ??= postgres(process.env.DATABASE_URL, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 8,
    prepare: false,
  });
  return drizzle(connection, { schema });
}
export async function closeDatabase() {
  if (connection) await connection.end({ timeout: 5 });
  connection = undefined;
}
