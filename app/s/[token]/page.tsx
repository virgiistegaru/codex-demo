import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageFrame } from "@/src/components/page-frame";
import { renderTipTapHtml } from "@/src/lib/note-html";
import { getSharedNoteByToken } from "@/src/lib/notes";

// Check the live share state on every request, including after revocation.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared note · TinyNotes",
  robots: { index: false, follow: false },
};

export default async function SharedNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const note = getSharedNoteByToken(token);
  if (!note) notFound();

  const html = renderTipTapHtml(note.content_json);
  if (html === null) notFound();

  return (
    <PageFrame area="SHARED NOTE">
      <article aria-labelledby="shared-note-heading" className="shared-note">
        <h1 id="shared-note-heading">{note.title || "Untitled note"}</h1>
        <p className="page-description">
          Last updated{" "}
          <time dateTime={note.updated_at}>{new Date(note.updated_at).toLocaleString()}</time>
        </p>
        <div className="shared-note-content" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </PageFrame>
  );
}
