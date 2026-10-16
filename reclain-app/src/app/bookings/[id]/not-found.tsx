import Link from "next/link";

export default function BookingNotFound() {
  return (
    <div className="wrap-narrow page">
      <div className="empty">
        <h1 className="page-title">We can&apos;t find that booking</h1>
        <p>It may belong to a different account. Check you&apos;re logged in as the person who booked, or look in your bookings.</p>
        <Link className="btn btn-black" href="/bookings">
          See my bookings
        </Link>
      </div>
    </div>
  );
}
