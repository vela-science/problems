import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeBrandRoot } from "@vela/brand/integrity";
import { deploymentIdForEnvironment } from "./src/lib/deployment-id";

const repository = resolve(import.meta.dirname, "../..");
const { version } = JSON.parse(readFileSync(resolve(repository, "package.json"), "utf8")) as {
  version: string;
};
const localProjectionQualification = Boolean(process.env.VELA_NEON_FETCH_ENDPOINT);

const nextConfig: NextConfig = {
  /* `/my-work` was the route's name until it was renamed to `/workspaces`.
     Signed-in readers have it bookmarked and it is linked from account
     surfaces, so it keeps resolving permanently rather than 404ing. The query
     string carries through, which is what makes a saved link to one workspace
     still open that workspace. */
  async redirects() {
    return [{ source: "/my-work", destination: "/workspaces", permanent: true }];
  },
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: { position: "bottom-right" },
  deploymentId: deploymentIdForEnvironment(process.env),
  transpilePackages: ["@vela/brand", "@vela/projection-data", "@vela/ui"],
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/import": ["./.generated/vela"],
  },
  ...(localProjectionQualification
    ? { staticPageGenerationTimeout: 180, experimental: { cpus: 2 } }
    : {}),
  env: {
    VELA_SITE_VERSION: version,
    VELA_SITE_BRAND_ROOT: computeBrandRoot(repository),
    ...(process.env.VELA_PROJECTION_RELEASE_ROOT
      ? { VELA_PROJECTION_RELEASE_ROOT: process.env.VELA_PROJECTION_RELEASE_ROOT }
      : {}),
  },
};

export default nextConfig;
