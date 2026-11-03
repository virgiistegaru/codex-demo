export function PageCard({
  title,
  description,
  note,
}: {
  title: string;
  description: string;
  note?: string;
}) {
  return (
    <article className="page-card">
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
      {note ? <p className="page-note">{note}</p> : null}
    </article>
  );
}
