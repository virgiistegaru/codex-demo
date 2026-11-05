import { redirect } from "next/navigation";
import { PageCard } from "@/src/components/page-card";
import { getSession } from "@/src/lib/auth-session";

export default async function NotesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <PageCard title="Your notes" description="Notes list page placeholder." />;
}
