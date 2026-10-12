import "@/styles/dashboard.css";
import type { Metadata } from "next";
import { site } from "@/config/site";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: `Dashboard · ${site.shortName}`, template: `%s · Dashboard · ${site.shortName}` },
  robots: { index: false, follow: false },
};

// Everything under /business needs a login. The dashboard pages sit in the (dashboard) group,
// whose layout sends people without a business to onboarding; /business/onboarding sits
// outside that group, so it never loops back on itself.
export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/business");
  return children;
}
