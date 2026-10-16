import type { Metadata } from "next";
import Link from "next/link";
import { features } from "@/config/features";
import { site } from "@/config/site";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { prettyMsisdn } from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { BusinessForm } from "@/components/dashboard/BusinessForm";
import { PALETTES } from "@/components/dashboard/options";

export const metadata: Metadata = { title: { absolute: `List your business · ${site.shortName}` } };

// Sits outside the (dashboard) group on purpose: people without a business land here.
export default async function OnboardingPage() {
  const user = await requireUser("/business/onboarding");
  const [mine, categories, areas] = await Promise.all([data.getMyBusinesses(), data.listCategories(), data.listAreas()]);

  return (
    <div className="wrap-narrow page dash dash-onboard">
      <p className="eyebrow">{site.shortName} for business</p>
      <h1 className="page-title">
        List your <span className="em">business</span>
      </h1>
      <p className="dash-lede">
        Two minutes now, fewer WhatsApp messages forever. Start with the basics. Your menu and your team come straight after.
      </p>

      {features.businessApproval && (
        <div className="notice notice-info dash-banner">
          <Icon name="shield" />
          <div className="dash-banner-text">
            <p>Every new business gets a quick review before it goes live.</p>
            <p className="dash-banner-sub">
              We check that you&apos;re real and that your menu makes sense. You can set everything up in the meantime.
            </p>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <p className="notice notice-warn dash-banner">
          <Icon name="alert" />
          <span>
            You already run {mine.length === 1 ? mine[0].name : `${mine.length} businesses`}. This adds another one.{" "}
            <Link href="/business">Back to your dashboard</Link>
          </span>
        </p>
      )}

      <BusinessForm
        mode="create"
        initial={{
          name: "",
          categoryId: "",
          areaId: "",
          blurb: "",
          address: "",
          phone: user.phone && /^\d{9}$/.test(user.phone) ? prettyMsisdn(user.phone) : "",
          visitMode: "salon",
          homeVisitFee: site.defaultHomeVisitFee,
          opensAt: "08:00",
          closesAt: "19:00",
          closedDays: [0],
          acceptsCash: features.cashPayments,
          skipProfessional: false,
          coverWord: "",
          palette: PALETTES[0].colors,
        }}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        areas={areas.map(a => ({ id: a.id, name: a.name, region: a.region }))}
        flags={{ homeVisits: features.homeVisits, cash: features.cashPayments }}
      />
    </div>
  );
}
