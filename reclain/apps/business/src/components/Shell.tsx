import Link from "next/link";
import { signOut } from "@shared/auth/actions";
import { site } from "@shared/config/site";
import { getSessionUser } from "@shared/lib/auth";
import { isDemo } from "@shared/lib/env";

// The top of every page: the wordmark, the customer site, admin for the team, and log out.
export async function Shell() {
  const user = await getSessionUser();
  return (
    <>
      {isDemo && (
        <div className="demo-bar">
          Demo mode: a sample business with pretend bookings, nothing is saved for long. <Link href="/login">Switch person</Link>
        </div>
      )}
      <header className="nav" id="nav">
        <div className="wrap nav-in">
          <Link className="brand" href="/" aria-label={`${site.shortName} Business home`}>
            {site.shortName}
            <span className="biz-tag">Business</span>
          </Link>
          <nav className="nav-actions" aria-label="Main">
            {user?.isAdmin && (
              <Link className="nav-link hide-sm" href="/admin">
                Admin
              </Link>
            )}
            <a className="nav-link hide-sm" href={site.customerUrl}>
              Customer site
            </a>
            {user ? (
              <form action={signOut} className="biz-user">
                <span className="hide-sm muted">{user.fullName?.split(" ")[0] ?? user.email}</span>
                <button type="submit" className="pill-btn">
                  Log out
                </button>
              </form>
            ) : (
              <Link className="pill-btn" href="/login">
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
