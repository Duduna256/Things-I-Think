import type { Metadata } from "next";
import { features } from "@/config/features";
import { data } from "@/lib/data";
import { prettyMsisdn } from "@/lib/phone";
import { BusinessForm } from "@/components/dashboard/BusinessForm";
import { getDashboardDetail } from "../../_lib/context";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [{ detail: b }, categories, areas] = await Promise.all([getDashboardDetail(), data.listCategories(), data.listAreas()]);
  return (
    <>
      <h1 className="page-title dash-title">
        Your <span className="em">shopfront</span>
      </h1>
      <p className="dash-lede muted">What customers see on your page and in search, and when they can book you.</p>
      <BusinessForm
        mode="update"
        businessId={b.id}
        initial={{
          name: b.name,
          categoryId: b.categoryId,
          areaId: b.areaId,
          blurb: b.blurb,
          address: b.address,
          phone: b.phone && /^\d{9}$/.test(b.phone) ? prettyMsisdn(b.phone) : (b.phone ?? ""),
          visitMode: b.visitMode,
          homeVisitFee: b.homeVisitFee,
          opensAt: b.opensAt,
          closesAt: b.closesAt,
          closedDays: b.closedDays,
          acceptsCash: b.acceptsCash,
          skipProfessional: b.skipProfessional,
          coverWord: b.coverWord,
          palette: b.palette,
        }}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        areas={areas.map(a => ({ id: a.id, name: a.name, region: a.region }))}
        flags={{ homeVisits: features.homeVisits, cash: features.cashPayments }}
        // Only a live page goes back for review, and only while approval is switched on.
        securityReview={b.status === "published" && features.businessApproval}
      />
    </>
  );
}
