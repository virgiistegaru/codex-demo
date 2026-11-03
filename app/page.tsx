import { PagePlaceholder } from "@/src/components/page-placeholder";

export default function HomePage() {
  return (
    <PagePlaceholder
      title="TinyNotes"
      description="This is the placeholder for the root public route."
      note="TODO: If authenticated, redirect to /notes; otherwise redirect to /login."
    />
  );
}
