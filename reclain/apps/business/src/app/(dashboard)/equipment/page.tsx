import "@/styles/equipment.css";
import type { Metadata } from "next";
import { site } from "@shared/config/site";
import { data } from "@shared/lib/data";
import { addDays, todayLocal } from "@shared/lib/time";
import { EquipmentManager } from "@/components/equipment/EquipmentManager";
import { SlotChecker } from "@/components/equipment/SlotChecker";
import { runChecker, type CheckerReport } from "@/components/equipment/checker";
import { dayRange } from "@/components/dashboard/logic";
import { getDashboardDetail } from "../../_lib/context";
import { CHECKER_DAYS, NEXT_FREE_DAYS, parseCheckerQuery } from "./schemas";

export const metadata: Metadata = { title: "Equipment" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function EquipmentPage({ searchParams }: Props) {
  const [{ detail }, sp] = await Promise.all([getDashboardDetail(), searchParams]);
  const now = new Date();
  const today = todayLocal(now);
  const serviceIds = detail.services.map(s => s.id);
  const [resources, needs] = await Promise.all([data.capacity.listResources(detail.id), data.capacity.getServiceNeeds(detail.id, serviceIds)]);

  // Which services use each item, for the list.
  const usedBy: Record<string, string[]> = {};
  for (const n of needs) {
    const service = detail.services.find(s => s.id === n.serviceId);
    if (!service) continue;
    for (const r of n.resources) (usedBy[r.resourceId] ??= []).push(service.name);
  }

  // The slot checker: a GET form, so the answer is server-rendered and the address can be shared.
  const query = parseCheckerQuery(sp, { serviceIds, today });
  let report: CheckerReport | null = null;
  if (query.serviceIds.length) {
    // Everything booked from the chosen day to the end of the next-free search, in one go.
    const { fromIso } = dayRange(query.date);
    const { toIso } = dayRange(addDays(query.date, NEXT_FREE_DAYS));
    const [busy, busyResources] = await Promise.all([data.getBusySlots(detail.id, fromIso, toIso), data.capacity.getBusyResources(detail.id, fromIso, toIso)]);
    report = runChecker({
      venue: detail,
      serviceIds: query.serviceIds,
      needs,
      date: query.date,
      busy,
      busyResources,
      now,
      stepMin: site.slotStepMinutes,
      searchDays: NEXT_FREE_DAYS,
    });
  }

  return (
    <>
      <h1 className="page-title dash-title">
        Equipment and <span className="em">vehicles</span>
      </h1>
      <p className="dash-lede muted">
        What you own and how many of each. Every booking reserves what its services use, so a time is only offered when enough is
        free. Say what each service uses on the Services page.
      </p>
      <EquipmentManager businessId={detail.id} resources={resources} usedBy={usedBy} />
      <SlotChecker services={detail.services} query={query} report={report} today={today} maxDate={addDays(today, CHECKER_DAYS - 1)} />
    </>
  );
}
