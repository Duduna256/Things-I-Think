"use client";

// What the dashboard and the admin screen show when loading fails (a dropped connection, the
// database having a moment). Server errors arrive without their details in production, so the
// words stay general; the reference matches the server log.

import Link from "next/link";
import { useEffect } from "react";
import { site } from "@/config/site";

export function DashError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="wrap-narrow page dash dash-error">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="page-title">
        That didn&apos;t <span className="em">load</span>.
      </h1>
      <p className="dash-lede">
        Nothing you saved is lost. It&apos;s usually a blip in the connection, so give it another go. If it keeps happening,
        email <a href={`mailto:${site.email}`}>{site.email}</a>
        {error.digest ? (
          <>
            {" "}
            and mention <code>{error.digest}</code>
          </>
        ) : null}
        .
      </p>
      <div className="dash-form-btns">
        <button type="button" className="btn btn-black" onClick={() => retry()}>
          Try again
        </button>
        <Link className="btn btn-ghost" href="/">
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}
