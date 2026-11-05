import { redirect } from "next/navigation";
import { PageCard } from "@/src/components/page-card";
import { getSession } from "@/src/lib/auth-session";

export default async function NewNotePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <PageCard title="New note" description="New note page placeholder." />;
}
