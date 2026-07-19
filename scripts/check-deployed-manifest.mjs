import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [baseUrl, expectedCommit] = process.argv.slice(2);
if (!baseUrl || !/^[0-9a-f]{40}$/u.test(expectedCommit ?? "")) {
  throw new Error("usage: node scripts/check-deployed-manifest.mjs URL GIT_COMMIT");
}
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const localBundleManifest = JSON.parse(
  readFileSync(join(root, "data/site-frontier-bundle-manifest.v1.json"), "utf8"),
);
const endpoint = new URL("/.well-known/vela-site.json", baseUrl);
const response = await fetch(endpoint, { redirect: "error" });
if (!response.ok) throw new Error(`deployed manifest returned HTTP ${response.status}`);
const deployed = await response.json();
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
assert(deployed.schema === "vela.site-deployment.v1", "wrong deployment schema");
assert(deployed.authority === "read_only_projection", "deployment claims authority");
assert(deployed.site.version === packageJson.version, "deployed site version drift");
assert(deployed.site.tag === `v${packageJson.version}`, "deployed site tag drift");
assert(deployed.site.commit === expectedCommit, "deployed site commit drift");
assert(
  JSON.stringify(deployed.bundle) === JSON.stringify(localBundleManifest),
  "deployed frontier bundle identity drift",
);
assert(deployed.deployment.provider === "vercel", "production provider is not Vercel");
assert(typeof deployed.deployment.id === "string" && deployed.deployment.id.length > 0, "deployment ID is missing");
console.log(JSON.stringify({
  ok: true,
  schema: deployed.schema,
  site_version: deployed.site.version,
  site_commit: deployed.site.commit,
  bundle_sha256: deployed.bundle.bundle_sha256,
  deployment_id: deployed.deployment.id,
}));
