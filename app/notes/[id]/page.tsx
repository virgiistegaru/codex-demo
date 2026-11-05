import { redirect } from "next/navigation";
import { PageCard } from "@/src/components/page-card";
import { getSession } from "@/src/lib/auth-session";

export default async function NotePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <PageCard title="Note" description="Note detail page placeholder." />;
}
