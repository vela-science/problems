import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import {
  pluralAuthorityReferenceProjection,
  pluralAuthorityReferenceSource,
} from "../src/plural-authority";

const args = process.argv.slice(2);
const coreIndex = args.indexOf("--core");
const core = coreIndex >= 0 && args[coreIndex + 1] ? resolve(args[coreIndex + 1]!) : null;

async function digest(path: string): Promise<string> {
  return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
}

async function run(command: string[], cwd?: string): Promise<string> {
  const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exit !== 0) throw new Error(`${command.join(" ")} failed: ${stderr.trim()}`);
  return stdout.trim();
}

async function verifyCoreHistories(corePath: string) {
  const source = pluralAuthorityReferenceSource;
  const tree = await run(["git", "rev-parse", `${source.protocol_source.commit}^{tree}`], corePath);
  if (tree !== source.protocol_source.tree) throw new Error("Protocol source tree drift");
  const reference = join(corePath, "examples", "portable-divergence");
  const paths = {
    flow_root: join(reference, "flow.json"),
    expected_root: join(reference, "expected.json"),
    accept_bundle_root: join(reference, "accept.git.bundle"),
    reject_bundle_root: join(reference, "reject.git.bundle"),
  } as const;
  for (const [key, path] of Object.entries(paths)) {
    const actual = await digest(path);
    if (actual !== source.protocol_source.portable_divergence[key as keyof typeof paths]) {
      throw new Error(`${basename(path)} root drift`);
    }
  }
  const correction = join(corePath, "conformance", "fixtures", "correction");
  const correctionInput = join(correction, "diamond-input.json");
  const correctionExpected = join(correction, "diamond-expected.json");
  if (await digest(correctionInput) !== source.protocol_source.correction_conformance.input_root) {
    throw new Error("correction input root drift");
  }
  if (await digest(correctionExpected) !== source.protocol_source.correction_conformance.expected_root) {
    throw new Error("correction expected root drift");
  }
  const correctionProjection = JSON.parse(await readFile(correctionExpected, "utf8"));
  if (correctionProjection.projection_root !== source.protocol_source.correction_conformance.projection_root) {
    throw new Error("correction projection root drift");
  }

  const vela = resolve(process.env.VELA_BIN ?? join(homedir(), ".local", "bin", "vela"));
  if (await digest(vela) !== source.protocol_source.reader_sha256) throw new Error("Vela reader digest drift");
  const temporary = await mkdtemp(join(tmpdir(), "vela-plural-authority-"));
  try {
    const reads = [];
    for (const label of ["accept", "reject"] as const) {
      const checkout = join(temporary, label);
      await run(["git", "clone", "--quiet", paths[`${label}_bundle_root`], checkout]);
      const status = JSON.parse(await run([vela, "status", checkout, "--json"]));
      const replay = JSON.parse(await run([vela, "replay", checkout, "--json"]));
      const expected = source.repositories.find(({ decision }) => decision.status === (label === "accept" ? "accepted" : "rejected"));
      if (!expected) throw new Error(`${label} Repository expectation missing`);
      if (
        status.repository.id !== expected.repository_id
        || replay.repository_id !== expected.repository_id
        || replay.git_commit !== expected.git_commit
        || replay.git_tree !== expected.git_tree
        || replay.repository_root !== expected.repository_root
        || replay.authority_keyset_root !== expected.authority_keyset_root
        || replay.authority_model_root !== expected.authority_policy_root
        || replay.counts.accepted_claims !== (expected.local_standing === "accepted" ? 1 : 0)
      ) {
        throw new Error(`${label} Protocol reader result drift`);
      }
      reads.push({
        label,
        repository_id: replay.repository_id,
        repository_root: replay.repository_root,
        git_commit: replay.git_commit,
        git_tree: replay.git_tree,
        accepted_claims: replay.counts.accepted_claims,
      });
    }
    return {
      core: corePath,
      tree,
      reader: vela,
      correction_projection_root: correctionProjection.projection_root,
      reads,
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

const replay = core ? await verifyCoreHistories(core) : {
  skipped: true,
  reason: "Pass --core /path/to/vela at the pinned commit to re-read both frozen Git histories.",
};

console.log(JSON.stringify({ replay, registry: pluralAuthorityReferenceProjection }, null, 2));
