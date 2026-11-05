import { redirect } from "next/navigation";
import { AuthForm } from "@/src/components/auth-form";
import { getSession } from "@/src/lib/auth-session";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/notes");
  }

  return <AuthForm mode="login" />;
}
