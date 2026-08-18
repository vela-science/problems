import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import * as tar from "tar";

const app = resolve(import.meta.dirname, "..");
const output = resolve(app, ".generated", "vela");
const expected = process.platform === "linux"
  ? "3e2e12ac3410aa4a62013d3d7e2ceb828504c7beaff09cf1d126bc2d7ba077cd"
  : "286ed839ea81b7ed283e04ea1823c1515ad242dcee02b424787b8daa667625e2";
const root = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

await mkdir(resolve(app, ".generated"), { recursive: true });
if (process.platform === "linux") {
  const response = await fetch("https://github.com/vela-science/vela/releases/download/v0.977.2/vela-linux-x86_64.tar.gz");
  if (!response.ok || !response.body) throw new Error(`failed to acquire Vela 0.977.2: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const archiveRoot = createHash("sha256").update(bytes).digest("hex");
  if (archiveRoot !== "23f03735f97820cbf56e5f2cc0c9d56b5657d7113dcbd0b738aafb1e241498b3") throw new Error("Vela release archive root drift");
  const temporary = await mkdtemp(resolve(tmpdir(), "problems-vela-"));
  try {
    await writeFile(resolve(temporary, "vela.tar.gz"), bytes);
    await pipeline(Readable.from([bytes]), tar.x({ cwd: temporary }));
    await copyFile(resolve(temporary, "vela"), output);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
} else {
  await copyFile(process.env.VELA_BIN ?? resolve(homedir(), ".local/bin/vela"), output);
}
if (await root(output) !== expected) throw new Error(`Vela 0.977.2 binary root drift on ${process.platform}`);
await chmod(output, 0o755);
