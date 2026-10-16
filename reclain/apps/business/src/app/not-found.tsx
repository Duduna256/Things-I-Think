import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap page">
      <p className="eyebrow">Not found</p>
      <h1 className="page-title">That page isn&apos;t here.</h1>
      <p className="muted">
        <Link href="/">Back to your dashboard</Link>
      </p>
    </div>
  );
}
