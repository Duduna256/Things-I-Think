import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Job photos and verification files come up through Server Actions.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
