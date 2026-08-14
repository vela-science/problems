import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { canonicalJson, sha256 } from "../canonical";
import type {
  SourceAdapterInput,
  SourceAdapterRevision,
} from "./contracts";

const execFileAsync = promisify(execFile);

async function git(
  directory: string | null,
  args: string[],
): Promise<string> {
  const { stdout } = await execFileAsync("git", [
    ...(directory === null ? [] : ["-C", directory]),
    ...args,
  ], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim();
}

async function gitBytes(
  directory: string,
  args: string[],
): Promise<Uint8Array> {
  const { stdout } = await execFileAsync("git", ["-C", directory, ...args], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  return new Uint8Array(stdout);
}

export interface ExactGitCheckout {
  directory: string;
  repository: string;
  requested_ref: string;
  commit: string;
  tree: string;
  revision: SourceAdapterRevision;
  input: SourceAdapterInput;
  close(): Promise<void>;
}

export async function acquireExactGitCheckout(
  repository: string,
  requestedRef: string,
): Promise<ExactGitCheckout> {
  if (repository.trim() === "" || requestedRef.trim() === "") {
    throw new Error("repository and requested Git ref are required");
  }
  const temporaryRoot = await mkdtemp(join(tmpdir(), "vela-source-checkout-"));
  const checkout = join(temporaryRoot, "repository");
  try {
    await git(null, [
      "clone",
      "--quiet",
      "--no-checkout",
      "--filter=blob:none",
      "--",
      repository,
      checkout,
    ]);
    await git(checkout, ["fetch", "--quiet", "--no-tags", "origin", requestedRef]);
    const commit = await git(checkout, ["rev-parse", "--verify", "FETCH_HEAD^{commit}"]);
    if (!/^[0-9a-f]{40}$/u.test(commit)) {
      throw new Error(`resolved Git commit is not an exact SHA-1: ${commit}`);
    }
    await git(checkout, ["checkout", "--quiet", "--detach", commit]);
    const tree = await git(checkout, ["rev-parse", "--verify", "HEAD^{tree}"]);
    const status = await git(checkout, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (status !== "") {
      throw new Error("exact source checkout is dirty immediately after acquisition");
    }
    const contentRoot = sha256(canonicalJson({
      commit,
      tree,
    }));
    return {
      directory: checkout,
      repository,
      requested_ref: requestedRef,
      commit,
      tree,
      revision: {
        kind: "git",
        value: commit,
        git_commit: commit,
        git_tree: tree,
        content_root: contentRoot,
      },
      input: {
        input_id: "repository",
        role: "repository",
        locator: repository,
        media_type: "application/vnd.git.tree",
        byte_length: 0,
        content_root: contentRoot,
      },
      async close() {
        await rm(temporaryRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

export interface AcquiredBytes {
  bytes: Uint8Array;
  input: SourceAdapterInput;
}

function inputId(value: string): string {
  const normalized = basename(value.split("?")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return normalized === "" ? "input" : normalized;
}

export async function acquireBytes(
  locator: string,
  options: {
    inputId?: string;
    role?: SourceAdapterInput["role"];
    mediaType: string;
    manifestLocator?: string;
  },
): Promise<AcquiredBytes> {
  let bytes: Uint8Array;
  if (/^https?:\/\//u.test(locator)) {
    const response = await fetch(locator, {
      redirect: "follow",
      headers: {
        accept: options.mediaType,
        "user-agent": "vela-source-adapter/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`source acquisition failed (${response.status}) for ${locator}`);
    }
    bytes = new Uint8Array(await response.arrayBuffer());
  } else {
    bytes = await readFile(resolve(locator));
  }
  return {
    bytes,
    input: {
      input_id: options.inputId ?? inputId(locator),
      role: options.role ?? "retained_snapshot",
      locator: options.manifestLocator ?? locator,
      media_type: options.mediaType,
      byte_length: bytes.byteLength,
      content_root: sha256(bytes),
    },
  };
}

export async function gitBlobRoot(
  checkoutDirectory: string,
  commit: string,
  relativePath: string,
): Promise<{
  byte_length: number;
  content_root: `sha256:${string}`;
}> {
  if (
    relativePath.startsWith("/")
    || relativePath.split("/").some((part) => part === "..")
  ) {
    throw new Error(`source path escapes exact checkout: ${relativePath}`);
  }
  await git(checkoutDirectory, [
    "cat-file",
    "-e",
    `${commit}:${relativePath}`,
  ]);
  const bytes = await gitBytes(checkoutDirectory, [
    "show",
    `${commit}:${relativePath}`,
  ]);
  return {
    byte_length: bytes.byteLength,
    content_root: sha256(bytes),
  };
}
