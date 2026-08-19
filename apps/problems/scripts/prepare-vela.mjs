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
  ? "89e5f366db5480a011c722bdc7d3c7f09e07fe78c0cd2855d2e53d3a419520a0"
  : "3a1173918bdcb887155bab681411bf5e9ff64d925fe1b50369ac37ab020b94ad";
const root = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

await mkdir(resolve(app, ".generated"), { recursive: true });
if (process.platform === "linux") {
  const response = await fetch("https://github.com/vela-science/vela/releases/download/v0.977.3/vela-linux-x86_64.tar.gz");
  if (!response.ok || !response.body) throw new Error(`failed to acquire Vela 0.977.3: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const archiveRoot = createHash("sha256").update(bytes).digest("hex");
  if (archiveRoot !== "072af0182152ac4b4a8f04cec7e37f1dc3b5b7a42f49ef4066cce559e26835b3") throw new Error("Vela release archive root drift");
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
if (await root(output) !== expected) throw new Error(`Vela 0.977.3 binary root drift on ${process.platform}`);
await chmod(output, 0o755);
