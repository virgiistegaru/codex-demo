import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";

const database = new Database(":memory:");
database.run("PRAGMA foreign_keys = ON");
database.run(await Bun.file(new URL("../../migrations/0001_init.sql", import.meta.url)).text());
database.run(await Bun.file(new URL("../../migrations/0002_notes.sql", import.meta.url)).text());

mock.module("server-only", () => ({}));
mock.module("@/src/lib/db", () => ({ db: database }));

const {
  createNote,
  deleteNote,
  disableNoteShare,
  enableNoteShare,
  getNoteForUser,
  getSharedNoteByToken,
  listNotesForUser,
  updateNote,
} = await import("../../src/lib/notes");

const ownerId = "owner";
const otherId = "other";
const contentJson = '{"type":"doc","content":[{"type":"paragraph"}]}';

beforeEach(() => {
  database.run("DROP TRIGGER IF EXISTS fail_share_insert");
  database.run("DELETE FROM user");
  const insert = database.query(
    "INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
  );
  for (const id of [ownerId, otherId]) {
    insert.run(id, id, `${id}@example.com`, "2026-01-01", "2026-01-01");
  }
});

afterAll(() => database.close());

describe("note sharing data access", () => {
  it("stores only a hash and exposes only a shared note's public fields", () => {
    const id = createNote(ownerId, "Shared title", contentJson);
    const token = enableNoteShare(id, ownerId)!;
    const share = database.query("SELECT * FROM note_share WHERE note_id = ?").get(id);

    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(share).toMatchObject({
      token_hash: createHash("sha256").update(token).digest("hex"),
      enabled: 1,
      disabled_at: null,
    });
    expect(JSON.stringify(share)).not.toContain(token);
    expect(getSharedNoteByToken(token)).toEqual({
      title: "Shared title",
      content_json: contentJson,
      updated_at: getNoteForUser(id, ownerId)!.updated_at,
    });
    expect(listNotesForUser(ownerId)[0].share_enabled).toBe(1);
  });

  it("prevents other users from enabling, rotating, revoking, or deleting a note", () => {
    const id = createNote(ownerId, "Private", contentJson);
    expect(enableNoteShare(id, otherId)).toBeNull();
    expect(getNoteForUser(id, ownerId)!.share_enabled).toBe(0);
    const token = enableNoteShare(id, ownerId)!;

    expect(enableNoteShare(id, otherId)).toBeNull();
    expect(disableNoteShare(id, otherId)).toBe(false);
    expect(deleteNote(id, otherId)).toBe(false);
    expect(getSharedNoteByToken(token)).not.toBeNull();
    expect(database.query("SELECT count(*) AS count FROM note_share").get()).toEqual({ count: 1 });
  });

  it("rotates links and retains disabled history with exactly one active share", () => {
    const id = createNote(ownerId, "Rotate", contentJson);
    const oldToken = enableNoteShare(id, ownerId)!;
    const newToken = enableNoteShare(id, ownerId)!;

    expect(newToken).not.toBe(oldToken);
    expect(getSharedNoteByToken(oldToken)).toBeNull();
    expect(getSharedNoteByToken(newToken)).not.toBeNull();
    expect(
      database.query("SELECT count(*) AS count FROM note_share WHERE note_id = ?").get(id),
    ).toEqual({ count: 2 });
    expect(
      database
        .query("SELECT count(*) AS count FROM note_share WHERE note_id = ? AND enabled = 1")
        .get(id),
    ).toEqual({ count: 1 });
    expect(
      database.query("SELECT disabled_at FROM note_share WHERE enabled = 0").get(),
    ).toMatchObject({ disabled_at: expect.any(String) });
  });

  it("revokes every existing link and keeps revoked links invalid after re-enabling", () => {
    const id = createNote(ownerId, "Revoke", contentJson);
    const oldToken = enableNoteShare(id, ownerId)!;

    expect(disableNoteShare(id, ownerId)).toBe(true);
    expect(disableNoteShare(id, ownerId)).toBe(true);
    expect(getSharedNoteByToken(oldToken)).toBeNull();
    expect(getNoteForUser(id, ownerId)!.share_enabled).toBe(0);

    const newToken = enableNoteShare(id, ownerId)!;
    expect(getSharedNoteByToken(oldToken)).toBeNull();
    expect(getSharedNoteByToken(newToken)).not.toBeNull();
  });

  it("returns current note content and requires both share flags", () => {
    const id = createNote(ownerId, "Original", contentJson);
    const token = enableNoteShare(id, ownerId)!;
    expect(updateNote(id, ownerId, "Edited", contentJson)).toBe(true);
    expect(getSharedNoteByToken(token)!.title).toBe("Edited");

    database.query("UPDATE note SET share_enabled = 0 WHERE id = ?").run(id);
    expect(getSharedNoteByToken(token)).toBeNull();
    database.query("UPDATE note SET share_enabled = 1 WHERE id = ?").run(id);
    database.query("UPDATE note_share SET enabled = 0 WHERE note_id = ?").run(id);
    expect(getSharedNoteByToken(token)).toBeNull();
  });

  it("rolls back link rotation if a new share cannot be stored", () => {
    const id = createNote(ownerId, "Atomic", contentJson);
    const token = enableNoteShare(id, ownerId)!;
    const previousNote = getNoteForUser(id, ownerId);
    database.run(
      `CREATE TRIGGER fail_share_insert BEFORE INSERT ON note_share
       BEGIN SELECT RAISE(ABORT, 'simulated failure'); END`,
    );

    expect(() => enableNoteShare(id, ownerId)).toThrow("simulated failure");
    expect(getNoteForUser(id, ownerId)).toEqual(previousNote);
    expect(getSharedNoteByToken(token)).not.toBeNull();
    expect(database.query("SELECT count(*) AS count FROM note_share").get()).toEqual({ count: 1 });
  });

  it("deletes a note and cascades its active and disabled share records", () => {
    const id = createNote(ownerId, "Delete", contentJson);
    enableNoteShare(id, ownerId);
    const token = enableNoteShare(id, ownerId)!;

    expect(deleteNote(id, ownerId)).toBe(true);
    expect(deleteNote(id, ownerId)).toBe(false);
    expect(getNoteForUser(id, ownerId)).toBeNull();
    expect(getSharedNoteByToken(token)).toBeNull();
    expect(database.query("SELECT count(*) AS count FROM note_share").get()).toEqual({ count: 0 });
  });

  it("rejects malformed and unknown tokens", () => {
    for (const token of ["", "short", "a".repeat(43), "!".repeat(43), "a".repeat(1000)]) {
      expect(getSharedNoteByToken(token)).toBeNull();
    }
  });
});
