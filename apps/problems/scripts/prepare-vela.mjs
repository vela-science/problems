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
  ? "c80e571ea056e04c1a14274e75c1e065b10ab3e49091ced2b6e69d0e90c1f8e2"
  : "4332427789bf3dac83ebad9843670047b448f6ba370661f48a0100cbb61bc00c";
const root = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

await mkdir(resolve(app, ".generated"), { recursive: true });
if (process.platform === "linux") {
  const response = await fetch("https://github.com/vela-science/vela/releases/download/v0.977.0/vela-linux-x86_64.tar.gz");
  if (!response.ok || !response.body) throw new Error(`failed to acquire Vela 0.977.0: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const archiveRoot = createHash("sha256").update(bytes).digest("hex");
  if (archiveRoot !== "6fa37c2e1fb9d413be03e6303962447c92d4b369f94f2f99da4bdef325b18bf0") throw new Error("Vela release archive root drift");
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
if (await root(output) !== expected) throw new Error(`Vela 0.977.0 binary root drift on ${process.platform}`);
await chmod(output, 0o755);
