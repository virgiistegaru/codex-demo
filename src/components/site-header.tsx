import Link from "next/link";
import { signOutAction } from "@/src/app-actions/auth";
import { getSession } from "@/src/lib/auth-session";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link aria-label="TinyNotes home" className="site-logo" href="/">
          TinyNotes
        </Link>

        {session ? (
          <nav aria-label="Account" className="site-nav">
            <Link href="/notes">Notes</Link>
            <Link href="/notes/new">New note</Link>
            <form action={signOutAction}>
              <button className="site-nav-sign-out" type="submit">
                Logout
              </button>
            </form>
          </nav>
        ) : (
          <nav aria-label="Account" className="site-nav">
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
