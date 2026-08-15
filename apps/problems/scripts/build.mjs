import { resolve } from "node:path";
import { currentProjectionManifest } from "@vela/projection-data";

const app = resolve(import.meta.dirname, "..");
const repository = resolve(app, "../..");

async function run(command, options = {}) {
  const child = Bun.spawn(command, {
    cwd: options.cwd ?? app,
    env: options.env ?? process.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;
  if (code !== 0) throw new Error(`${command.join(" ")} exited with ${code}`);
}

await run(["bun", resolve(repository, "packages/brand/scripts/sync-web-assets.mjs"), "public", "--profile", "product", "--favicon"]);
await run(["bun", "scripts/prepare-vela.mjs"]);
const projection = await currentProjectionManifest();
const environment = {
  ...process.env,
  VELA_PROJECTION_RELEASE_ROOT: projection.release_root,
};
await run(["bun", "x", "next", "build"], { env: environment });
await run(["bun", "scripts/check-public-routes.mjs"], { env: environment });
