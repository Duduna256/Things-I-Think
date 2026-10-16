import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope, Syne } from "next/font/google";
import { IconSprite } from "@shared/components/Icon";
import { site } from "@shared/config/site";
import { Shell } from "@/components/Shell";
import "@shared/styles/globals.css";
import "@/styles/dashboard.css";
import "@/styles/business.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-syne", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic", "normal"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.shortName} Business`, template: `%s · ${site.shortName} Business` },
  description: `Run your business on ${site.name}: bookings, team, services, money and more.`,
  applicationName: `${site.shortName} Business`,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: `${site.shortName} Business`, statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-UG" className={`${manrope.variable} ${syne.variable} ${serif.variable}`}>
      <body>
        <IconSprite />
        <Shell />
        <main id="main">{children}</main>
        <footer className="biz-foot wrap">
          <span>
            {site.shortName} Business · <a href={site.customerUrl}>customer site</a>
          </span>
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </footer>
      </body>
    </html>
  );
}
