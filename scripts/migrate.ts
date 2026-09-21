import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const connection = postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
  });
  try {
    const directory = resolve(process.cwd(), "lib/db/migrations");
    const files = (await readdir(directory))
      .filter((file) => /^\d+.*\.sql$/.test(file))
      .sort();
    await connection.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(73398412)`;
      await tx`CREATE TABLE IF NOT EXISTS stockradar_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
      for (const file of files) {
        const existing =
          await tx`SELECT name FROM stockradar_migrations WHERE name=${file}`;
        if (existing.length) continue;
        await tx.unsafe(await readFile(resolve(directory, file), "utf8"));
        await tx`INSERT INTO stockradar_migrations(name) VALUES (${file})`;
        console.log(`Applied migration ${file}`);
      }
    });
    console.log("Database migrations complete.");
  } finally {
    await connection.end({ timeout: 5 });
  }
}
main().catch(() => {
  console.error(
    "Migration failed. Check DATABASE_URL, database availability and schema permissions. Connection details are withheld.",
  );
  process.exitCode = 1;
});
