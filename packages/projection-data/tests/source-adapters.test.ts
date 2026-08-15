import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifySourceAdapterBundle,
  writeSourceAdapterBundle,
} from "../src/source-adapters/bundle";
import { createSourceAdapterBundle } from "../src/source-adapters/contracts";
import { acquireErdosProblems } from "../src/source-adapters/erdos-problems";
import {
  acquireFormalConjectures,
  formalConjecturesRelease,
  resolvePagesDeploymentCommit,
} from "../src/source-adapters/formal-conjectures";
import {
  acquireLocalSnapshot,
  localSnapshotAdapters,
  type LocalSnapshotAdapterName,
} from "../src/source-adapters/local-snapshots";
import { materializeVerifiedSourceAdapterBundle } from "../src/source-adapters/projection";
import {
  acquireProjectionSourceAdapters,
  loadProjectionSourceAdapterSet,
  projectionSourceAcquisition,
  projectionSourceAdapterIds,
  requiresProjectionSourceAdapter,
} from "../src/source-adapters/refresh";
import { acquirePinnedProofManifest } from "../src/source-adapters/proof-manifests";
import { acquireOeisA309370 } from "../src/source-adapters/oeis";
import { acquireVibemathed } from "../src/source-adapters/vibemathed";
import {
  acquireOpenAiTenProofs,
  openAiTenProofsRelease,
} from "../src/source-adapters/openai-ten-proofs";
import { acquirePhyslib } from "../src/source-adapters/physlib";
import {
  loadProjectionSourceAdapterArtifact,
  writeProjectionSourceAdapterArtifact,
} from "../src/source-adapters/artifact";
import { mathSourceRegistry } from "../src/math-sources";
import { sha256 } from "../src/canonical";

let fixtureRoot = "";
let formalFixtureIndex = 0;
let proofFixtureIndex = 0;
let openAiFixtureIndex = 0;
let physlibFixtureIndex = 0;
let erdosFixtureIndex = 0;
const exactPlbyTest = process.env.VELA_REPOSITORIES_ROOT ? test : test.skip;

async function json(path: string, value: unknown): Promise<string> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`);
  return path;
}

function git(directory: string, args: string[]): string {
  return execFileSync("git", ["-C", directory, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function formalFixture() {
  formalFixtureIndex += 1;
  const root = join(fixtureRoot, `formal-${formalFixtureIndex}`);
  const repository = join(root, "formal-conjectures");
  await mkdir(join(repository, "FormalConjectures", "Books"), { recursive: true });
  await mkdir(join(repository, "FormalConjectures", "Paper"), { recursive: true });
  await writeFile(
    join(repository, "FormalConjectures", "Books", "One.lean"),
    "theorem one : True := by trivial\n\ntheorem one_variant : True := by trivial\n",
  );
  await writeFile(
    join(repository, "FormalConjectures", "Paper", "Two.lean"),
    "theorem two : True := by trivial\n",
  );
  execFileSync("git", ["init", "-q", repository]);
  git(repository, ["config", "user.name", "Vela Test"]);
  git(repository, ["config", "user.email", "test@vela.invalid"]);
  git(repository, ["add", "."]);
  git(repository, ["commit", "-q", "-m", "fixture"]);
  const commit = git(repository, ["rev-parse", "HEAD"]);
  const published = await json(join(root, "conjectures.json"), {
    conjectures: [
      {
        theorem: "Books.one",
        module: "FormalConjectures.Books.One",
        category: "research open",
        displayTheorem: "Books.one",
        githubPath: "FormalConjectures/Books/One.lean",
        sourceUrl: "/src/FormalConjectures/Books/One/#Books.one",
        collection: "Books",
        subjects: [{ code: "11", name: "Number theory" }],
        hasFormalProof: false,
        formalProofKind: null,
        formalProofLink: null,
      },
      {
        theorem: "Books.one_variant",
        module: "FormalConjectures.Books.One",
        category: "research solved",
        displayTheorem: "Books.one_variant",
        githubPath: "FormalConjectures/Books/One.lean",
        sourceUrl: "/src/FormalConjectures/Books/One/#Books.one_variant",
        collection: "Books",
        subjects: [{ code: "11", name: "Number theory" }],
        hasFormalProof: true,
        formalProofKind: "formal_conjectures",
        formalProofLink: "https://example.test/proof",
      },
      {
        theorem: "Paper.two",
        module: "FormalConjectures.Paper.Two",
        category: "research open",
        displayTheorem: "Paper.two",
        githubPath: "FormalConjectures/Paper/Two.lean",
        sourceUrl: "/src/FormalConjectures/Paper/Two/#Paper.two",
        collection: "Paper",
        subjects: [{ code: "05", name: "Combinatorics" }],
        hasFormalProof: false,
        formalProofKind: null,
        formalProofLink: null,
      },
    ],
    stats: { total: 3 },
  });
  const extracted = await json(join(root, "extract_names.json"), {
    problems: [
      {
        theorem: "Books.one",
        module: "FormalConjectures.Books.One",
        category: "research open",
        subjects: ["11"],
        statement: "True",
        docstring: "The first exact statement.",
        hasSorryFreeProof: false,
      },
      {
        theorem: "Books.one_variant",
        module: "FormalConjectures.Books.One",
        category: "research solved",
        subjects: ["11"],
        statement: "True",
        docstring: "A solved variant.",
        hasSorryFreeProof: true,
      },
      {
        theorem: "Paper.two",
        module: "FormalConjectures.Paper.Two",
        category: "research open",
        subjects: ["05"],
        statement: "True",
        docstring: "The second exact statement.",
        hasSorryFreeProof: false,
      },
    ],
  });
  return { repository, commit, published, extracted };
}

async function openAiTenProofsFixture() {
  openAiFixtureIndex += 1;
  const repository = join(fixtureRoot, `openai-ten-proofs-${openAiFixtureIndex}`);
  const challenges = join(repository, "ComparatorChallenges");
  await mkdir(challenges, { recursive: true });
  const results = Array.from({ length: 12 }, (_, index) => {
    const suffix = `${String.fromCharCode(65 + index)}_Fixture${index + 1}`;
    return {
      name: `Fixture result ${index + 1}`,
      comparator_config: `ComparatorChallenges/${suffix}.json`,
      challenge_module: `ComparatorChallenges.${suffix}`,
      solution_module: `Solution${index + 1}`,
      theorem_name: `Solution${index + 1}.result`,
    };
  });
  await json(join(repository, "formalization.yaml"), {
    version: "v0.3",
    project: {
      name: "Ten advances fixture",
      authors: ["OpenAI"],
      license: "Apache-2.0",
    },
    status: {
      scope: "Twelve exact Comparator fixture profiles.",
      axioms: ["propext", "Classical.choice", "Quot.sound"],
      main_results: results.map(({ name, comparator_config }) => ({
        name,
        comparator_config,
      })),
    },
    review: { status: "agent-reviewed" },
  });
  await writeFile(join(repository, "lean-toolchain"), "leanprover/lean4:v4.32.0\n");
  await writeFile(join(repository, "lakefile.toml"), "name = \"fixture\"\n");
  await json(join(repository, "lake-manifest.json"), {
    version: "1.2.0",
    packages: [{
      name: "mathlib",
      url: "https://github.com/leanprover-community/mathlib4",
      rev: "1".repeat(40),
      inputRev: "v4.32.0",
    }],
  });
  await writeFile(join(repository, "LICENSE"), "Apache License 2.0 fixture\n");
  for (const result of results) {
    await json(join(repository, result.comparator_config), {
      challenge_module: result.challenge_module,
      solution_module: result.solution_module,
      theorem_names: [result.theorem_name],
      permitted_axioms: ["propext", "Classical.choice", "Quot.sound"],
      enable_nanoda: true,
    });
    await writeFile(
      join(repository, `${result.challenge_module.replaceAll(".", "/")}.lean`),
      "theorem result : True := by trivial\n",
    );
    await writeFile(
      join(repository, `${result.solution_module}.lean`),
      "theorem result : True := by trivial\n",
    );
  }
  execFileSync("git", ["init", "-q", repository]);
  git(repository, ["config", "user.name", "Vela Test"]);
  git(repository, ["config", "user.email", "test@vela.invalid"]);
  git(repository, ["add", "."]);
  git(repository, ["commit", "-q", "-m", "fixture OpenAI release"]);
  /* The adapter fails closed on an unpinned revision, so a fixture pointing at
     its own repository has to say what it expects to find there. Read off the
     fixture's own committed blobs, which is what the pinned roots are for the
     real release. Same shape as `physlibFixture`, for the same reason. */
  const exactRoots = Object.fromEntries(await Promise.all((
    [
      ["license", "LICENSE"],
      ["formalization_manifest", "formalization.yaml"],
      ["lean_toolchain", "lean-toolchain"],
      ["lakefile", "lakefile.toml"],
      ["lake_manifest", "lake-manifest.json"],
    ] as const
  ).map(async ([key, path]) => [
    key,
    sha256(await readFile(join(repository, path))),
  ])));
  return {
    repository,
    publicRepository: openAiTenProofsRelease.public_repository,
    commit: git(repository, ["rev-parse", "HEAD"]),
    tree: git(repository, ["rev-parse", "HEAD^{tree}"]),
    exactRoots,
  };
}

async function physlibFixture() {
  physlibFixtureIndex += 1;
  const repository = join(fixtureRoot, `physlib-${physlibFixtureIndex}`);
  const apiDirectory = join(repository, "Physlib", "Mechanics", "Fixture");
  await mkdir(apiDirectory, { recursive: true });
  await writeFile(join(repository, "LICENSE"), "Apache License 2.0 fixture\n");
  await writeFile(join(repository, "lean-toolchain"), "leanprover/lean4:v4.32.0\n");
  await writeFile(join(repository, "lakefile.toml"), "name = \"physlib-fixture\"\n");
  await json(join(repository, "lake-manifest.json"), { version: "1.2.0", packages: [] });
  await writeFile(join(repository, "AI-POLICY.md"), "# AI policy\n\nHuman authors remain responsible.\n");
  await writeFile(join(repository, "AGENTS.md"), "# Agent guidance\n\nDo not use sorry.\n");
  await mkdir(join(repository, "docs"), { recursive: true });
  await writeFile(join(repository, "docs", "API_MAP_GUIDE.md"), "# API map guide\n");
  await writeFile(join(repository, "docs", "ReviewGuidelines.md"), "# Review guidelines\n");
  await writeFile(
    join(apiDirectory, "Basic.lean"),
    "def Fixture.value : Nat := 1\n",
  );
  await writeFile(
    join(apiDirectory, "API-map.yaml"),
    `version: v0.1
Title: Fixture mechanics
Overview: |
  A bounded fixture API.
ParentAPIs: []
References: []
Requirements:
  - description: "The fixture value is defined."
    done: true
    location: "Physlib/Mechanics/Fixture/Basic.lean (Fixture.value)"
  - description: "The fixture shall expose a theorem."
    done: false
    location: "N/A"
`,
  );
  execFileSync("git", ["init", "-q", repository]);
  git(repository, ["config", "user.name", "Vela Test"]);
  git(repository, ["config", "user.email", "test@vela.invalid"]);
  git(repository, ["add", "."]);
  git(repository, ["commit", "-q", "-m", "fixture Physlib API map"]);
  const commit = git(repository, ["rev-parse", "HEAD"]);
  /* The adapter fails closed on an unpinned revision, so a fixture pointing at
     its own repository has to say what it expects to find there. These are read
     off the fixture's own committed blobs, which is what the pinned roots are
     for the real release. */
  const exactRoots = Object.fromEntries(await Promise.all((
    [
      ["license", "LICENSE"],
      ["lean_toolchain", "lean-toolchain"],
      ["lakefile", "lakefile.toml"],
      ["lake_manifest", "lake-manifest.json"],
      ["ai_policy", "AI-POLICY.md"],
      ["agent_guidance", "AGENTS.md"],
      ["api_map_guide", "docs/API_MAP_GUIDE.md"],
      ["review_guidelines", "docs/ReviewGuidelines.md"],
    ] as const
  ).map(async ([key, path]) => [
    key,
    sha256(await readFile(join(repository, path))),
  ])));
  return {
    repository,
    publicRepository: "https://github.com/leanprover-community/physlib",
    commit,
    tree: git(repository, ["rev-parse", "HEAD^{tree}"]),
    exactRoots,
  };
}

async function proofManifestFixture(
  kind: "jayyhk" | "plby" | "williamjblair",
) {
  proofFixtureIndex += 1;
  const root = join(
    fixtureRoot,
    `${kind}-proof-manifest-${proofFixtureIndex}`,
  );
  const repository = join(root, "repository");
  const manifestPath = kind === "jayyhk"
    ? "data/problems.yaml"
    : kind === "plby"
      ? "data/sources.yaml"
      : "proofs.yaml";
  const manifest = kind === "jayyhk"
    ? `- number: "16"
  proof:
    path: "problems/16/"
    theorem: "Erdos16.erdos_16"
    state: "complete"
    lean_toolchain: "leanprover/lean4:v4.24.0"
    mathlib_revision: "f897ebcf72cd16f89ab4577d0c826cd14afaafc7"
    sources:
      - "https://www.erdosproblems.com/16"
`
    : kind === "plby"
      ? `- key: ErdosProblems.Erdos16
  epc: https://www.erdosproblems.com/16
  author:
    informal:
      human: Yong-Gao Chen
    formal:
      AI:
        - Gemini 3.1 Pro
        - Antigravity
      human: Daniel Chin
  arxiv: https://arxiv.org/abs/2312.04120
  url:
    - https://github.com/danielchin/proofs/blob/main/Proofs/ErdosProblems/Erdos16.lean
    - https://www.erdosproblems.com/forum/thread/16#post-4464
  version:
    - "4.24.0"
    - "4.28.0"
  conditional:
    - imported_result_one
    - imported_result_two
  partial: yes
`
    : `repo: williamjblair/lean-proofs
toolchain: leanprover/lean4:v4.29.1
mathlib: v4.29.1
proofs:
  - problem: 154
    source: erdosproblems
    file: ErdosProblems/Erdos154Sumset.lean
    theorem: Erdos154.erdos_154_sumset
    axioms_clean: true
    fc_target: FormalConjectures/ErdosProblems/154.lean
`;
  await mkdir(join(repository, manifestPath, ".."), { recursive: true });
  await writeFile(join(repository, manifestPath), manifest);
  execFileSync("git", ["init", "-q", repository]);
  git(repository, ["config", "user.name", "Vela Test"]);
  git(repository, ["config", "user.email", "test@vela.invalid"]);
  git(repository, ["add", "."]);
  git(repository, ["commit", "-q", "-m", "fixture"]);
  const commit = git(repository, ["rev-parse", "HEAD"]);
  return {
    repository,
    commit,
    manifestPath,
    manifestRoot: sha256(Buffer.from(manifest)),
    logicalManifestLocator: `https://example.test/${kind}.yaml`,
  };
}

async function erdosProblemsFixture(overrides: { registry?: string } = {}) {
  erdosFixtureIndex += 1;
  const repository = join(
    fixtureRoot,
    `erdos-problem-registry-${erdosFixtureIndex}`,
    "repository",
  );
  const dataPath = "data/problems.yaml";
  /* Upstream's real shape: `status` and `formalized` are regenerated by its CI
     from `informal_status` and `formal_status`, so all four are present and the
     adapter carries them through rather than recomputing any of them. */
  const registry = overrides.registry ?? `- number: "1"
  prize: "$500"
  informal_status:
    state: open
    last_update: "2025-08-31"
  formal_status:
    state: unformalized
  status:
    state: open
    last_update: "2025-08-31"
  formalized:
    state: "yes"
    last_update: "2025-08-31"
  oeis:
    - A276661
  tags:
    - number theory
    - additive combinatorics
- number: "2"
  prize: "no"
  informal_status:
    state: proved
  formal_status:
    state: Lean
    url: https://example.test/2.lean
  status:
    state: proved (Lean)
  formalized:
    state: "no"
  oeis: []
  tags:
    - graph theory
`;
  await mkdir(join(repository, dataPath, ".."), { recursive: true });
  await writeFile(join(repository, dataPath), registry);
  execFileSync("git", ["init", "-q", repository]);
  git(repository, ["config", "user.name", "Vela Test"]);
  git(repository, ["config", "user.email", "test@vela.invalid"]);
  git(repository, ["add", "."]);
  git(repository, ["commit", "-q", "-m", "fixture"]);
  return {
    repository,
    commit: git(repository, ["rev-parse", "HEAD"]),
    dataPath,
    dataRoot: sha256(Buffer.from(registry)),
    logicalLocator: "https://example.test/problems.yaml",
  };
}

async function oeisFixture() {
  return json(join(fixtureRoot, "oeis-a309370.json"), {
    number: 309370,
    data: "1,2,3,5,7,12,15",
    name: "Maximum size of a Sidon subset of {0,1}^n.",
    offset: "0,2",
    keyword: "nonn,more",
    comment: ["A bounded attributed comment."],
  });
}

/* `generated` is the field that makes this source unpinnable, so the fixture
   carries it and the tests below exercise it rather than working around it. */
function vibemathedDocument(generated: string) {
  return {
    title: "VibeMathed - math problems solved by AI",
    url: "https://vibemathed.com",
    license: "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)",
    methodology: "https://vibemathed.com/methodology",
    generated,
    count: 2,
    problems: [
      {
        slug: "erdos-180",
        name: "Erdős Problem #180: Compactness Conjecture",
        shortName: "Erdős #180",
        problemNumber: 180,
        field: "Extremal graph theory",
        fieldGroup: "Combinatorics",
        statement: "A bounded attributed statement, retained under CC BY 4.0.",
        posedBy: "Paul Erdős, Miklós Simonovits",
        yearPosed: 1982,
        solveType: "disproved",
        resolution: "candidate",
        aiContribution: "ai-discovered",
        verification: "unreviewed",
        significance: 42,
        significanceNote: "A bounded attributed note.",
        solveDate: "2026-08-01",
        model: "A fixture model",
        modelMaker: "A fixture maker",
        humanCollaborators: [],
        publication: "preprint",
        sourceName: "Fixture preprint",
        sourceUrl: "https://example.test/preprint",
        links: [
          { label: "Fixture preprint", url: "https://example.test/preprint", kind: "paper" },
          { label: "Fixture Lean", url: "https://example.test/lean", kind: "code" },
        ],
        upvotes: 3,
        downvotes: 0,
        commentCount: 1,
        submittedBy: "a-pseudonym",
      },
      {
        slug: "a-problem-with-no-statement",
        name: "A problem the catalogue states no statement for",
        fieldGroup: "Analysis",
        statement: null,
        solveType: "proved",
        resolution: "resolved",
        aiContribution: "ai-assisted",
        verification: "lean-verified",
        significance: 7,
        significanceNote: "A bounded attributed note.",
        solveDate: "2026-07-04",
        model: "A fixture model",
        publication: "preprint",
        sourceName: "Fixture source",
        sourceUrl: "https://example.test/other",
        upvotes: 0,
        downvotes: 0,
        commentCount: 0,
        submittedBy: null,
      },
    ],
  };
}

let vibemathedFixtureIndex = 0;

async function vibemathedFixture(
  document: unknown = vibemathedDocument("2026-08-07T20:02:14.079Z"),
) {
  vibemathedFixtureIndex += 1;
  return json(
    join(fixtureRoot, `vibemathed-${vibemathedFixtureIndex}.json`),
    document,
  );
}

beforeAll(async () => {
  fixtureRoot = await mkdtemp(join(tmpdir(), "vela-source-adapters-test-"));
});

afterAll(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

/*
  Nothing exercised this adapter, which is how it shipped emitting four nested
  objects into a metadata field the contract declares as flat scalars. The
  projection canonical-JSONs anything that is not a scalar, so `status` was
  retained as the *text* `{"last_update":"2025-08-31","state":"open"}` and every
  read of a declared status returned NULL across all 1,217 problems. The page
  drew that as a source that had recorded nothing.
*/
describe("Erdős problem registry source adapter", () => {
  test("retains every declared state as a flat scalar the contract can hold", async () => {
    const fixture = await erdosProblemsFixture();
    const acquired = await acquireErdosProblems({
      repository: fixture.repository,
      revision: fixture.commit,
      dataPath: fixture.dataPath,
      expectedDataRoot: fixture.dataRoot,
      logicalLocator: fixture.logicalLocator,
    });

    expect(acquired.records.map(({ native_id }) => native_id))
      .toEqual(["erdos:1", "erdos:2"]);
    /* Not one nested object, and not one JSON string standing in for one. */
    for (const record of acquired.records) {
      for (const [key, value] of Object.entries(record.metadata)) {
        if (key === "tags" || key === "oeis") {
          expect(Array.isArray(value)).toBe(true);
          continue;
        }
        expect(["string", "number", "boolean", "object"]).toContain(typeof value);
        expect(value === null || typeof value !== "object").toBe(true);
        if (typeof value === "string") expect(value.startsWith("{")).toBe(false);
      }
    }

    expect(acquired.records[0].metadata).toMatchObject({
      problem_number: 1,
      prize: "$500",
      tags: ["number theory", "additive combinatorics"],
      oeis: ["A276661"],
      status_state: "open",
      status_last_update: "2025-08-31",
      informal_status_state: "open",
      informal_status_last_update: "2025-08-31",
      formal_status_state: "unformalized",
      formalized_state: "yes",
      formalized_last_update: "2025-08-31",
    });
    /* Upstream's own derived combination is carried beside the primitives it
       is derived from, and neither is recomputed here. */
    expect(acquired.records[1].metadata).toMatchObject({
      status_state: "proved (Lean)",
      informal_status_state: "proved",
      formal_status_state: "Lean",
      formal_status_url: "https://example.test/2.lean",
      formalized_state: "no",
    });
    /* A leaf upstream did not declare is absent, not invented. */
    expect(acquired.records[1].metadata).not.toHaveProperty("status_last_update");
  });

  test("refuses a registry that nests something the metadata contract cannot hold", async () => {
    const fixture = await erdosProblemsFixture({
      registry: `- number: "1"
  status:
    state: open
    provenance:
      by: upstream
`,
    });
    await expect(acquireErdosProblems({
      repository: fixture.repository,
      revision: fixture.commit,
      dataPath: fixture.dataPath,
      expectedDataRoot: fixture.dataRoot,
      logicalLocator: fixture.logicalLocator,
    })).rejects.toThrow();
  });
});

describe("Formal Conjectures source adapter", () => {
  test("ingests every official published theorem against an exact checkout", async () => {
    const fixture = await formalFixture();
    const acquired = await acquireFormalConjectures({
      repository: fixture.repository,
      revision: fixture.commit,
      publishedDataset: fixture.published,
      extractedDataset: fixture.extracted,
    });
    expect(acquired.coverage).toMatchObject({
      status: "complete",
      native_record_count: 3,
      emitted_record_count: 3,
      omitted_record_count: 0,
    });
    expect(acquired.revision).toMatchObject({
      kind: "git",
      git_commit: fixture.commit,
    });
    expect(acquired.records.map(({ native_id }) => native_id).sort()).toEqual([
      "Books.one",
      "Books.one_variant",
      "Paper.two",
    ]);
    expect(acquired.records.every(({ summary }) => summary === "True")).toBe(true);
    expect(acquired.records.every(({ metadata }) => (
      typeof metadata.source_blob_root === "string"
      && metadata.source_blob_root.startsWith("sha256:")
    ))).toBe(true);
    /* Four flat leaves, carrying what the nested `formal_proof` object carried.
       Nesting is checked separately and generally; this is the other half —
       that flattening kept the values rather than dropping them. */
    expect(acquired.records.map(({ native_id, metadata }) => [
      native_id,
      metadata.formal_proof_present,
      metadata.formal_proof_kind,
      metadata.formal_proof_sorry_free,
    ]).sort()).toEqual([
      ["Books.one", false, null, false],
      ["Books.one_variant", true, "formal_conjectures", true],
      ["Paper.two", false, null, false],
    ]);
    /* Two aligned lists of strings, not one list of `{code, name}` objects.
       Alignment is the losslessness: index i of each is one of upstream's
       entries, in upstream's order, so the original list rebuilds by zipping. */
    expect(acquired.records.map(({ native_id, metadata }) => [
      native_id,
      metadata.subject_codes,
      metadata.subject_names,
    ]).sort()).toEqual([
      ["Books.one", ["11"], ["Number theory"]],
      ["Books.one_variant", ["11"], ["Number theory"]],
      ["Paper.two", ["05"], ["Combinatorics"]],
    ]);
    /* The list of objects is gone, not carried alongside. Keeping both would
       leave the unreadable encoding in the projection with a readable one
       beside it, which is two answers to one question. */
    expect(acquired.records.every(({ metadata }) => !("subjects" in metadata))).toBe(true);

    const output = join(fixtureRoot, "formal-output");
    const bundle = await writeSourceAdapterBundle(output, acquired, {
      chunkRecordLimit: 2,
    });
    expect(bundle.output.chunks.map(({ record_count }) => record_count)).toEqual([2, 1]);
    const verified = await verifySourceAdapterBundle(output);
    expect(verified.records).toHaveLength(3);
    expect(verified.bundle.bundle_root).toBe(bundle.bundle_root);
    const streamed = await verifySourceAdapterBundle(output, {
      collectRecords: false,
    });
    expect(streamed.records).toBeNull();
    expect(streamed.bundle.bundle_root).toBe(bundle.bundle_root);
  });

  test("fails closed when the official dataset names a missing source path", async () => {
    const fixture = await formalFixture();
    const document = JSON.parse(await readFile(fixture.published, "utf8"));
    document.conjectures[0].githubPath = "FormalConjectures/Missing.lean";
    const missing = await json(join(fixtureRoot, "missing-path.json"), document);
    await expect(acquireFormalConjectures({
      repository: fixture.repository,
      revision: fixture.commit,
      publishedDataset: missing,
    })).rejects.toThrow();
  });

  /* The two subject shapes the published type admits and this pin never uses.
     `subjects` is flattened into two aligned lists of strings, which is only
     lossless while every entry carries a string code and a string name — so a
     pin where one does not must fail in the adapter, naming the field, rather
     than reach the projection as something a reader has to guess at. This is
     `declaredStateSchema`'s catchall in `erdos-problems.ts` doing the same job
     one file over. */
  test("refuses a subject that is not a code and a name", async () => {
    for (const subject of ["11", { code: "11" }, { name: "Number theory" }]) {
      const fixture = await formalFixture();
      const document = JSON.parse(await readFile(fixture.published, "utf8"));
      document.conjectures[0].subjects = [subject];
      const path = await json(join(fixtureRoot, `subject-${JSON.stringify(subject).length}.json`), document);
      await expect(acquireFormalConjectures({
        repository: fixture.repository,
        revision: fixture.commit,
        publishedDataset: path,
      })).rejects.toThrow("must be an object carrying a string code and a string name");
    }
  });

  /* A leaf this adapter does not name would be dropped with nothing recording
     that it existed, which is the undisclosed loss the flattening rule exists to
     prevent. Checking only that `code` and `name` are strings would let an
     enriched subject through. */
  test("refuses a subject carrying a leaf it would drop", async () => {
    const fixture = await formalFixture();
    const document = JSON.parse(await readFile(fixture.published, "utf8"));
    document.conjectures[0].subjects = [
      { code: "11", name: "Number theory", wikidata: "Q12503" },
    ];
    const path = await json(join(fixtureRoot, "subject-enriched.json"), document);
    await expect(acquireFormalConjectures({
      repository: fixture.repository,
      revision: fixture.commit,
      publishedDataset: path,
    })).rejects.toThrow("carries [code, name, wikidata] and this adapter retains code and name");
  });

  /* The failing record has to be nameable. `module` repeats — the fixture's own
     first two conjectures share `FormalConjectures.Books.One` — so an error
     keyed on it cannot say which one. `theorem` is the `native_id`. */
  test("names the failing conjecture by an identifier that is unique", async () => {
    const fixture = await formalFixture();
    const document = JSON.parse(await readFile(fixture.published, "utf8"));
    expect(document.conjectures[0].module).toBe(document.conjectures[1].module);
    document.conjectures[1].subjects = [{ code: "11" }];
    const path = await json(join(fixtureRoot, "subject-which-record.json"), document);
    await expect(acquireFormalConjectures({
      repository: fixture.repository,
      revision: fixture.commit,
      publishedDataset: path,
    })).rejects.toThrow("published conjecture Books.one_variant.subjects[0]");
  });

  test("does not mix supplied and newly generated extractor datasets", async () => {
    await expect(acquireFormalConjectures({
      repository: "https://example.invalid/formal-conjectures.git",
      revision: "main",
      publishedDataset: "https://example.invalid/conjectures.json",
      extractedDataset: "/tmp/extract_names.json",
      runExtractor: true,
    })).rejects.toThrow("choose either");
  });

  /* The published dataset is a Pages artifact tracked at no ref. Naming `main`
     as its revision is the one answer that is reliably wrong, because Pages
     lags pushes; the deployment API names the commit whose build is actually
     being served, and that is the revision both retained halves are taken at.
     The re-pin script composes these two calls. */
  test("reads the served revision from the Pages deployment API", async () => {
    const fixture = await formalFixture();
    await using server = Bun.serve({
      port: 0,
      fetch: () => Response.json([{ environment: "github-pages", sha: fixture.commit }]),
    });
    const served = await resolvePagesDeploymentCommit(server.url.href);
    expect(served).toBe(fixture.commit);

    const acquired = await acquireFormalConjectures({
      repository: fixture.repository,
      revision: served,
      publishedDataset: fixture.published,
      extractedDataset: fixture.extracted,
    });
    expect(acquired.revision).toMatchObject({
      kind: "git",
      git_commit: fixture.commit,
    });
  });

  /* An unpinned revision must not be checked against last release's expected
     bytes, and the pinned one must not be acquirable without them. */
  test("holds the pinned release to its declared tree and roots", async () => {
    const fixture = await formalFixture();
    await expect(acquireFormalConjectures({
      repository: fixture.repository,
      revision: fixture.commit,
      expectedTree: "0".repeat(40),
      publishedDataset: fixture.published,
      extractedDataset: fixture.extracted,
    })).rejects.toThrow("does not match pinned tree");

    await expect(acquireFormalConjectures({
      repository: fixture.repository,
      revision: fixture.commit,
      publishedDataset: fixture.published,
      extractedDataset: fixture.extracted,
      expectedPublishedRoot: `sha256:${"0".repeat(64)}`,
    })).rejects.toThrow("published dataset root");

    await expect(acquireFormalConjectures({
      repository: fixture.repository,
      revision: fixture.commit,
      publishedDataset: fixture.published,
      extractedDataset: fixture.extracted,
      expectedExtractedRoot: `sha256:${"0".repeat(64)}`,
    })).rejects.toThrow("extract_names dataset root");
  });

  /* The retained bytes are the acquisition, so a release whose declared roots
     do not describe the files beside it is a release that cannot be acquired at
     all. This is the check that a re-pin left half-done fails against. */
  test("retains both halves of the pinned release at their declared roots", async () => {
    for (
      const [dataset, expected] of [
        [formalConjecturesRelease.published_dataset, formalConjecturesRelease.published_root],
        [formalConjecturesRelease.extracted_dataset, formalConjecturesRelease.extracted_root],
      ] as const
    ) {
      expect(sha256(new Uint8Array(await readFile(dataset)))).toBe(expected);
    }
    const document = JSON.parse(
      await readFile(formalConjecturesRelease.extracted_dataset, "utf8"),
    );
    const published = JSON.parse(
      await readFile(formalConjecturesRelease.published_dataset, "utf8"),
    );
    expect(document.problems.length).toBe(published.conjectures.length);
    expect(
      document.problems.filter(({ statement }: { statement?: string }) => statement).length,
    ).toBe(document.problems.length);
  });

  test("refuses a deployment that names no exact commit", async () => {
    await using empty = Bun.serve({ port: 0, fetch: () => Response.json([]) });
    await expect(resolvePagesDeploymentCommit(empty.url.href))
      .rejects.toThrow("no github-pages deployment");

    await using abbreviated = Bun.serve({
      port: 0,
      fetch: () => Response.json([{ sha: "304b9d6" }]),
    });
    await expect(resolvePagesDeploymentCommit(abbreviated.url.href))
      .rejects.toThrow("does not name an exact commit");

    await using unavailable = Bun.serve({
      port: 0,
      fetch: () => new Response("nope", { status: 503 }),
    });
    await expect(resolvePagesDeploymentCommit(unavailable.url.href))
      .rejects.toThrow("deployment lookup failed (503)");
  });

  /* Every field the projection was missing comes from the extracted half, so a
     regression that drops it looks exactly like the defect this replaced: 3,551
     rows, complete by count, empty of everything that made them worth reading. */
  test("carries the extracted statement and docstring into normalized rows", async () => {
    const fixture = await formalFixture();
    const acquired = await acquireFormalConjectures({
      repository: fixture.repository,
      revision: fixture.commit,
      publishedDataset: fixture.published,
      extractedDataset: fixture.extracted,
    });
    const one = acquired.records.find(({ native_id }) => native_id === "Books.one");
    expect(one?.metadata).toMatchObject({
      formal_statement: "True",
      docstring: "The first exact statement.",
    });
    expect(acquired.records.every(({ metadata }) => (
      typeof metadata.formal_statement === "string"
      && metadata.formal_statement !== ""
    ))).toBe(true);
    expect(
      acquired.loss.map(({ code }) => code),
    ).not.toContain("formal_statement_not_published");
  });

  test("discloses the absent statements when no extractor output is supplied", async () => {
    const fixture = await formalFixture();
    const acquired = await acquireFormalConjectures({
      repository: fixture.repository,
      revision: fixture.commit,
      publishedDataset: fixture.published,
    });
    expect(acquired.records.every(({ metadata }) => (
      metadata.formal_statement === null && metadata.docstring === null
    ))).toBe(true);
    expect(
      acquired.loss.map(({ code }) => code),
    ).toContain("formal_statement_not_published");
  });
});

describe("OpenAI ten-proofs source adapter", () => {
  test("emits all twelve exact Comparator profiles without inferring verification", async () => {
    const fixture = await openAiTenProofsFixture();
    const acquired = await acquireOpenAiTenProofs({
      repository: fixture.repository,
      publicRepository: fixture.publicRepository,
      revision: fixture.commit,
      expectedTree: fixture.tree,
      expectedRoots: fixture.exactRoots,
    });
    expect(acquired.source_id).toBe("source:openai-ten-proofs");
    expect(acquired.revision).toMatchObject({
      kind: "git",
      git_commit: fixture.commit,
      git_tree: fixture.tree,
    });
    expect(acquired.coverage).toEqual({
      status: "complete",
      scope: "All twelve Comparator profiles declared by formalization.yaml at the exact pinned OpenAI ten-proofs commit and tree.",
      native_record_count: 12,
      emitted_record_count: 12,
      omitted_record_count: 0,
    });
    expect(acquired.records).toHaveLength(12);
    expect(acquired.records.every(({ native_kind }) => (
      native_kind === "comparator_profile"
    ))).toBe(true);
    expect(acquired.records[0]).toMatchObject({
      metadata: {
        permitted_axioms: ["propext", "Classical.choice", "Quot.sound"],
        source_declared_review_status: "agent-reviewed",
        /* A path and a root each, spread rather than nested. */
        comparator_config_root: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        challenge_root: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        solution_root: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        lean_toolchain: "leanprover/lean4:v4.32.0",
        lake_manifest_root: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        formalization_manifest_root: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        /* The Lake manifest's dependencies, as four aligned lists. */
        dependency_names: ["mathlib"],
        dependency_input_revisions: ["v4.32.0"],
        dependency_commits: ["1".repeat(40)],
      },
    });
    expect(acquired.loss.map(({ code }) => code)).toEqual([
      "profile_not_reproduction",
      "formalization_not_fidelity",
      "publisher_review_is_attributed",
    ]);
  });

  test("fails closed on tree or manifest drift", async () => {
    const fixture = await openAiTenProofsFixture();
    await expect(acquireOpenAiTenProofs({
      repository: fixture.repository,
      publicRepository: fixture.publicRepository,
      revision: fixture.commit,
      expectedTree: "0".repeat(40),
      expectedRoots: fixture.exactRoots,
    })).rejects.toThrow("does not match pinned tree");
    await expect(acquireOpenAiTenProofs({
      repository: fixture.repository,
      publicRepository: fixture.publicRepository,
      revision: fixture.commit,
      expectedTree: fixture.tree,
      expectedRoots: {
        lean_toolchain: `sha256:${"0".repeat(64)}`,
      },
    })).rejects.toThrow("lean-toolchain root");
  });

  /* The five pinned roots used to fall back to `{}` for any revision that was
     not the pinned release, and `exactFile` skips its comparison when a root is
     undefined — so pointing the adapter at another commit acquired five files
     with no verification at all and said nothing. Physlib had the same fallback
     and it is how its lock and its constants drifted four commits apart without
     a single failure; this closes the second one before it does the same. */
  test("refuses an unpinned revision that declares no expected roots", async () => {
    const fixture = await openAiTenProofsFixture();
    await expect(acquireOpenAiTenProofs({
      repository: fixture.repository,
      publicRepository: fixture.publicRepository,
      revision: fixture.commit,
      expectedTree: fixture.tree,
    })).rejects.toThrow("supplies no expected roots and is not the pinned release");
  });
});

describe("Physlib source adapter", () => {
  test("projects exact native API-map requirements without importing status as Standing", async () => {
    const fixture = await physlibFixture();
    const acquired = await acquirePhyslib({
      repository: fixture.repository,
      publicRepository: fixture.publicRepository,
      revision: fixture.commit,
      expectedTree: fixture.tree,
      expectedRoots: fixture.exactRoots,
    });
    expect(acquired.source_id).toBe("source:physlib");
    expect(acquired.coverage).toEqual({
      status: "complete",
      scope: "Every requirement in all 1 Physlib/API-map.yaml files at the exact pinned commit and tree.",
      native_record_count: 2,
      emitted_record_count: 2,
      omitted_record_count: 0,
    });
    expect(acquired.records).toHaveLength(2);
    expect(acquired.records.map(({ native_kind }) => native_kind)).toEqual([
      "api_requirement",
      "api_requirement",
    ]);
    expect(acquired.records[0]).toMatchObject({
      native_id: "api-map:Physlib/Mechanics/Fixture/API-map.yaml#requirement:1",
      metadata: {
        api_title: "Fixture mechanics",
        source_declared_done: true,
        source_declared_location: "Physlib/Mechanics/Fixture/Basic.lean (Fixture.value)",
        /* Two aligned lists of scalars, not a list of `{path, content_root}`.
           Index i of each is one declared file, in declaration order. */
        declared_source_file_paths: ["Physlib/Mechanics/Fixture/Basic.lean"],
        declared_source_file_roots: [expect.stringMatching(/^sha256:[0-9a-f]{64}$/u)],
        /* The policy and environment leaves, spread rather than nested under
           `policy_state` and `exact_environment`. */
        ai_policy_root: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        review_guidelines_root: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        lean_toolchain: "leanprover/lean4:v4.32.0",
        lake_manifest_root: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
      },
    });
    expect(acquired.records[1].metadata).toMatchObject({
      source_declared_done: false,
      source_declared_location: "N/A",
      declared_source_file_paths: [],
      declared_source_file_roots: [],
    });
    expect(acquired.loss.map(({ code }) => code)).toContain("done_is_source_attribution");
  });

  test("fails closed on tree drift and contradictory requirement status", async () => {
    const fixture = await physlibFixture();
    await expect(acquirePhyslib({
      repository: fixture.repository,
      publicRepository: fixture.publicRepository,
      revision: fixture.commit,
      expectedTree: "0".repeat(40),
      expectedRoots: fixture.exactRoots,
    })).rejects.toThrow("does not match pinned tree");

    await writeFile(
      join(fixture.repository, "Physlib", "Mechanics", "Fixture", "API-map.yaml"),
      `version: v0.1
Title: Fixture mechanics
Overview: Contradictory fixture.
ParentAPIs: []
References: []
Requirements:
  - description: "The source claims this is done without a location."
    done: true
    location: "N/A"
`,
    );
    git(fixture.repository, ["add", "."]);
    git(fixture.repository, ["commit", "-q", "-m", "contradictory map"]);
    const revision = git(fixture.repository, ["rev-parse", "HEAD"]);
    const tree = git(fixture.repository, ["rev-parse", "HEAD^{tree}"]);
    await expect(acquirePhyslib({
      repository: fixture.repository,
      publicRepository: fixture.publicRepository,
      revision,
      expectedTree: tree,
      expectedRoots: fixture.exactRoots,
    })).rejects.toThrow("implemented requirements need a source location");
  });

  /* The eight pinned roots used to fall back to `{}` for any revision that was
     not the pinned release, and `exactFile` skips its comparison when a root is
     undefined — so pointing the adapter at another commit acquired eight files
     with no verification at all and said nothing. That is how two copies of
     the acquisition pin drifted four commits apart without a failure. */
  test("refuses an unpinned revision that declares no expected roots", async () => {
    const fixture = await physlibFixture();
    await expect(acquirePhyslib({
      repository: fixture.repository,
      publicRepository: fixture.publicRepository,
      revision: fixture.commit,
      expectedTree: fixture.tree,
    })).rejects.toThrow("supplies no expected roots and is not the pinned release");
  });

});

describe("retained local-file adapters", () => {
  test("does not expose the historical PLBY reconciliation as an active adapter", () => {
    expect(localSnapshotAdapters).not.toHaveProperty("plby");
  });

  const fixtures: Record<LocalSnapshotAdapterName, unknown> = {
    "erdos-ai-wiki": {
      wiki_commit: "fixture-revision",
      summary: { problems: 1, entries: 2 },
      problems: {
        "7": [
          {
            section: "1(d)",
            section_name: "AI collaborating with humans",
            outcome: { color: "green", label: "Correct proof found" },
          },
          {
            section: "2(b)",
            section_name: "Independent mathematical work",
            outcome: { color: "white", label: "No classification" },
          },
        ],
      },
    },
    "gpt-erdos": {
      commit: "fixture-revision",
      summary: { problems: 1 },
      problems: {
        "78": {
          category: "hidden_constraints",
          category_label: "Solved as stated, hidden constraints",
        },
      },
    },
  };

  for (const adapter of Object.keys(fixtures) as LocalSnapshotAdapterName[]) {
    test(`${adapter} emits every retained structured record deterministically`, async () => {
      const input = await json(
        join(fixtureRoot, `${adapter}.json`),
        fixtures[adapter],
      );
      const first = await acquireLocalSnapshot({
        adapter,
        input,
        revision: "fixture-revision",
      });
      const second = await acquireLocalSnapshot({
        adapter,
        input,
        revision: "fixture-revision",
      });
      expect(first).toEqual(second);
      expect(first.coverage.status).toBe("complete");
      expect(first.coverage.emitted_record_count).toBe(first.records.length);
      expect(first.coverage.omitted_record_count).toBe(0);
      expect(first.omissions.length).toBeGreaterThan(0);
      expect(first.loss.length).toBeGreaterThan(0);
    });
  }
});

describe("pinned external source adapters", () => {
  test("binds all proof manifests to their exact Git commit, path, and byte root", async () => {
    for (const kind of ["jayyhk", "plby", "williamjblair"] as const) {
      const fixture = await proofManifestFixture(kind);
      const acquired = await acquirePinnedProofManifest({
        kind,
        revision: fixture.commit,
        ...fixture,
        expectedManifestRoot: fixture.manifestRoot,
      });
      expect(acquired.revision).toMatchObject({
        kind: "git",
        git_commit: fixture.commit,
      });
      expect(acquired.coverage).toMatchObject({
        status: "complete",
        native_record_count: 1,
        emitted_record_count: 1,
        omitted_record_count: 0,
      });
      expect(acquired.records[0].metadata.problem_number).toBe(
        kind === "williamjblair" ? 154 : 16,
      );
      if (kind === "plby") {
        expect(acquired.records[0]).toMatchObject({
          native_id: "ErdosProblems.Erdos16",
          metadata: {
            author: {
              informal: { human: "Yong-Gao Chen" },
              formal: {
                AI: ["Gemini 3.1 Pro", "Antigravity"],
                human: "Daniel Chin",
              },
            },
            url: [
              "https://github.com/danielchin/proofs/blob/main/Proofs/ErdosProblems/Erdos16.lean",
              "https://www.erdosproblems.com/forum/thread/16#post-4464",
            ],
            version: ["4.24.0", "4.28.0"],
            conditional: ["imported_result_one", "imported_result_two"],
            partial: "yes",
          },
        });
        expect(acquired.loss).toContainEqual({
          code: "source_labels_remain_attributed",
          description: "PLBY author, version, partial, and conditional labels remain attributed source metadata; they are neither Vela Verification nor Standing.",
        });
      }
    }
  });

  test("fails closed when a proof-manifest acquisition root is wrong", async () => {
    const fixture = await proofManifestFixture("plby");
    await expect(acquirePinnedProofManifest({
      kind: "plby",
      revision: fixture.commit,
      ...fixture,
      expectedManifestRoot: `sha256:${"0".repeat(64)}`,
    })).rejects.toThrow("does not match acquisition root");
  });

  exactPlbyTest("reproduces the exact locked PLBY manifest deterministically", async () => {
    const plby = projectionSourceAcquisition.sources.plby;
    expect(plby).toMatchObject({
      repository: "plby/lean-proofs",
      path: "data/sources.yaml",
    });
    expect(plby.revision).toMatch(/^[0-9a-f]{40}$/u);
    expect(plby.root).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(plby.locator).toContain(plby.path);
    const options = {
      kind: "plby" as const,
      repository: `https://github.com/${plby.repository}.git`,
      revision: plby.revision,
      manifestPath: plby.path,
      expectedManifestRoot: plby.root,
      logicalManifestLocator: plby.locator,
    };
    const first = await acquirePinnedProofManifest(options);
    const second = await acquirePinnedProofManifest(options);
    expect(second).toEqual(first);
    const firstBundle = await writeSourceAdapterBundle(
      join(fixtureRoot, "exact-plby-first"),
      first,
    );
    const secondBundle = await writeSourceAdapterBundle(
      join(fixtureRoot, "exact-plby-second"),
      second,
    );
    expect(secondBundle).toEqual(firstBundle);
    /* The bundle is a function of upstream bytes, so its roots were never a
       stable literal — they held still only while the lock was frozen. What the
       test can assert is that the bundle is bound to the revision the LOCK
       names, that it carries records, and that its roots are well formed. The
       binding to the locked content root is enforced upstream of here:
       `expectedManifestRoot` above makes acquisition throw when the fetched
       manifest disagrees with the lock. */
    expect(firstBundle).toMatchObject({
      revision: { kind: "git", value: plby.revision },
    });
    expect(firstBundle.revision.git_tree).toMatch(/^[0-9a-f]{40}$/u);
    expect(firstBundle.output.record_count).toBeGreaterThan(0);
    expect(firstBundle.output.records_root).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(firstBundle.bundle_root).toMatch(/^sha256:[0-9a-f]{64}$/u);
    /* Two acquisitions, because determinism is the assertion — and each one is
       a blobless clone of plby/lean-proofs followed by a detached checkout that
       lazily fetches every blob in the tree. Measured here: 11.8s and 112MB for
       one, so the 30s this used to carry was about 1.2x the work and reddened
       the suite for a slow morning rather than for anything about the manifest.
       Three separate reviews have had to explain that away. The budget is now
       roughly five times the measured cost; it bounds a hang, it is not part of
       what the test claims, and the job it runs in allows 35 minutes. */
  }, 180_000);

  test("projects one exact OEIS sequence row without mirroring narrative fields", async () => {
    const dataset = await oeisFixture();
    const acquired = await acquireOeisA309370({ dataset });
    expect(acquired.coverage).toMatchObject({
      status: "complete",
      native_record_count: 1,
      emitted_record_count: 1,
      omitted_record_count: 0,
    });
    expect(acquired.records[0]).toMatchObject({
      native_id: "oeis:A309370",
      metadata: {
        number: 309370,
        data: "1,2,3,5,7,12,15",
      },
    });
    expect(acquired.records[0].metadata).not.toHaveProperty("comment");
  });
});

describe("VibeMathed source adapter", () => {
  test("retains the statement prose its licence permits, and attributes it", async () => {
    const acquired = await acquireVibemathed({
      dataset: await vibemathedFixture(),
    });
    expect(acquired.coverage).toMatchObject({
      status: "complete",
      native_record_count: 2,
      emitted_record_count: 2,
      omitted_record_count: 0,
    });
    const [stated, unstated] = acquired.records;
    /* The whole point of the CC BY 4.0 declaration. `source:erdos-problems`
       discloses `statement_prose_not_observed` and carries a locator instead;
       this source carries the prose, and the locators still reach back to it so
       the attribution the licence requires travels with the record. */
    expect(stated).toMatchObject({
      native_id: "vibemathed:erdos-180",
      native_kind: "attributed_activity",
      summary: "A bounded attributed statement, retained under CC BY 4.0.",
      metadata: {
        statement: "A bounded attributed statement, retained under CC BY 4.0.",
        ai_contribution: "ai-discovered",
        verification: "unreviewed",
        significance: 42,
      },
    });
    /* The entry page first, then the cited evidence. Deduplicated, because
       `sourceUrl` is usually repeated in `links`. */
    expect(stated.locators).toEqual([
      "https://vibemathed.com/problem/erdos-180",
      "https://example.test/preprint",
      "https://example.test/lean",
    ]);
    // An absent statement summarises as null, never as an empty string.
    expect(unstated).toMatchObject({
      native_id: "vibemathed:a-problem-with-no-statement",
      summary: null,
    });
  });

  test("keeps mutable community state out of every record", async () => {
    const acquired = await acquireVibemathed({
      dataset: await vibemathedFixture(),
    });
    for (const record of acquired.records) {
      for (const field of [
        "upvotes",
        "downvotes",
        "commentCount",
        "comment_count",
        "submittedBy",
        "submitted_by",
      ]) {
        expect(record.metadata).not.toHaveProperty(field);
      }
    }
  });

  /* The defect this source is most likely to introduce, asserted directly. The
     endpoint re-renders its envelope on a cache cycle, so a revision rooted on
     the retrieved bytes would republish an identical catalogue several times an
     hour, and every downstream root would move with it. */
  test("observes the same revision when only the envelope stamp moves", async () => {
    const first = await acquireVibemathed({
      dataset: await vibemathedFixture(),
    });
    const second = await acquireVibemathed({
      dataset: await vibemathedFixture(
        vibemathedDocument("2026-08-07T20:07:38.320Z"),
      ),
    });
    expect(second.revision).toEqual(first.revision);
    expect(second.records.map(({ record_root }) => record_root)).toEqual(
      first.records.map(({ record_root }) => record_root),
    );
    // The retrieval itself still differs, and is still recorded as an input.
    expect(second.inputs[0].content_root).not.toBe(first.inputs[0].content_root);
    expect(first.revision.git_commit).toBeNull();
    expect(first.revision.git_tree).toBeNull();
  });

  test("fails closed when the catalogue is truncated or relicensed", async () => {
    await expect(acquireVibemathed({
      dataset: await vibemathedFixture({
        ...vibemathedDocument("2026-08-07T20:02:14.079Z"),
        count: 3,
      }),
    })).rejects.toThrow("states 3 entries and serves 2");

    await expect(acquireVibemathed({
      dataset: await vibemathedFixture({
        ...vibemathedDocument("2026-08-07T20:02:14.079Z"),
        license: "All rights reserved",
      }),
    })).rejects.toThrow("not the CC BY 4.0 this source is declared under");
  });
});

describe("offline bundle verification", () => {
  test("detects a modified NDJSON chunk without network access", async () => {
    const input = await json(join(fixtureRoot, "tamper-source.json"), {
      summary: { problems: 1 },
      problems: {
        "78": {
          category: "hidden_constraints",
          category_label: "Hidden constraints",
        },
      },
    });
    const acquired = await acquireLocalSnapshot({
      adapter: "gpt-erdos",
      input,
      revision: "fixture-revision",
    });
    const output = join(fixtureRoot, "tamper-output");
    const bundle = await writeSourceAdapterBundle(output, acquired);
    await writeFile(
      join(output, bundle.output.chunks[0].path),
      `${JSON.stringify({ tampered: true })}\n`,
    );
    await expect(verifySourceAdapterBundle(output)).rejects.toThrow(
      "byte length does not match manifest",
    );
  });

  test("feeds immutable observations and native rows without creating release bindings", async () => {
    const input = await json(join(fixtureRoot, "materialize-source.json"), {
      commit: "fixture-revision",
      summary: { problems: 1 },
      problems: {
        "78": {
          category: "hidden_constraints",
          category_label: "Hidden constraints",
        },
      },
    });
    const acquired = await acquireLocalSnapshot({
      adapter: "gpt-erdos",
      input,
      revision: "fixture-revision",
    });
    const output = join(fixtureRoot, "materialize-output");
    await writeSourceAdapterBundle(output, acquired);
    const verified = await verifySourceAdapterBundle(output);
    const materialized = materializeVerifiedSourceAdapterBundle(
      verified.bundle,
      verified.records,
      "2026-07-30T12:00:00Z",
    );
    expect(materialized.observation).toMatchObject({
      source_id: "source:gpt-erdos",
      acquisition_root: verified.bundle.bundle_root,
      projected_record_count: 1,
    });
    expect(verified.bundle).toMatchObject({
      schema: "vela.source-adapter-bundle.v2",
      declaration_root: mathSourceRegistry.sources.find(
        ({ source_id }) => source_id === "source:gpt-erdos",
      )?.declaration_root,
      acquisition_mode: "retained_snapshot",
    });
    expect(materialized.native_records).toHaveLength(1);
    expect(materialized.native_records[0]).not.toHaveProperty("release_root");
    expect(materialized.native_records[0].metadata).toMatchObject({
      problem_number: 78,
      category: "hidden_constraints",
    });

    const { bundle_root: _root, ...bundleBody } = verified.bundle;
    const wrongMode = createSourceAdapterBundle({
      ...bundleBody,
      acquisition_mode: "exact_git_checkout",
    });
    expect(() => materializeVerifiedSourceAdapterBundle(
      wrongMode,
      verified.records,
      "2026-07-30T12:00:00Z",
    )).toThrow("source-adapter identity does not match its checked declaration");
  });
});

describe("projection refresh source-adapter set", () => {
  test("fails closed when a retained acquisition snapshot drifts", async () => {
    await expect(acquireProjectionSourceAdapters({
      outputDirectory: join(fixtureRoot, "drifted-acquisition-snapshot"),
      sourceAcquisition: {
        ...projectionSourceAcquisition,
        sources: {
          ...projectionSourceAcquisition.sources,
          wiki: {
            ...projectionSourceAcquisition.sources.wiki,
            snapshot_root: `sha256:${"0".repeat(64)}`,
          },
        },
      },
    })).rejects.toThrow(
      "wiki: retained snapshot bytes do not match acquisition root",
    );
  });

  test("derives required adapter coverage from the checked registry", () => {
    const expected = mathSourceRegistry.sources
      .filter(requiresProjectionSourceAdapter)
      .map(({ source_id }) => source_id)
      .sort();
    expect(projectionSourceAdapterIds).toEqual(expected);
    expect(projectionSourceAdapterIds).toContain("source:jayyhk-erdos-lean");
    expect(projectionSourceAdapterIds).toContain(
      "source:williamjblair-lean-proofs",
    );
    expect(projectionSourceAdapterIds).toContain("source:oeis-a309370");
    expect(projectionSourceAdapterIds).not.toContain(
      "source:codetables-stabilizer",
    );
    /* Declared, pinned by the Erdős lock at a commit, and deliberately without
       an adapter: the Repository retains no AlphaProof bytes and the registry
       says `reference_only`, so there is nothing for an adapter to re-derive. */
    expect(projectionSourceAdapterIds).not.toContain(
      "source:alphaproof-nexus-results",
    );
    expect(projectionSourceAdapterIds).not.toContain(
      "source:formal-conjectures-pr-audit",
    );
  });

  test("acquires and re-verifies the complete exact set before projection", async () => {
    const openAi = await openAiTenProofsFixture();
    const physlib = await physlibFixture();
    const formal = await formalFixture();
    const plby = await proofManifestFixture("plby");
    const jayyhk = await proofManifestFixture("jayyhk");
    const william = await proofManifestFixture("williamjblair");
    const oeis = await oeisFixture();
    const vibemathed = await vibemathedFixture();
    const erdosRegistry = await erdosProblemsFixture();
    const snapshotDirectory = join(fixtureRoot, "projection-set-snapshots");
    const wikiRevision = "1".repeat(40);
    const gptRevision = "2".repeat(40);
    const wikiPath = await json(join(snapshotDirectory, "wiki.json"), {
      wiki_commit: wikiRevision,
      summary: { problems: 1, entries: 1 },
      problems: {
        "1": [{
          section: "1(a)",
          section_name: "Fixture activity",
          outcome: { color: "white", label: "Recorded" },
        }],
      },
    });
    const gptPath = await json(join(snapshotDirectory, "gpt.json"), {
      commit: gptRevision,
      summary: { problems: 1 },
      problems: {
        "1": {
          category: "open",
          category_label: "Open",
        },
      },
    });
    const sourceAcquisition = {
      schema: "vela.projection-source-acquisition.v1" as const,
      authority_effect: "none" as const,
      sources: {
        erdos: {
          repository: erdosRegistry.repository,
          revision: erdosRegistry.commit,
          path: erdosRegistry.dataPath,
          root: erdosRegistry.dataRoot,
          locator: erdosRegistry.logicalLocator,
        },
        openai_ten_proofs: {
          revision: openAi.commit,
          tree: openAi.tree,
        },
        plby: {
          repository: plby.repository,
          revision: plby.commit,
          path: plby.manifestPath,
          root: plby.manifestRoot,
          locator: plby.logicalManifestLocator,
        },
        jayyhk: {
          repository: jayyhk.repository,
          revision: jayyhk.commit,
          path: jayyhk.manifestPath,
          root: jayyhk.manifestRoot,
          locator: jayyhk.logicalManifestLocator,
        },
        williamjblair_lean_proofs: {
          repository: william.repository,
          revision: william.commit,
          path: william.manifestPath,
          root: william.manifestRoot,
          locator: william.logicalManifestLocator,
        },
        wiki: {
          revision: wikiRevision,
          snapshot_path: "wiki.json",
          snapshot_root: sha256(await readFile(wikiPath)),
        },
        gpt_erdos: {
          revision: gptRevision,
          snapshot_path: "gpt.json",
          snapshot_root: sha256(await readFile(gptPath)),
        },
      },
    };

    const output = join(fixtureRoot, "projection-source-set");
    const prepared = await acquireProjectionSourceAdapters({
      outputDirectory: output,
      sourceAcquisition,
      sourceSnapshotDirectory: snapshotDirectory,
      formalRepository: formal.repository,
      formalRevision: formal.commit,
      formalPublishedDataset: formal.published,
      formalExtractedDataset: formal.extracted,
      openAiTenProofsRepository: openAi.repository,
      openAiTenProofsPublicRepository: openAi.publicRepository,
      openAiTenProofsRevision: openAi.commit,
      openAiTenProofsTree: openAi.tree,
      openAiTenProofsExpectedRoots: openAi.exactRoots,
      physlibRepository: physlib.repository,
      physlibPublicRepository: physlib.publicRepository,
      physlibRevision: physlib.commit,
      physlibTree: physlib.tree,
      physlibExpectedRoots: physlib.exactRoots,
      oeisDataset: oeis,
      vibemathedDataset: vibemathed,
      chunkRecordLimit: 2,
    });
    expect(prepared.manifest.sources).toHaveLength(
      projectionSourceAdapterIds.length,
    );
    expect(prepared.bundles.get("source:formal-conjectures")?.records).toHaveLength(3);
    expect(prepared.bundles.get("source:openai-ten-proofs")?.records).toHaveLength(12);
    expect(prepared.bundles.get("source:physlib")?.records).toHaveLength(2);

    /* An object nested under a metadata key is unreadable in SQL, and no new
     * one may appear.
     *
     * `nativeSourceRecordSchema.metadata` is `z.record(string, jsonValue)`, so
     * the schema permits it — but `scalar()` in `source-adapters/projection.ts`
     * canonical-JSONs every non-primitive on its way into the projection, and a
     * nested object lands as the *text* of its own JSON.
     * `metadata -> 'x' ->> 'y'` then reads NULL, silently, on every row.
     *
     * It has happened twice for the same reason. `status` on all 1,217 Erdős
     * problems, and `formal_proof` on all 3,551 Formal Conjectures records —
     * the second written a day after the first was fixed, because the fix was a
     * rewrite of one adapter and not a rule. This is the rule. Flatten to
     * `<field>_<leaf>`, as `flatDeclaredStates` in `erdos-problems.ts` does.
     *
     * A list of STRINGS is not the same case and is allowed. `jsonArraySql`
     * reparses the text `scalar()` wrote and hands back the values, which is
     * how `tags`, `oeis`, `subsets`, `answer_kinds` and nine others are read;
     * measured against the activated release, `FC100OpenSet1` selects 100
     * records through it.
     *
     * A list of OBJECTS is the same case, and this test said otherwise until
     * now. Its first version exempted every array, and the comment here claimed
     * `subjects` was readable through `jsonArraySql` — it is not.
     * `jsonb_array_elements_text` on a list of objects returns each object's
     * JSON as a string, so the obvious query does not fail loudly, it silently
     * returns rubbish. Measured against the release that exemption let ship,
     * `subjects` on 3,551 records and `declared_source_files` on 232. A
     * human-readable line disagreeing with the code beneath it is the defect
     * this whole session kept finding, and this one was mine.
     *
     * KNOWN is down to the two this repository did not compose, and the
     * distinction is the whole of why they are still here. Everything this
     * repository built itself has been flattened — `subjects`,
     * `declared_source_files`, both `exact_environment`s, `exact_files` and
     * `policy_state` — because the shape was ours to choose and choosing an
     * unreadable one was simply a mistake. `erdos-ai-contributions-wiki`'s
     * `outcome` and `plby-lean-proofs`' `author` are shapes a publisher chose,
     * and flattening those means this adapter arbitrating someone else's
     * structure — a decision worth taking deliberately, with the leaf set
     * measured, rather than in a sweep. Deleting a line here is how one gets
     * fixed. */
    const KNOWN = [
      "source:erdos-ai-contributions-wiki.metadata.outcome",
      "source:plby-lean-proofs.metadata.author",
    ];
    const unreadable = (value: unknown): boolean => {
      if (typeof value !== "object" || value === null) return false;
      if (!Array.isArray(value)) return true;
      return value.some((entry) => typeof entry === "object" && entry !== null);
    };
    const nested = [...prepared.bundles.entries()].flatMap(([source, { records }]) => records
      .flatMap((record) => Object.entries(record.metadata ?? {})
        .filter(([, value]) => unreadable(value))
        .map(([key]) => `${source}.metadata.${key}`)));
    expect([...new Set(nested)].sort()).toEqual(KNOWN);
    expect(
      prepared.bundles.get("source:plby-lean-proofs")?.bundle.revision.value,
    ).toBe(plby.commit);
    const loaded = await loadProjectionSourceAdapterSet(
      join(output, "source-adapters.json"),
    );
    expect(loaded.manifest.set_root).toBe(prepared.manifest.set_root);
    expect([...loaded.bundles.keys()].sort()).toEqual([
      "source:erdos-ai-contributions-wiki",
      "source:erdos-problems",
      "source:formal-conjectures",
      "source:gpt-erdos",
      "source:jayyhk-erdos-lean",
      "source:oeis-a309370",
      "source:openai-ten-proofs",
      "source:physlib",
      "source:plby-lean-proofs",
      "source:vibemathed",
      "source:williamjblair-lean-proofs",
    ]);
    const artifactPath = join(fixtureRoot, "projection-source-set.artifact.json");
    const packed = await writeProjectionSourceAdapterArtifact(
      join(output, "source-adapters.json"),
      artifactPath,
    );
    const reconstructed = await loadProjectionSourceAdapterArtifact(artifactPath);
    expect(reconstructed.artifact.artifact_root).toBe(
      packed.artifact.artifact_root,
    );
    expect(reconstructed.manifest.set_root).toBe(prepared.manifest.set_root);
    expect([...reconstructed.bundles.keys()].sort()).toEqual(
      [...loaded.bundles.keys()].sort(),
    );
  }, 15_000);
});
