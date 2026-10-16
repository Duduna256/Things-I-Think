import Link from "next/link";

// Shown inside the dashboard shell when the booking isn't on this business.
export default function JobNotFound() {
  return (
    <div className="empty">
      <h1 className="page-title dash-title">We can&apos;t find that booking</h1>
      <p>It may belong to another of your businesses, or the link is out of date. Pick the day from your bookings list instead.</p>
      <Link className="btn btn-black" href="/bookings">
        Go to bookings
      </Link>
    </div>
  );
}
