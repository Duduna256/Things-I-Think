import type { Metadata } from "next";
import { ServiceManager } from "@/components/dashboard/ServiceManager";
import { getDashboardDetail } from "../../_lib/context";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const { detail } = await getDashboardDetail();
  return (
    <>
      <h1 className="page-title dash-title">
        Your <span className="em">menu</span>
      </h1>
      <p className="dash-lede muted">
        What customers can book, grouped the way they see it on your page. Prices are what they pay; the time decides how long
        the slot is held.
      </p>
      <ServiceManager businessId={detail.id} services={detail.services} opensAt={detail.opensAt} closesAt={detail.closesAt} />
    </>
  );
}
