import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: { position: "bottom-right" },
  transpilePackages: ["@vela/activity-data", "@vela/brand", "@vela/observatory-data", "@vela/ui"],
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
};

export default nextConfig;
