import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { NoteEditor } from "@/src/components/note-editor";
import { getSession } from "@/src/lib/auth-session";
import { parseTipTapDocument } from "@/src/lib/note-content";
import { getNoteForUser } from "@/src/lib/notes";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const note = getNoteForUser(id, session.user.id);
  if (!note) notFound();

  const content = parseTipTapDocument(note.content_json);
  if (!content) notFound();

  return (
    <section aria-labelledby="note-heading" className="note-page">
      <div className="note-page-heading">
        <div>
          <h1 id="note-heading">Edit note</h1>
          <p className="page-description">
            Last updated{" "}
            <time dateTime={note.updated_at}>{new Date(note.updated_at).toLocaleString()}</time>
          </p>
        </div>
        <Link className="back-to-notes" href="/notes">
          Back to notes
        </Link>
      </div>
      <NoteEditor
        initialContent={content}
        initialTitle={note.title}
        key={note.id}
        noteId={note.id}
      />
    </section>
  );
}
