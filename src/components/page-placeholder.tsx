type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <main>
      <h1>{title}</h1>
      <p>{description}</p>
    </main>
  );
}
