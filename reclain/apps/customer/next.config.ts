import type { NextConfig } from "next";
import { site } from "./src/config-bridge";

const nextConfig: NextConfig = {
  // The business side lives in its own app (apps/business). Old links keep working.
  async redirects() {
    return [
      { source: "/business", destination: site.businessUrl, permanent: false },
      { source: "/business/:path*", destination: `${site.businessUrl}/:path*`, permanent: false },
      { source: "/admin", destination: `${site.businessUrl}/admin`, permanent: false },
    ];
  },
};

export default nextConfig;
