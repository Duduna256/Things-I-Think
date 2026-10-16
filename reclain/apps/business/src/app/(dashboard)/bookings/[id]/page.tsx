import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { data } from "@shared/lib/data";
import { getDashboard } from "../../../_lib/context";

export const metadata: Metadata = { title: "Job" };

type Props = { params: Promise<{ id: string }> };

// Being built: the job log for one booking. The page exists so links to it work.
export default async function JobPage({ params }: Props) {
  const [{ business }, { id }] = await Promise.all([getDashboard(), params]);
  const booking = await data.getBooking(id).catch(() => null);
  if (!booking || booking.businessId !== business.id) notFound();
  return (
    <>
      <h1 className="page-title dash-title">Booking {booking.ref}</h1>
      <p className="dash-lede muted">The job log is coming soon.</p>
    </>
  );
}
