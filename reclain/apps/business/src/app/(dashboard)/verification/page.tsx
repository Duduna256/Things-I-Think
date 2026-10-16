import type { Metadata } from "next";
import { getDashboard } from "../../_lib/context";

export const metadata: Metadata = { title: "Verification" };

// Being built. The page exists so the tab works; the feature replaces this file.
export default async function VerificationPage() {
  await getDashboard();
  return (
    <>
      <h1 className="page-title dash-title">Verification</h1>
      <p className="dash-lede muted">Your checks, and the badge customers see. Coming soon.</p>
    </>
  );
}
