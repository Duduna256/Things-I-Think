import Link from "next/link";
import { Cover } from "@shared/components/Cover";

// Also shown for any address that doesn't exist. Next adds a noindex tag to 404s itself.

export default function NotFound() {
  return (
    <div className="wrap-narrow page" style={{ display: "grid", gap: 20, justifyItems: "start" }}>
      <div style={{ width: "min(100%, 420px)" }}>
        <Cover palette={["#2b1a4a", "#7b4fd6", "#f6b9a3"]} word="lost?" />
      </div>
      <h1 className="page-title">This page went out for a quick trim and never came back.</h1>
      <p className="muted" style={{ maxWidth: "52ch" }}>
        The link may be old, or the business may have moved on. Everything else is still where you left it.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="btn btn-black" href="/">
          Go to the homepage
        </Link>
        <Link className="btn btn-ghost" href="/search">
          Search all services
        </Link>
      </div>
    </div>
  );
}
