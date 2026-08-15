import "server-only";

import { constants } from "node:fs";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";
import type { Octokit } from "octokit";
import { inspectCoreIntegration } from "@vela/projection-data";
import { canonicalJson, sha256 } from "@vela/projection-data/canonical";

const fullNamePattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const commitPattern = /^[0-9a-f]{40}$/u;
const archiveLimit = 100 * 1024 * 1024;

type Json = Record<string, unknown>;
type InspectionStatus = "connected" | "structurally_inspected" | "natively_verified" | "unsupported";

export type CodebaseInspection = {
  provider: "github";
  repository_id: number;
  repository_node_id: string;
  full_name: string;
  canonical_locator: string;
  visibility: "public" | "private" | "internal";
  default_branch: string;
  source_commit: string;
  source_tree: string;
  inspection_status: InspectionStatus;
  inspection_root: string;
  inspection: Json;
  receipt_root: string;
  authority_effect: "none";
};

export function normalizeGitHubLocator(input: string): { fullName: string; locator: string } {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Enter a GitHub HTTPS repository URL"); }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.port
    || url.username || url.password || url.search || url.hash) {
    throw new Error("Manual import accepts only public https://github.com/OWNER/REPOSITORY URLs");
  }
  const segments = url.pathname.replace(/^\/+|\/+$/gu, "").split("/");
  if (segments.length !== 2) throw new Error("GitHub URL must identify one repository");
  const fullName = `${segments[0]}/${segments[1].replace(/\.git$/u, "")}`;
  if (!fullNamePattern.test(fullName)) throw new Error("GitHub repository name is invalid");
  return { fullName, locator: `https://github.com/${fullName}.git` };
}

export function assertSafeGitHubArchiveEntry(path: string, type: string): void {
  const normalized = path.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")
    || type === "SymbolicLink" || type === "Link") throw new Error("GitHub archive contains an unsafe path or link");
  if (type !== "File" && type !== "Directory") throw new Error("GitHub archive contains an unsupported entry");
}

export async function resolveBundledVelaPath(cwd = process.cwd()): Promise<string> {
  const candidates = [
    resolve(cwd, ".generated", "vela"),
    resolve(cwd, "apps", "problems", ".generated", "vela"),
  ];
  const available: string[] = [];
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      available.push(candidate);
    } catch {
      // A deployment has exactly one traced executable at either the app or monorepo root.
    }
  }
  if (available.length !== 1) throw new Error("Bundled Core binary custody is unavailable or ambiguous");
  return available[0]!;
}

export async function extractGitHubArchive(bytes: Uint8Array, destination: string): Promise<void> {
  if (bytes.byteLength === 0 || bytes.byteLength > archiveLimit) throw new Error("GitHub archive exceeds the bounded import size");
  const destinationPrefix = resolve(destination) + sep;
  let entries = 0;
  let expandedBytes = 0;
  const extractor = tar.x({
    cwd: destination,
    strip: 1,
    preservePaths: false,
    filter(path, entry) {
      const normalized = path.replaceAll("\\", "/");
      const pieces = normalized.split("/");
      const type = "type" in entry ? entry.type : "";
      assertSafeGitHubArchiveEntry(path, type);
      entries += 1;
      expandedBytes += "size" in entry ? Number(entry.size) : 0;
      if (entries > 20_000 || expandedBytes > 250 * 1024 * 1024) throw new Error("GitHub archive exceeds expanded import bounds");
      const stripped = pieces.slice(1).join("/");
      if (stripped && !resolve(destination, stripped).startsWith(destinationPrefix)) throw new Error("GitHub archive escapes its checkout");
      return true;
    },
  });
  await pipeline(Readable.from([bytes]), extractor);
}

async function runCore(checkout: string): Promise<{ status: InspectionStatus; detail: Json }> {
  try {
    await readFile(resolve(checkout, "vela.toml"));
  } catch {
    return { status: "connected", detail: { schema: "vela.codebase-inspection.v1", vela_toml: "absent", authority_effect: "none" } };
  }
  const vela = process.env.VELA_BIN ?? await resolveBundledVelaPath();
  try {
    const result = await inspectCoreIntegration(vela, checkout);
    return result.checked
      ? { status: "natively_verified", detail: { inspected: result.inspected, checked: result.checked, native_methods_executed: false, authority_effect: "none" } }
      : { status: "structurally_inspected", detail: { inspected: result.inspected, check_error: "Core integration check refused this pinned checkout", native_methods_executed: false, authority_effect: "none" } };
  } catch {
    return { status: "unsupported", detail: { schema: "vela.codebase-inspection.v1", error: "Core integration inspection refused this pinned checkout", authority_effect: "none" } };
  }
}

export async function inspectGitHubCodebase(input: {
  octokit: Octokit;
  fullName: string;
  requestedCommit?: string;
}): Promise<CodebaseInspection> {
  if (!fullNamePattern.test(input.fullName)) throw new Error("GitHub repository name is invalid");
  if (input.requestedCommit && !commitPattern.test(input.requestedCommit)) throw new Error("Revision must be a full lowercase Git commit");
  const [owner, repo] = input.fullName.split("/") as [string, string];
  const metadata = await input.octokit.rest.repos.get({ owner, repo });
  const visibility = metadata.data.visibility;
  if (visibility !== "public" && visibility !== "private" && visibility !== "internal") throw new Error("GitHub repository visibility is unsupported");
  const revision = await input.octokit.rest.repos.getCommit({ owner, repo, ref: input.requestedCommit ?? metadata.data.default_branch });
  const sourceCommit = revision.data.sha;
  const sourceTree = revision.data.commit.tree.sha;
  if (!commitPattern.test(sourceCommit) || !commitPattern.test(sourceTree)) throw new Error("GitHub returned an invalid immutable revision");
  const archive = await input.octokit.rest.repos.downloadTarballArchive({ owner, repo, ref: sourceCommit });
  const bytes = new Uint8Array(archive.data as ArrayBuffer);
  const checkout = await mkdtemp(resolve(tmpdir(), "problems-codebase-"));
  try {
    await extractGitHubArchive(bytes, checkout);
    const result = await runCore(checkout);
    const inspection = {
      schema: "vela.connected-codebase-inspection.v1",
      core_version: "0.976.1",
      status: result.status,
      detail: result.detail,
      source_commit: sourceCommit,
      source_tree: sourceTree,
      authority_effect: "none",
      does_not_establish: ["native Method execution", "Verification", "Decision", "Standing", "Repository authority"],
    };
    const inspectionRoot = sha256(canonicalJson(inspection));
    const receipt = {
      schema: "vela.connected-codebase-receipt.v1",
      provider: "github",
      repository_id: metadata.data.id,
      repository_node_id: metadata.data.node_id,
      canonical_locator: `https://github.com/${metadata.data.full_name}.git`,
      visibility,
      default_branch: metadata.data.default_branch,
      source_commit: sourceCommit,
      source_tree: sourceTree,
      inspection_root: inspectionRoot,
      authority_effect: "none",
    };
    return {
      provider: "github", repository_id: metadata.data.id, repository_node_id: metadata.data.node_id,
      full_name: metadata.data.full_name, canonical_locator: receipt.canonical_locator, visibility,
      default_branch: metadata.data.default_branch, source_commit: sourceCommit, source_tree: sourceTree,
      inspection_status: result.status, inspection_root: inspectionRoot, inspection,
      receipt_root: sha256(canonicalJson(receipt)), authority_effect: "none",
    };
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
}
