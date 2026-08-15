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
  ? "bac7718e200519a12182336e888e2782bff789b7cd132e110660ed621228550f"
  : "3c7ada5afafe47ca28c18809d3818b0ffe93fe726f3aea97d65aafd558a5cee1";
const root = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

await mkdir(resolve(app, ".generated"), { recursive: true });
if (process.platform === "linux") {
  const response = await fetch("https://github.com/vela-science/vela/releases/download/v0.976.0/vela-linux-x86_64.tar.gz");
  if (!response.ok || !response.body) throw new Error(`failed to acquire Vela 0.976.0: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const archiveRoot = createHash("sha256").update(bytes).digest("hex");
  if (archiveRoot !== "1c77fc823746d3090a5bf3006a0682ae48ac059ae04862f2d520d81ece1d93f5") throw new Error("Vela release archive root drift");
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
if (await root(output) !== expected) throw new Error(`Vela 0.976.0 binary root drift on ${process.platform}`);
await chmod(output, 0o755);
