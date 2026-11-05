import { Database } from "bun:sqlite";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const migrationDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");
const databasePath = resolve(process.cwd(), process.env.DB_PATH ?? "./data/tinynotes.db");

async function migrate() {
  await mkdir(dirname(databasePath), { recursive: true });

  const database = new Database(databasePath, { create: true });

  try {
    database.run("PRAGMA foreign_keys = ON;");
    database.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const appliedRows = database.query("SELECT version FROM schema_migrations").all() as Array<{
      version: string;
    }>;
    const appliedVersions = new Set(appliedRows.map((row) => row.version));
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((filename) => filename.endsWith(".sql"))
      .sort();

    for (const filename of migrationFiles) {
      if (appliedVersions.has(filename)) {
        console.info(`Skipping already applied migration: ${filename}`);
        continue;
      }

      const sql = await readFile(resolve(migrationDirectory, filename), "utf8");
      const appliedAt = new Date().toISOString();
      const applyMigration = database.transaction(() => {
        database.run(sql);
        database
          .query("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
          .run(filename, appliedAt);
      });

      applyMigration();
      appliedVersions.add(filename);
      console.info(`Applied migration: ${filename}`);
    }

    console.info(`Database is up to date: ${databasePath}`);
  } finally {
    database.close();
  }
}

await migrate().catch((error: unknown) => {
  console.error("Database migration failed; the current migration was rolled back.");
  console.error(error);
  process.exitCode = 1;
});
