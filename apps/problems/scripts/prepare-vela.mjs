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
  ? "ccf58c5fa63a7f41920824fa8d086ec6f36d4e6b443f86f233926263ee5c6611"
  : "669e76620b814b3a8a4acc5fb73e1cd775c979543043b7389bb454cad076960a";
const root = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

await mkdir(resolve(app, ".generated"), { recursive: true });
if (process.platform === "linux") {
  const response = await fetch("https://github.com/vela-science/vela/releases/download/v0.976.1/vela-linux-x86_64.tar.gz");
  if (!response.ok || !response.body) throw new Error(`failed to acquire Vela 0.976.1: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const archiveRoot = createHash("sha256").update(bytes).digest("hex");
  if (archiveRoot !== "3acfd3b0cd59727fdb89e4cb2163172112fcdbcb195040520498df42f685eb2b") throw new Error("Vela release archive root drift");
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
if (await root(output) !== expected) throw new Error(`Vela 0.976.1 binary root drift on ${process.platform}`);
await chmod(output, 0o755);
