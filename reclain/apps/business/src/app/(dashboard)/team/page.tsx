import type { Metadata } from "next";
import { data } from "@shared/lib/data";
import { TeamManager } from "@/components/dashboard/TeamManager";
import { getDashboardDetail } from "../../_lib/context";

export const metadata: Metadata = { title: "Team" };

function nowIso() {
  return new Date().toISOString();
}

export default async function TeamPage() {
  const { detail } = await getDashboardDetail();
  // Upcoming bookings per person, so removing someone doesn't come as a surprise.
  const upcoming = await data.listBusinessBookings(detail.id, { fromIso: nowIso(), status: ["confirmed", "pending_payment"] });
  const counts: Record<string, number> = {};
  for (const b of upcoming) if (b.staffId) counts[b.staffId] = (counts[b.staffId] ?? 0) + 1;

  return (
    <>
      <h1 className="page-title dash-title">
        Your <span className="em">team</span>
      </h1>
      <p className="dash-lede muted">
        {detail.skipProfessional
          ? "Customers don't pick a professional at your place, so new bookings go to whoever is free."
          : "Customers can pick who they'd like, or let us choose whoever is free."}{" "}
        Only people taking bookings are offered.
      </p>
      <TeamManager businessId={detail.id} staff={detail.staff} upcoming={counts} />
    </>
  );
}
