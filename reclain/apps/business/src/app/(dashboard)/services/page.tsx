import "@/styles/equipment.css";
import type { Metadata } from "next";
import { data } from "@shared/lib/data";
import type { ServiceResourceNeed } from "@shared/lib/types";
import { ServiceManager } from "@/components/dashboard/ServiceManager";
import { getDashboardDetail } from "../../_lib/context";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const { detail } = await getDashboardDetail();
  // The equipment and vehicles each service can say it uses, and what each one uses now.
  const [resources, serviceNeeds] = await Promise.all([
    data.capacity.listResources(detail.id),
    data.capacity.getServiceNeeds(
      detail.id,
      detail.services.map(s => s.id),
    ),
  ]);
  const needs: Record<string, ServiceResourceNeed[]> = {};
  for (const n of serviceNeeds) needs[n.serviceId] = n.resources.map(r => ({ resourceId: r.resourceId, quantity: r.needed }));
  return (
    <>
      <h1 className="page-title dash-title">
        Your <span className="em">menu</span>
      </h1>
      <p className="dash-lede muted">
        What customers can book, grouped the way they see it on your page. Prices are what they pay; the time decides how long
        the slot is held.
      </p>
      <ServiceManager
        businessId={detail.id}
        services={detail.services}
        opensAt={detail.opensAt}
        closesAt={detail.closesAt}
        teamSize={detail.staff.filter(s => s.active).length}
        resources={resources}
        needs={needs}
      />
    </>
  );
}
