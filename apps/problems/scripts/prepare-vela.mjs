import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import * as tar from "tar";
import release from "../../../packages/projection-data/config/vela-release.v1.json";

const app = resolve(import.meta.dirname, "..");
const output = resolve(app, ".generated", "vela");
const digest = (name) => release[name].slice("sha256:".length);
const expected = process.platform === "linux"
  ? digest("generator_binary_sha256")
  : digest("macos_generator_binary_sha256");
const root = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

await mkdir(resolve(app, ".generated"), { recursive: true });
if (process.platform === "linux") {
  const archive = `https://github.com/vela-science/vela/releases/download/${release.tag}/vela-linux-x86_64.tar.gz`;
  const response = await fetch(archive);
  if (!response.ok || !response.body) throw new Error(`failed to acquire Vela ${release.version}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const archiveRoot = createHash("sha256").update(bytes).digest("hex");
  if (archiveRoot !== digest("linux_archive_sha256")) throw new Error("Vela release archive root drift");
  const temporary = await mkdtemp(resolve(tmpdir(), "problems-vela-"));
  try {
    await pipeline(Readable.from([bytes]), tar.x({ cwd: temporary }));
    await copyFile(resolve(temporary, "vela"), output);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
} else {
  await copyFile(process.env.VELA_BIN ?? resolve(homedir(), ".local/bin/vela"), output);
}
if (await root(output) !== expected) throw new Error(`Vela ${release.version} binary root drift on ${process.platform}`);
await chmod(output, 0o755);
