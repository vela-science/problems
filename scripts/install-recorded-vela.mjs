import { createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const recordPath = join(repository, "packages/frontier-data/config/vela-release.v1.json");
const rootPattern = /^sha256:[0-9a-f]{64}$/u;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function loadVelaReleaseRecord(path = recordPath) {
  const record = JSON.parse(readFileSync(path, "utf8"));
  invariant(record.schema === "vela.release-record.v1", "unsupported Vela release record schema");
  invariant(record.tag === `v${record.version}`, "Vela release tag does not match its version");
  invariant(rootPattern.test(record.generator_binary_sha256), "Vela generator binary SHA-256 is malformed");
  invariant(rootPattern.test(record.macos_generator_binary_sha256), "Vela macOS generator binary SHA-256 is malformed");
  invariant(rootPattern.test(record.linux_archive_sha256), "Vela Linux archive SHA-256 is malformed");
  invariant(rootPattern.test(record.macos_archive_sha256), "Vela macOS archive SHA-256 is malformed");
  return record;
}

export function linuxReleaseAssetUrl(record) {
  const releaseUrl = new URL(record.release_url);
  const suffix = `/releases/tag/${record.tag}`;
  invariant(releaseUrl.protocol === "https:" && releaseUrl.hostname === "github.com", "Vela release must use github.com over HTTPS");
  invariant(releaseUrl.pathname.endsWith(suffix), "Vela release URL does not match its tag");
  const repositoryPath = releaseUrl.pathname.slice(0, -suffix.length);
  return `https://github.com${repositoryPath}/releases/download/${record.tag}/vela-linux-x86_64.tar.gz`;
}

function sha256(path) {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout.trim();
}

export async function installRecordedLinuxVela({ output = join(repository, "tools/vela") } = {}) {
  invariant(process.platform === "linux" && process.arch === "x64", "the recorded Vela installer supports Linux x86-64 only");
  const record = loadVelaReleaseRecord();
  const work = mkdtempSync(join(tmpdir(), "vela-release-"));
  try {
    const archive = join(work, "vela-linux-x86_64.tar.gz");
    const response = await fetch(linuxReleaseAssetUrl(record), { redirect: "follow" });
    invariant(response.ok, `Vela release download failed with HTTP ${response.status}`);
    writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
    invariant(sha256(archive) === record.linux_archive_sha256, "Vela Linux archive SHA-256 mismatch");

    run("tar", ["--extract", "--gzip", "--file", archive, "--directory", work, "./vela"]);
    const extracted = join(work, "vela");
    invariant(sha256(extracted) === record.generator_binary_sha256, "Vela generator binary SHA-256 mismatch");
    invariant(run(extracted, ["--version"]) === `vela ${record.version}`, "Vela binary version does not match the release record");

    const destination = resolve(output);
    const staged = `${destination}.tmp-${process.pid}`;
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(extracted, staged);
    chmodSync(staged, 0o755);
    renameSync(staged, destination);
    if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `VELA_BIN=${destination}\n`);
    return destination;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function parseOutput(argv) {
  const outputIndex = argv.indexOf("--output");
  if (outputIndex === -1) return undefined;
  invariant(argv[outputIndex + 1], "--output requires a path");
  return argv[outputIndex + 1];
}

if (import.meta.main) {
  const output = await installRecordedLinuxVela({ output: parseOutput(process.argv.slice(2)) });
  console.log(`installed checked Vela release at ${output}`);
}
