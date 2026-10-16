import type { MetadataRoute } from "next";
import { site } from "@shared/config/site";

// Lets a provider add the app to their phone's home screen and open it full-screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.shortName} Business`,
    short_name: `${site.shortName} Biz`,
    description: `Run your business on ${site.name}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6a43e0",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
