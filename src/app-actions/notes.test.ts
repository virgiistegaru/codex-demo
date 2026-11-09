import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteNoteAction, disableShareAction, enableShareAction } from "@/src/app-actions/notes";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  deleteNote: vi.fn(),
  enableNoteShare: vi.fn(),
  disableNoteShare: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/src/lib/auth-session", () => ({ getSession: mocks.getSession }));
vi.mock("@/src/lib/notes", () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: mocks.deleteNote,
  enableNoteShare: mocks.enableNoteShare,
  disableNoteShare: mocks.disableNoteShare,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const noteId = "0998273d-7d90-4cc5-88e8-a031a93df4eb";
const userId = "signed-in-owner";
const token = "a".repeat(43);

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  mocks.getSession.mockResolvedValue({ user: { id: userId } });
  mocks.deleteNote.mockReturnValue(true);
  mocks.enableNoteShare.mockReturnValue(token);
  mocks.disableNoteShare.mockReturnValue(true);
});

const actions = [deleteNoteAction, enableShareAction, disableShareAction];

describe("note deletion and sharing authorization", () => {
  it.each(actions)("requires a session before touching note data", async (action) => {
    mocks.getSession.mockResolvedValue(null);

    expect(await action({ id: noteId })).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.deleteNote).not.toHaveBeenCalled();
    expect(mocks.enableNoteShare).not.toHaveBeenCalled();
    expect(mocks.disableNoteShare).not.toHaveBeenCalled();
  });

  it.each(actions)("rejects invalid IDs before touching note data", async (action) => {
    for (const input of [null, undefined, {}, { id: 42 }, { id: "invalid" }]) {
      expect(await action(input as { id: string })).toMatchObject({
        success: false,
        error: { code: "VALIDATION_ERROR" },
      });
    }
    expect(mocks.deleteNote).not.toHaveBeenCalled();
    expect(mocks.enableNoteShare).not.toHaveBeenCalled();
    expect(mocks.disableNoteShare).not.toHaveBeenCalled();
  });

  it.each(actions)("treats missing and non-owned notes as not found", async (action) => {
    mocks.deleteNote.mockReturnValue(false);
    mocks.enableNoteShare.mockReturnValue(null);
    mocks.disableNoteShare.mockReturnValue(false);

    expect(await action({ id: noteId })).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND", message: "This note could not be found." },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each(actions)("returns generic failures for session lookup errors", async (action) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getSession.mockRejectedValue(new Error("secret session database detail"));

    const result = await action({ id: noteId });
    expect(result).toMatchObject({ success: false, error: { code: "INTERNAL_ERROR" } });
    expect(JSON.stringify(result)).not.toContain("secret");
    log.mockRestore();
  });

  it.each(actions)("returns generic failures for database errors", async (action) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fail = () => {
      throw new Error("secret SQL detail");
    };
    mocks.deleteNote.mockImplementation(fail);
    mocks.enableNoteShare.mockImplementation(fail);
    mocks.disableNoteShare.mockImplementation(fail);

    const result = await action({ id: noteId });
    expect(result).toMatchObject({ success: false, error: { code: "INTERNAL_ERROR" } });
    expect(JSON.stringify(result)).not.toContain("SQL");
    log.mockRestore();
  });
});

describe("successful note actions", () => {
  it("deletes with the signed-in user's ID and invalidates note and share pages", async () => {
    expect(await deleteNoteAction({ id: noteId })).toEqual({ success: true });
    expect(mocks.deleteNote).toHaveBeenCalledWith(noteId, userId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/notes");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/notes/${noteId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/s/[token]", "page");
  });

  it("constructs share links from APP_URL and returns the token once", async () => {
    vi.stubEnv("APP_URL", "https://notes.example.com/");

    expect(await enableShareAction({ id: noteId })).toEqual({
      success: true,
      token,
      shareUrl: `https://notes.example.com/s/${token}`,
      shareEnabled: true,
    });
    expect(mocks.enableNoteShare).toHaveBeenCalledWith(noteId, userId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/s/[token]", "page");
  });

  it("does not enable sharing if APP_URL is invalid", async () => {
    vi.stubEnv("APP_URL", "javascript:alert(1)");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await enableShareAction({ id: noteId })).toMatchObject({
      success: false,
      error: { code: "INTERNAL_ERROR" },
    });
    expect(mocks.enableNoteShare).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("revokes sharing with the signed-in user's ID", async () => {
    expect(await disableShareAction({ id: noteId })).toEqual({
      success: true,
      shareEnabled: false,
    });
    expect(mocks.disableNoteShare).toHaveBeenCalledWith(noteId, userId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/s/[token]", "page");
  });
});
