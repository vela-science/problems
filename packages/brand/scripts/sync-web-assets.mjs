import { copyFileSync, cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = process.argv[2];
if (!target) throw new Error("usage: bun sync-web-assets.mjs TARGET_PUBLIC_DIRECTORY [--favicon]");

const output = resolve(process.cwd(), target);
const fontOutput = resolve(output, "assets/fonts");
mkdirSync(fontOutput, { recursive: true });
cpSync(resolve(root, "fonts"), fontOutput, { recursive: true, force: true });

const copied = ["assets/fonts"];
if (process.argv.includes("--favicon")) {
  copyFileSync(resolve(root, "vela-mark-micro.svg"), resolve(output, "favicon.svg"));
  copied.push("favicon.svg");
}

console.log(JSON.stringify({ ok: true, schema: "vela.brand-asset-sync.v1", output, copied }));
