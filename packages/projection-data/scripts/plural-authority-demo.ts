import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canonicalJson } from "../src/canonical";
import {
  buildPluralAuthorityRegistry,
  pluralAuthorityReferenceProjection,
  pluralAuthorityReferenceSource,
} from "../src/plural-authority";

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value ? resolve(value) : null;
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

const core = argument("--core");
const vela = argument("--vela") ?? (process.env.VELA_BIN ? resolve(process.env.VELA_BIN) : null);
if (!core) throw new Error("--core /path/to/vela is required; the bounded demo never skips Core replay");
if (!vela) throw new Error("--vela /path/to/vela or VELA_BIN is required; the reader digest is verified before use");

const temporary = await mkdtemp(join(tmpdir(), "vela-plural-authority-demo-"));
try {
  const generated = join(temporary, "plural-authority-reference.v1.json");
  await writeFile(generated, `${JSON.stringify(pluralAuthorityReferenceSource, null, 2)}\n`);
  const generation = JSON.parse(await run([
    process.execPath,
    join(import.meta.dir, "generate-plural-authority-reference.ts"),
    "--core",
    core,
    "--vela",
    vela,
    "--output",
    generated,
  ]));
  const independentlyDerived = JSON.parse(await readFile(generated, "utf8"));
  if (canonicalJson(independentlyDerived) !== canonicalJson(pluralAuthorityReferenceSource)) {
    throw new Error("retained plural-authority source differs from independent two-bundle derivation");
  }
  const rebuilt = buildPluralAuthorityRegistry(independentlyDerived);
  if (canonicalJson(rebuilt) !== canonicalJson(pluralAuthorityReferenceProjection)) {
    throw new Error("discardable registry/Frontier rebuild drift");
  }
  console.log(JSON.stringify({
    verified: true,
    authority_effect: "none",
    derivation: generation,
    source_root: rebuilt.source_root,
    registry_projection_root: rebuilt.projection_root,
    repositories: rebuilt.repositories.map(({ repository_id, local_standing, source, decision }) => ({
      repository_id,
      repository_root: source.repository_root,
      projection_root: source.replay_projection_root,
      evidence_root: source.evidence_root,
      decision_root: decision.decision_record_root,
      decision_event_root: decision.event_root,
      performer: decision.performer,
      principal_id: decision.principal_id,
      proposal_status: decision.status,
      local_standing,
      replay_verified: source.replay_verified,
    })),
    frontiers: rebuilt.frontiers.map(({ id, query_root, result_root, source_projection_root }) => ({ id, query_root, result_root, source_projection_root })),
  }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
