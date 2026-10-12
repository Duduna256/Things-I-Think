import Link from "next/link";
import { site } from "@/config/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap foot-in">
        <div className="foot-brand">
          <Link className="brand" href="/">
            reclain
          </Link>
          <p>Hair, beauty and home services in {site.city}, booked in seconds and paid by mobile money.</p>
          <p className="foot-contact">
            {site.email} · {site.phone}
          </p>
        </div>
        <div>
          <h3>Customers</h3>
          <Link href="/search">Find a venue</Link>
          <Link href="/bookings">My bookings</Link>
          <Link href="/#faq">Help and support</Link>
        </div>
        <div>
          <h3>Businesses</h3>
          <Link href="/business/onboarding">List your business</Link>
          <Link href="/for-business">Why Reclain</Link>
          <Link href="/business">Business dashboard</Link>
        </div>
        <div>
          <h3>Categories</h3>
          <Link href="/search?cat=braids">Braids &amp; locs</Link>
          <Link href="/search?cat=barber">Barbers</Link>
          <Link href="/search?cat=massage">Massage</Link>
          <Link href="/search?cat=laundry">Laundry</Link>
        </div>
      </div>
      <div className="foot-giant" aria-hidden="true">
        reclain
      </div>
      <div className="wrap foot-bottom">
        <span>
          © {new Date().getFullYear()} {site.domain} · {site.city}, {site.country}
        </span>
        <span>Made for good hair days. Say it “{site.pronounced}”.</span>
      </div>
    </footer>
  );
}
