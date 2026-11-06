import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/src/lib/auth-session";
import { listNotesForUser } from "@/src/lib/notes";

export default async function NotesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const notes = listNotesForUser(session.user.id);

  return (
    <section className="notes-page" aria-labelledby="notes-heading">
      <div className="section-heading">
        <div>
          <h1 id="notes-heading">Your notes</h1>
          <p className="page-description">Select a note to continue editing or create a new one.</p>
        </div>
        <Link className="auth-submit button-link" href="/notes/new">
          New note
        </Link>
      </div>

      {notes.length > 0 ? (
        <ul className="note-list">
          {notes.map((note) => (
            <li key={note.id}>
              <Link className="note-list-link" href={`/notes/${note.id}`}>
                <span className="note-list-title">{note.title || "Untitled note"}</span>
                <time className="note-list-date" dateTime={note.updated_at}>
                  Updated {new Date(note.updated_at).toLocaleDateString()}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-notes">
          <h2>No notes yet</h2>
          <p>Create your first note and start writing.</p>
          <Link className="auth-submit button-link" href="/notes/new">
            Create note
          </Link>
        </div>
      )}
    </section>
  );
}
