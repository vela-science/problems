import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const bundle = JSON.parse(readFileSync(resolve(root, "data/site-frontier-bundle-manifest.v1.json"), "utf8"));
const production = process.env.VERCEL_ENV === "production";
const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_URL ?? null;

if (production && (!/^[0-9a-f]{40}$/u.test(commit ?? "") || !deploymentId)) {
  throw new Error("production deployment identity is incomplete");
}

const manifest = {
  schema: "vela.site-deployment.v1",
  authority: "read_only_projection",
  canonical_url: "https://www.vela.space/",
  site: {
    version: packageJson.version,
    tag: `v${packageJson.version}`,
    commit,
  },
  bundle,
  deployment: {
    provider: production ? "vercel" : "local_or_preview",
    environment: process.env.VERCEL_ENV ?? "local",
    id: deploymentId,
  },
};

const directory = resolve(root, "public/.well-known");
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, "vela-site.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, schema: manifest.schema, version: packageJson.version }));
