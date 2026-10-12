import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { isDemo } from "@/lib/env";
import { site } from "@/config/site";
import { data } from "@/lib/data";
import { NavMenu } from "./NavMenu";

export async function Nav() {
  const user = await getSessionUser();
  const ownsBusiness = user ? (await data.getMyBusinesses().catch(() => [])).length > 0 : false;
  return (
    <>
      {isDemo && (
        <div className="demo-bar">
          Demo mode: sample businesses, pretend payments, nothing is saved for long. <Link href="/login">Switch person</Link>
        </div>
      )}
      <header className="nav" id="nav">
        <div className="wrap nav-in">
          <Link className="brand" href="/" aria-label={`${site.name} home`}>
            {site.shortName}
          </Link>
          <nav className="nav-actions" aria-label="Main">
            <Link className="nav-link hide-sm" href={ownsBusiness ? "/business" : "/for-business"}>
              {ownsBusiness ? "Dashboard" : "For business"}
            </Link>
            {user ? (
              <Link className="nav-link hide-sm" href="/bookings">
                My bookings
              </Link>
            ) : (
              <Link className="nav-link hide-sm" href="/login">
                Log in
              </Link>
            )}
            <NavMenu signedIn={!!user} name={user?.fullName ?? null} ownsBusiness={ownsBusiness} isAdmin={!!user?.isAdmin} />
          </nav>
        </div>
      </header>
    </>
  );
}
