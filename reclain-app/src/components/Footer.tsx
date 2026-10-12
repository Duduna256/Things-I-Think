import Link from "next/link";
import { site } from "@/config/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap foot-in">
        <div className="foot-brand">
          <Link className="brand" href="/">
            {site.shortName}
          </Link>
          <p>Trusted services in {site.city}, from braids to plumbing, booked in seconds and paid by mobile money.</p>
          <p className="foot-contact">
            {site.email} · {site.phone}
          </p>
        </div>
        <div>
          <h3>Customers</h3>
          <Link href="/search">Find a service</Link>
          <Link href="/bookings">My bookings</Link>
          <Link href="/#faq">Help and support</Link>
        </div>
        <div>
          <h3>Businesses</h3>
          <Link href="/business/onboarding">List your business</Link>
          <Link href="/for-business">Why reClain</Link>
          <Link href="/business">Business dashboard</Link>
        </div>
        <div>
          <h3>Categories</h3>
          <Link href="/search?cat=cleaning">Home cleaning</Link>
          <Link href="/search?cat=laundry">Laundry</Link>
          <Link href="/search?cat=repairs">Repairs</Link>
          <Link href="/search?cat=hair">Hair salons</Link>
        </div>
      </div>
      <div className="foot-giant" aria-hidden="true">
        {site.shortName}
      </div>
      <div className="wrap foot-bottom">
        <span>
          © {new Date().getFullYear()} {site.domain} · {site.city}, {site.country}
        </span>
        <span>{site.name}. Say it “{site.pronounced}”.</span>
      </div>
    </footer>
  );
}
