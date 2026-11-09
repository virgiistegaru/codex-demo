"use server";

import { getSession } from "@/src/lib/auth-session";
import { revalidatePath } from "next/cache";
import {
  createNote,
  deleteNote,
  disableNoteShare,
  enableNoteShare,
  updateNote,
} from "@/src/lib/notes";
import { serializeTipTapDocument } from "@/src/lib/note-content";

export type SaveNoteInput = {
  id: string | null;
  title: string;
  contentJson: string;
};

export type SaveNoteResult = { success: true; id: string } | { success: false; message: string };

export type NoteActionInput = { id: string };
export type NoteActionFailure = {
  success: false;
  error: {
    code: "UNAUTHORIZED" | "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";
    message: string;
  };
};
export type DeleteNoteResult = { success: true } | NoteActionFailure;
export type EnableShareResult =
  | { success: true; shareUrl: string; token: string; shareEnabled: true }
  | NoteActionFailure;
export type DisableShareResult = { success: true; shareEnabled: false } | NoteActionFailure;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidNoteInput(input: NoteActionInput): boolean {
  return (
    !!input &&
    typeof input === "object" &&
    typeof input.id === "string" &&
    UUID_PATTERN.test(input.id)
  );
}

function actionFailure(
  code: NoteActionFailure["error"]["code"],
  message: string,
): NoteActionFailure {
  return { success: false, error: { code, message } };
}

function revalidateNote(id: string) {
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
  revalidatePath("/s/[token]", "page");
}

export async function saveNoteAction(input: SaveNoteInput): Promise<SaveNoteResult> {
  const session = await getSession();
  if (!session?.user.id) {
    return { success: false, message: "Your session expired. Sign in and try again." };
  }

  if (
    !input ||
    typeof input !== "object" ||
    (input.id !== null && typeof input.id !== "string") ||
    typeof input.title !== "string" ||
    input.title.trim().length > 200 ||
    typeof input.contentJson !== "string"
  ) {
    return { success: false, message: "Check the title and note content, then try again." };
  }

  const contentJson = serializeTipTapDocument(input.contentJson);
  if (!contentJson) {
    return { success: false, message: "The note content is invalid or too large." };
  }

  try {
    if (input.id === null) {
      const id = createNote(session.user.id, input.title.trim(), contentJson);
      revalidatePath("/notes");
      return { success: true, id };
    }

    if (!UUID_PATTERN.test(input.id)) {
      return { success: false, message: "This note could not be found." };
    }

    const updated = updateNote(input.id, session.user.id, input.title.trim(), contentJson);
    if (updated) revalidateNote(input.id);
    return updated
      ? { success: true, id: input.id }
      : { success: false, message: "This note could not be found." };
  } catch (error) {
    console.error("Note save failed", error);
    return { success: false, message: "We couldn't save your note. Please try again." };
  }
}

export async function deleteNoteAction(input: NoteActionInput): Promise<DeleteNoteResult> {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return actionFailure("UNAUTHORIZED", "Your session expired. Sign in and try again.");
    }
    if (!isValidNoteInput(input)) {
      return actionFailure("VALIDATION_ERROR", "Choose a valid note and try again.");
    }
    if (!deleteNote(input.id, session.user.id)) {
      return actionFailure("NOT_FOUND", "This note could not be found.");
    }
    revalidateNote(input.id);
    return { success: true };
  } catch (error) {
    console.error("Note deletion failed", error);
    return actionFailure("INTERNAL_ERROR", "We couldn't delete your note. Please try again.");
  }
}

export async function enableShareAction(input: NoteActionInput): Promise<EnableShareResult> {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return actionFailure("UNAUTHORIZED", "Your session expired. Sign in and try again.");
    }
    if (!isValidNoteInput(input)) {
      return actionFailure("VALIDATION_ERROR", "Choose a valid note and try again.");
    }

    // Validate configuration before changing share state. Never trust the request
    // host or a client-provided URL when constructing a public link.
    const shareBaseUrl = new URL("/s/", process.env.APP_URL ?? "http://localhost:3000");
    if (shareBaseUrl.protocol !== "http:" && shareBaseUrl.protocol !== "https:") {
      throw new Error("APP_URL must use HTTP or HTTPS");
    }
    const token = enableNoteShare(input.id, session.user.id);
    if (!token) return actionFailure("NOT_FOUND", "This note could not be found.");

    revalidateNote(input.id);
    return {
      success: true,
      shareUrl: new URL(token, shareBaseUrl).href,
      token,
      shareEnabled: true,
    };
  } catch (error) {
    console.error("Note sharing failed", error);
    return actionFailure("INTERNAL_ERROR", "We couldn't share your note. Please try again.");
  }
}

export async function disableShareAction(input: NoteActionInput): Promise<DisableShareResult> {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return actionFailure("UNAUTHORIZED", "Your session expired. Sign in and try again.");
    }
    if (!isValidNoteInput(input)) {
      return actionFailure("VALIDATION_ERROR", "Choose a valid note and try again.");
    }
    if (!disableNoteShare(input.id, session.user.id)) {
      return actionFailure("NOT_FOUND", "This note could not be found.");
    }
    revalidateNote(input.id);
    return { success: true, shareEnabled: false };
  } catch (error) {
    console.error("Note share revocation failed", error);
    return actionFailure("INTERNAL_ERROR", "We couldn't disable sharing. Please try again.");
  }
}
