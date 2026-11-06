import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/src/lib/db";

export type NoteSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export type NoteRecord = NoteSummary & {
  user_id: string;
  content_json: string;
  created_at: string;
};

export function listNotesForUser(userId: string): NoteSummary[] {
  return db
    .query(
      `SELECT id, title, updated_at
       FROM note
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
    )
    .all(userId) as NoteSummary[];
}

export function getNoteForUser(id: string, userId: string): NoteRecord | null {
  return db
    .query(
      `SELECT id, user_id, title, content_json, created_at, updated_at
       FROM note
       WHERE id = ? AND user_id = ?`,
    )
    .get(id, userId) as NoteRecord | null;
}

export function createNote(userId: string, title: string, contentJson: string): string {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.query(
    `INSERT INTO note (id, user_id, title, content_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, title, contentJson, now, now);
  return id;
}

export function updateNote(
  id: string,
  userId: string,
  title: string,
  contentJson: string,
): boolean {
  const result = db
    .query(
      `UPDATE note
       SET title = ?, content_json = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(title, contentJson, new Date().toISOString(), id, userId);
  return result.changes > 0;
}
