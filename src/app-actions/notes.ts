"use server";

import { getSession } from "@/src/lib/auth-session";
import { createNote, updateNote } from "@/src/lib/notes";
import { serializeTipTapDocument } from "@/src/lib/note-content";

export type SaveNoteInput = {
  id: string | null;
  title: string;
  contentJson: string;
};

export type SaveNoteResult = { success: true; id: string } | { success: false; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      return { success: true, id };
    }

    if (!UUID_PATTERN.test(input.id)) {
      return { success: false, message: "This note could not be found." };
    }

    const updated = updateNote(input.id, session.user.id, input.title.trim(), contentJson);
    return updated
      ? { success: true, id: input.id }
      : { success: false, message: "This note could not be found." };
  } catch (error) {
    console.error("Note save failed", error);
    return { success: false, message: "We couldn't save your note. Please try again." };
  }
}
