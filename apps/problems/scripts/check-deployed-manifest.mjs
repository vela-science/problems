import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { currentProjectionManifest } from "@vela/projection-data";
import { computeBrandRoot } from "@vela/brand/integrity";
import {
  createProblemsDeploymentManifest,
  problemsDeploymentManifestSchema,
} from "@vela/projection-data/deployment";

const app = resolve(import.meta.dirname, "..");
const repository = resolve(app, "../..");
const [baseUrl, expectedCommit] = process.argv.slice(2);

if (!baseUrl || !/^[0-9a-f]{40}$/u.test(expectedCommit ?? "")) {
  throw new Error("usage: bun scripts/check-deployed-manifest.mjs URL GIT_COMMIT");
}

const packageJson = JSON.parse(readFileSync(resolve(repository, "package.json"), "utf8"));
const endpoint = new URL("/.well-known/vela-site.json", baseUrl);
const response = await fetch(endpoint, { redirect: "error" });
if (!response.ok) throw new Error(`deployed manifest returned HTTP ${response.status}`);

const deployed = problemsDeploymentManifestSchema.parse(await response.json());
const expectedBrandRoot = computeBrandRoot(repository);
const projection = await currentProjectionManifest();
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(deployed.deployment.provider === "vercel", "production provider is not Vercel");
assert(typeof deployed.deployment.id === "string" && deployed.deployment.id.length > 0, "deployment ID is missing");
const expected = createProblemsDeploymentManifest({
  version: packageJson.version,
  brandRoot: expectedBrandRoot,
  projection,
  environment: {
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_SHA: expectedCommit,
    VERCEL_DEPLOYMENT_ID: deployed.deployment.id,
  },
});

assert(JSON.stringify(deployed) === JSON.stringify(expected), "deployed Problems manifest drift");

console.log(JSON.stringify({
  ok: true,
  schema: deployed.schema,
  site_version: deployed.site.version,
  site_commit: deployed.site.commit,
  brand_root: deployed.site.brand.root,
  projection_root: deployed.projection.release_root,
  deployment_id: deployed.deployment.id,
}));
