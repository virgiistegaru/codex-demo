import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";

const databasePath = resolve(process.cwd(), process.env.DB_PATH ?? "./data/tinynotes.db");
mkdirSync(dirname(databasePath), { recursive: true });

const globalForDatabase = globalThis as typeof globalThis & {
  tinyNotesDatabase?: Database;
};

export const db =
  globalForDatabase.tinyNotesDatabase ?? new Database(databasePath, { create: true });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.tinyNotesDatabase = db;
}

db.run("PRAGMA foreign_keys = ON;");
