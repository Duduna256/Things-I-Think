import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope, Syne } from "next/font/google";
import { site } from "@/config/site";
import { Footer } from "@/components/Footer";
import { IconSprite } from "@/components/Icon";
import { Nav } from "@/components/Nav";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-syne", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic", "normal"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: trusted services in ${site.city}, booked`, template: `%s · ${site.shortName}` },
  description: site.description,
  openGraph: { title: site.name, description: site.description, siteName: site.name, type: "website" },
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
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
