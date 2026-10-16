import Link from "next/link";

export default function VenueNotFound() {
  return (
    <div className="wrap-narrow page">
      <div className="empty">
        <h1 className="page-title">We can&apos;t find that venue</h1>
        <p>It may have moved, changed its name or stopped taking bookings for now. Plenty of others are free today.</p>
        <Link className="btn btn-black" href="/search">
          Find a venue
        </Link>
      </div>
    </div>
  );
}
