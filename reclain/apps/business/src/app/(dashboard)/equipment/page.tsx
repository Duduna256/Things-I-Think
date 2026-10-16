import type { Metadata } from "next";
import { getDashboard } from "../../_lib/context";

export const metadata: Metadata = { title: "Equipment" };

// Being built. The page exists so the tab works; the feature replaces this file.
export default async function EquipmentPage() {
  await getDashboard();
  return (
    <>
      <h1 className="page-title dash-title">Equipment</h1>
      <p className="dash-lede muted">Your equipment and vehicles, and what each service needs. Coming soon.</p>
    </>
  );
}
