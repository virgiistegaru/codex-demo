import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "@/src/lib/db";

export type NoteSummary = {
  id: string;
  title: string;
  share_enabled: 0 | 1;
  updated_at: string;
};

export type SharedNoteRecord = {
  title: string;
  content_json: string;
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
      `SELECT id, title, share_enabled, updated_at
       FROM note
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
    )
    .all(userId) as NoteSummary[];
}

export function getNoteForUser(id: string, userId: string): NoteRecord | null {
  return db
    .query(
      `SELECT id, user_id, title, content_json, share_enabled, created_at, updated_at
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

export function deleteNote(id: string, userId: string): boolean {
  return db.query("DELETE FROM note WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

export function enableNoteShare(id: string, userId: string): string | null {
  return db
    .transaction(() => {
      const now = new Date().toISOString();
      const updated = db
        .query("UPDATE note SET share_enabled = 1, updated_at = ? WHERE id = ? AND user_id = ?")
        .run(now, id, userId);
      if (updated.changes === 0) return null;

      // Tokens cannot be recovered from their hashes. Generate a fresh link each time
      // and revoke previous links in the same transaction.
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      db.query(
        "UPDATE note_share SET enabled = 0, disabled_at = ? WHERE note_id = ? AND enabled = 1",
      ).run(now, id);
      db.query(
        `INSERT INTO note_share (id, note_id, token_hash, enabled, created_at, disabled_at)
       VALUES (?, ?, ?, 1, ?, NULL)`,
      ).run(randomUUID(), id, tokenHash, now);
      return token;
    })
    .immediate();
}

export function disableNoteShare(id: string, userId: string): boolean {
  return db
    .transaction(() => {
      const now = new Date().toISOString();
      const updated = db
        .query("UPDATE note SET share_enabled = 0, updated_at = ? WHERE id = ? AND user_id = ?")
        .run(now, id, userId);
      if (updated.changes === 0) return false;

      db.query(
        "UPDATE note_share SET enabled = 0, disabled_at = ? WHERE note_id = ? AND enabled = 1",
      ).run(now, id);
      return true;
    })
    .immediate();
}

export function getSharedNoteByToken(token: string): SharedNoteRecord | null {
  // A 32-byte, unpadded base64url token is always 43 characters long.
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return db
    .query(
      `SELECT n.title, n.content_json, n.updated_at
       FROM note_share s
       JOIN note n ON n.id = s.note_id
       WHERE s.token_hash = ? AND s.enabled = 1 AND n.share_enabled = 1
       LIMIT 1`,
    )
    .get(tokenHash) as SharedNoteRecord | null;
}
