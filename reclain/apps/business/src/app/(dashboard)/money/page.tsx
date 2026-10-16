import type { Metadata } from "next";
import { getDashboard } from "../../_lib/context";

export const metadata: Metadata = { title: "Money" };

// Being built. The page exists so the tab works; the feature replaces this file.
export default async function MoneyPage() {
  await getDashboard();
  return (
    <>
      <h1 className="page-title dash-title">Money</h1>
      <p className="dash-lede muted">Takings, spending and your monthly statement. Coming soon.</p>
    </>
  );
}
