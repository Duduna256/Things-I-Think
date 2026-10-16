import Link from "next/link";

export default function MockPaymentNotFound() {
  return (
    <div className="wrap-narrow page">
      <div className="empty">
        <h1 className="page-title">We can&apos;t find that payment prompt</h1>
        <p>
          It may belong to a different account, or test payments may be switched off on this site. Your bookings page has a Pay
          now button for anything still waiting.
        </p>
        <Link className="btn btn-black" href="/bookings">
          See my bookings
        </Link>
      </div>
    </div>
  );
}
