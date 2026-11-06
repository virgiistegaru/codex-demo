import { redirect } from "next/navigation";
import Link from "next/link";
import { NoteEditor } from "@/src/components/note-editor";
import { getSession } from "@/src/lib/auth-session";
import { EMPTY_NOTE_DOCUMENT } from "@/src/lib/note-content";

export default async function NewNotePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <section aria-labelledby="new-note-heading" className="note-page">
      <div className="note-page-heading">
        <div>
          <h1 id="new-note-heading">Create note</h1>
          <p className="page-description">Draft your content and submit when you are ready.</p>
        </div>
        <Link className="back-to-notes" href="/notes">
          Back to notes
        </Link>
      </div>
      <NoteEditor
        initialContent={EMPTY_NOTE_DOCUMENT}
        initialTitle=""
        key="new-note"
        noteId={null}
      />
    </section>
  );
}
