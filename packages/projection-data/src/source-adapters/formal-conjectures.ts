import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { canonicalJson, sha256 } from "../canonical";
import {
  acquireBytes,
  acquireExactGitCheckout,
  gitBlobRoot,
  type AcquiredBytes,
} from "./acquisition";
import {
  createSourceAdapterIdentity,
  createSourceNativeRecord,
  type SourceAdapterDisclosure,
  type SourceNativeRecord,
} from "./contracts";
import type { SourceAdapterOutput } from "./bundle";

const execFileAsync = promisify(execFile);

export const formalConjecturesAdapter = createSourceAdapterIdentity(
  "problems-data/formal-conjectures",
  "3.0.0",
);

/**
 * The published dataset is a GitHub Pages build artifact. It is tracked at no
 * ref — `git ls-files` in the upstream repository does not list
 * `data/conjectures.json` — so it cannot be re-fetched at a revision, and
 * hashing what is served today says nothing about which revision produced it.
 *
 * The deployment API does say. It names the commit whose build is live, it is
 * readable without a credential, and it is the only statement upstream makes
 * about the correspondence. Taking both halves at that commit rather than at
 * `main` is what makes this acquisition describe one revision.
 *
 * Both states occur, which is the point. Read at 20:11 on 2026-08-07 the live
 * deployment was 304b9d6d while `main` had already moved to 59f30aa3; nine
 * minutes later Pages redeployed and the two agreed again. Neither is an error
 * condition, so the correspondence cannot be assumed from `main` — it has to be
 * read, and a lock that pairs a digest of the served bytes with whatever `main`
 * resolved to that minute is right or wrong by timing alone.
 */
export const formalConjecturesPagesDeployments =
  "https://api.github.com/repos/google-deepmind/formal-conjectures/deployments"
  + "?environment=github-pages&per_page=1";

function requireExactRoot(
  acquired: AcquiredBytes,
  expected: string | undefined,
  label: string,
): void {
  if (expected !== undefined && acquired.input.content_root !== expected) {
    throw new Error(
      `Formal Conjectures ${label} root ${acquired.input.content_root}`
      + ` does not match the pinned ${expected}`,
    );
  }
}

const retained = (name: string): string => fileURLToPath(
  new URL(`../../config/formal-conjectures/${name}`, import.meta.url),
);

/**
 * The pinned release: one commit, and the exact bytes of both halves as they
 * stood at it.
 *
 * `commit` is not `main`. It is the commit the Pages deployment API named as
 * the one whose build was being served when `conjectures.json` was retained, so
 * the two halves describe one revision by construction rather than by luck.
 * Every root here was computed from bytes held in this repository; the
 * regeneration script that produces them prints them for pasting, and refuses
 * to write a pin it did not observe.
 *
 * Moving the pin is a human act: run
 * `bun packages/projection-data/scripts/extract-formal-conjectures.mjs`, which
 * re-reads the deployment, checks out that commit, builds the conjecture
 * library, extracts, and rewrites both retained files. It takes roughly half an
 * hour and about ten gigabytes of build output, which is the whole reason it is
 * not a step in the daily refresh.
 */
export const formalConjecturesRelease = Object.freeze({
  repository: "https://github.com/google-deepmind/formal-conjectures.git",
  commit: "59f30aa314ba225fcd9268723ce8291616df1ab0",
  tree: "f29ccba1cb8f867f60e4adc07abc530e69750c8e",
  published_dataset: retained("conjectures.json"),
  published_root: "sha256:c0ec2b1ecd8072aa8556bc1f220e0b6cd407ef31a21e7d2cac48b953517e9f58",
  extracted_dataset: retained("extract-names.json"),
  extracted_root: "sha256:65f1b2a7ce28a4b595b547875e5b8b9cf7b376d85a48a2ce0a40947806a91857",
});

export async function resolvePagesDeploymentCommit(
  deploymentsApi: string = formalConjecturesPagesDeployments,
): Promise<string> {
  const response = await fetch(deploymentsApi, {
    redirect: "follow",
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "vela-source-adapter/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub Pages deployment lookup failed (${response.status}) for ${deploymentsApi}`,
    );
  }
  const deployments = await response.json();
  if (!Array.isArray(deployments) || deployments.length === 0) {
    throw new Error(
      "GitHub reports no github-pages deployment for the Formal Conjectures site,"
      + " so the published dataset names no revision at all",
    );
  }
  const commit = (deployments[0] as Record<string, unknown>).sha;
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/u.test(commit)) {
    throw new Error(
      `GitHub Pages deployment does not name an exact commit: ${String(commit)}`,
    );
  }
  return commit;
}

interface PublishedConjecture {
  theorem: string;
  module: string;
  category: string;
  displayTheorem?: string;
  displayModule?: string;
  githubPath: string;
  githubUrl?: string;
  sourceUrl?: string;
  collection?: string;
  collectionUrl?: string | null;
  categoryLabel?: string;
  subjects?: Array<{ code: string; name?: string } | string>;
  hasFormalProof?: boolean;
  formalProofKind?: string | null;
  formalProofLink?: string | null;
}

interface ExtractedConjecture {
  theorem: string;
  module: string;
  category: string;
  subjects?: string[];
  statement?: string;
  docstring?: string | null;
  formalProofKind?: string | null;
  formalProofLink?: string | null;
  hasSorryFreeProof?: boolean;
  subsets?: string[];
  answerKinds?: string[];
  fileFirstAdded?: string | null;
  fileLastModified?: string | null;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function publishedConjectures(bytes: Uint8Array): PublishedConjecture[] {
  const document = object(JSON.parse(Buffer.from(bytes).toString("utf8")), "published dataset");
  if (!Array.isArray(document.conjectures)) {
    throw new Error("published Formal Conjectures dataset lacks conjectures[]");
  }
  return document.conjectures.map((value, index) => {
    const row = object(value, `published conjecture ${index}`);
    return {
      ...row,
      theorem: string(row.theorem, `published conjecture ${index}.theorem`),
      module: string(row.module, `published conjecture ${index}.module`),
      category: string(row.category, `published conjecture ${index}.category`),
      githubPath: string(row.githubPath, `published conjecture ${index}.githubPath`),
    } as PublishedConjecture;
  });
}

function extractedConjectures(
  bytes: Uint8Array | undefined,
): Map<string, ExtractedConjecture> {
  if (bytes === undefined) return new Map();
  const document = object(JSON.parse(Buffer.from(bytes).toString("utf8")), "extract_names dataset");
  if (!Array.isArray(document.problems)) {
    throw new Error("extract_names dataset lacks problems[]");
  }
  const rows = new Map<string, ExtractedConjecture>();
  for (const [index, value] of document.problems.entries()) {
    const row = object(value, `extracted conjecture ${index}`);
    const theorem = string(row.theorem, `extracted conjecture ${index}.theorem`);
    if (rows.has(theorem)) {
      throw new Error(`extract_names dataset repeats theorem ${theorem}`);
    }
    rows.set(theorem, {
      ...row,
      theorem,
      module: string(row.module, `extracted conjecture ${index}.module`),
      category: string(row.category, `extracted conjecture ${index}.category`),
    } as ExtractedConjecture);
  }
  return rows;
}

function exactSiteUrl(sourceUrl: string | undefined): string | null {
  if (!sourceUrl) return null;
  return new URL(sourceUrl, "https://google-deepmind.github.io/formal-conjectures/").href;
}

/**
 * The subject classification, as two aligned lists of strings.
 *
 * Upstream publishes it as a list of `{code, name}` objects, and an array of
 * objects is the one shape `jsonArraySql` cannot rescue. It reparses the text
 * `scalar()` wrote and hands back elements, which for a list of strings is the
 * values and for a list of objects is *their JSON as text* — measured against
 * the activated release, `jsonb_array_elements_text` on `subjects` returns
 * `{"code": "3", "name": "Mathematical logic and foundations"}` as a string. So
 * the obvious query does not fail loudly; it silently hands back rubbish, which
 * is worse.
 *
 * Two aligned lists rather than one list of pairs, and the alignment is what
 * makes it lossless: index `i` of `subject_codes` and index `i` of
 * `subject_names` are the two halves of upstream's `i`th entry, in upstream's
 * order. Measured at this pin: 4,754 entries over 3,551 records, every one an
 * object carrying exactly `code` and `name`, no nulls, 38 distinct codes each
 * mapping to exactly one name, and no record repeating a code. Nothing is
 * dropped and the original list can be rebuilt by zipping.
 *
 * Strict, like `declaredStateSchema`'s catchall next door: the published type
 * admits a bare string and an absent `name`, and neither occurs at this pin, so
 * a pin where one does fails here — in the adapter, naming the field — rather
 * than reaching the projection as something a reader has to guess at.
 *
 * The alignment is this function's to hold and Postgres will not check it. Both
 * lists are appended once per iteration, so their lengths are equal by
 * construction. A reader rejoins them with `unnest(codes, names)`, which is
 * legal only in a FROM clause and pads the shorter side with NULL rather than
 * raising — which is exactly why the invariant has to live here.
 */
function flatSubjects(published: PublishedConjecture): {
  subject_codes: string[];
  subject_names: string[];
} {
  const codes: string[] = [];
  const names: string[] = [];
  for (const [index, subject] of (published.subjects ?? []).entries()) {
    /* `theorem`, not `module`. `module` repeats — 939 distinct over 3,551
       records at this pin, and two conjectures in one Lean file share it — so
       it cannot say which record failed. `theorem` is the `native_id`, and this
       adapter already refuses a repeat of it. */
    const label = `published conjecture ${published.theorem}.subjects[${index}]`;
    if (typeof subject === "string" || typeof subject?.code !== "string" || typeof subject?.name !== "string") {
      throw new Error(
        `${label} must be an object carrying a string code and a string name, received ${JSON.stringify(subject)}`,
      );
    }
    /* The leaf SET, not just the two leaves wanted. Checking only `code` and
       `name` lets a pin that enriches a subject to `{code, name, wikidata}`
       through, and drops `wikidata` with nothing recording that it existed —
       undisclosed loss, which is the failure this whole rule exists to prevent.
       `declaredStateSchema` can afford a catchall because a declared state is
       one object and a new leaf is one new key; a list cannot, because a new
       leaf is a whole new column whose holes need a representation. So the
       honest form of the same rule here is refusal. */
    const leaves = Object.keys(subject).sort();
    if (leaves.length !== 2) {
      throw new Error(
        `${label} carries [${leaves.join(", ")}] and this adapter retains code and name`
        + " — a leaf it does not name would be dropped silently",
      );
    }
    codes.push(subject.code);
    names.push(subject.name);
  }
  return { subject_codes: codes, subject_names: names };
}

function sourceMetadata(
  published: PublishedConjecture,
  extracted: ExtractedConjecture | undefined,
  sourceBlobRoot: string,
): Record<string, unknown> {
  return {
    module: published.module,
    display_module: published.displayModule ?? published.module,
    category: published.category,
    category_label: published.categoryLabel ?? null,
    collection: published.collection ?? null,
    collection_url: published.collectionUrl ?? null,
    ...flatSubjects(published),
    /* Four flat leaves, not one nested object. A native record's metadata is
       flat scalars by contract and `scalar()` in `source-adapters/projection.ts`
       canonical-JSONs anything else on its way in, so a nested `formal_proof`
       would be retained as the *text* of its own JSON and
       `metadata -> 'formal_proof' ->> 'sorry_free'` would read NULL on all
       3,551 records — which is exactly how `status` reached the projection as a
       string and read NULL on all 1,217 Erdős problems. Same shape as
       `flatDeclaredStates` in `erdos-problems.ts`, for the same reason.

       `subsets` and `answer_kinds` below stay lists and are correct as they
       are. They are lists of *strings*, the same shape as `tags` and `oeis`,
       and `jsonArraySql` reads them: measured against the activated release,
       `FC100OpenSet1` selects 100 records and `answer_kinds` partitions 566
       into Prop 425 and non-Prop 141. Thirteen keys across six adapters are
       stored this way; giving these two a different encoding would be a second
       mechanism for the majority case. */
    formal_proof_present: published.hasFormalProof ?? false,
    formal_proof_kind: published.formalProofKind ?? extracted?.formalProofKind ?? null,
    formal_proof_locator: published.formalProofLink ?? extracted?.formalProofLink ?? null,
    formal_proof_sorry_free: extracted?.hasSorryFreeProof ?? null,
    formal_statement: extracted?.statement ?? null,
    docstring: extracted?.docstring ?? null,
    subsets: extracted?.subsets ?? [],
    answer_kinds: extracted?.answerKinds ?? [],
    file_first_added: extracted?.fileFirstAdded ?? null,
    file_last_modified: extracted?.fileLastModified ?? null,
    source_blob_root: sourceBlobRoot,
  };
}

export interface FormalConjecturesAcquisitionOptions {
  repository?: string;
  revision?: string;
  publishedDataset?: string;
  extractedDataset?: string;
  expectedTree?: string;
  expectedPublishedRoot?: string;
  expectedExtractedRoot?: string;
  runExtractor?: boolean;
}

/**
 * `extract_names` reflects over a built environment: it calls `importModules`
 * on every `FormalConjectures.*` module and reads their `.olean` files. So the
 * library has to be built before it runs, and `lake exe extract_names` does not
 * build it — `lake exe` builds the executable and the three modules the script
 * imports, nothing more.
 *
 * That was the whole of this function, and in a fresh detached checkout it does
 * not do what it looks like it does. Measured here: with no olean cache it
 * begins by cloning Mathlib and would go on to compile it from source, and even
 * once the executable exists `importModules` has no conjecture oleans to read,
 * so the dataset it prints is empty. Warm — against a checkout already built —
 * the same command emits 3,032,301 bytes covering 3,551 problems in 126 s, so
 * the failure is silent rather than loud: a small, well-formed JSON document.
 *
 * These are the two steps upstream's own workflow runs before extracting, in
 * the same order, and they are what the missing `problems` were behind.
 */
const officialExtractorBuild: ReadonlyArray<readonly string[]> = [
  ["exe", "cache", "get"],
  ["build"],
];

async function runOfficialExtractor(
  checkoutDirectory: string,
  repository: string,
  commit: string,
): Promise<AcquiredBytes> {
  for (const argv of officialExtractorBuild) {
    await execFileAsync("lake", [...argv], {
      cwd: checkoutDirectory,
      encoding: "buffer",
      maxBuffer: 256 * 1024 * 1024,
    });
  }
  const { stdout } = await execFileAsync(
    "lake",
    ["exe", "extract_names"],
    {
      cwd: checkoutDirectory,
      encoding: "buffer",
      maxBuffer: 256 * 1024 * 1024,
    },
  );
  const bytes = new Uint8Array(stdout);
  /* An unbuilt environment yields `{"problems": []}` and exit 0. Left to reach
     the cross-check below it would surface as "extract_names dataset omits
     published theorem …", naming one theorem out of 3,551 and blaming the
     dataset rather than the build. Refuse here instead, where the reason is. */
  if (extractedConjectures(bytes).size === 0) {
    throw new Error(
      `lake exe extract_names produced no problems in the exact checkout of ${commit};`
      + " the conjecture library was not built, so there were no oleans to reflect over",
    );
  }
  return {
    bytes,
    input: {
      input_id: "extract-names",
      role: "published_dataset",
      locator: `${repository}#${commit}:lake-exe-extract_names`,
      media_type: "application/json",
      byte_length: bytes.byteLength,
      content_root: sha256(bytes),
    },
  };
}

/**
 * Acquires the complete official published collection against a detached exact
 * repository checkout. This runs only in a source refresh job, never in a web
 * request. The optional extract_names output enriches every native row with
 * the exact elaborated statement and docstring from the same checkout.
 *
 * The published half cannot carry a statement at all: upstream generates it
 * with `lake exe extract_names --exclude=statement,docstring,moduleDocstrings`,
 * so `formal_statement` and `docstring` are absent from those bytes by
 * construction, not merely stale. Running the extractor is the only way to
 * obtain them, and the checkout is the only thing either half can be pinned to.
 */
export async function acquireFormalConjectures(
  options: FormalConjecturesAcquisitionOptions,
): Promise<SourceAdapterOutput> {
  if (options.extractedDataset && options.runExtractor) {
    throw new Error("choose either an exact extract_names dataset or --run-extractor");
  }
  const repository = options.repository ?? formalConjecturesRelease.repository;
  const revision = options.revision ?? formalConjecturesRelease.commit;
  /* The pinned roots apply to the pinned release and to nothing else. A caller
     acquiring some other revision — a fixture, or a human moving the pin — is
     asking a different question, and answering it with last release's expected
     bytes would fail for the wrong reason. This is the guard physlib uses. */
  const usesPinnedRelease = repository === formalConjecturesRelease.repository
    && revision === formalConjecturesRelease.commit;
  const publishedDataset = options.publishedDataset
    ?? formalConjecturesRelease.published_dataset;
  const extractedDataset = options.runExtractor
    ? undefined
    : options.extractedDataset
      ?? (usesPinnedRelease ? formalConjecturesRelease.extracted_dataset : undefined);
  const expectedTree = options.expectedTree
    ?? (usesPinnedRelease ? formalConjecturesRelease.tree : undefined);
  const expectedPublishedRoot = options.expectedPublishedRoot
    ?? (usesPinnedRelease && publishedDataset === formalConjecturesRelease.published_dataset
      ? formalConjecturesRelease.published_root
      : undefined);
  const expectedExtractedRoot = options.expectedExtractedRoot
    ?? (usesPinnedRelease && extractedDataset === formalConjecturesRelease.extracted_dataset
      ? formalConjecturesRelease.extracted_root
      : undefined);
  const checkout = await acquireExactGitCheckout(repository, revision);
  try {
    if (expectedTree !== undefined && checkout.tree !== expectedTree) {
      throw new Error(
        `Formal Conjectures tree ${checkout.tree} does not match pinned tree ${expectedTree}`,
      );
    }
    const publishedInput = await acquireBytes(publishedDataset, {
      inputId: "published-dataset",
      role: "published_dataset",
      mediaType: "application/json",
      manifestLocator: "https://google-deepmind.github.io/formal-conjectures/data/conjectures.json",
    });
    requireExactRoot(publishedInput, expectedPublishedRoot, "published dataset");
    const extractedInput = options.runExtractor
      ? await runOfficialExtractor(
        checkout.directory,
        repository,
        checkout.commit,
      )
      : extractedDataset
      ? await acquireBytes(extractedDataset, {
        inputId: "extract-names",
        role: "published_dataset",
        mediaType: "application/json",
        manifestLocator: `${repository}#${checkout.commit}:lake-exe-extract_names`,
      })
      : undefined;
    if (extractedInput) {
      requireExactRoot(extractedInput, expectedExtractedRoot, "extract_names dataset");
    }
    const published = publishedConjectures(publishedInput.bytes);
    const extracted = extractedConjectures(extractedInput?.bytes);
    const publishedIds = new Set<string>();
    const sourceBlobs = new Map<string, Awaited<ReturnType<typeof gitBlobRoot>>>();
    const records: SourceNativeRecord[] = [];
    for (const row of published) {
      if (publishedIds.has(row.theorem)) {
        throw new Error(`published dataset repeats theorem ${row.theorem}`);
      }
      publishedIds.add(row.theorem);
      let sourceBlob = sourceBlobs.get(row.githubPath);
      if (!sourceBlob) {
        sourceBlob = await gitBlobRoot(
          checkout.directory,
          checkout.commit,
          row.githubPath,
        );
        sourceBlobs.set(row.githubPath, sourceBlob);
      }
      const extractedRow = extracted.get(row.theorem);
      if (extractedInput && !extractedRow) {
        throw new Error(`extract_names dataset omits published theorem ${row.theorem}`);
      }
      if (
        extractedRow
        && (
          extractedRow.module !== row.module
          || extractedRow.category !== row.category
        )
      ) {
        throw new Error(`published and extract_names metadata disagree for ${row.theorem}`);
      }
      const siteUrl = exactSiteUrl(row.sourceUrl);
      const locators = [
        `https://github.com/google-deepmind/formal-conjectures/blob/${checkout.commit}/${row.githubPath}`,
        ...(siteUrl ? [siteUrl] : []),
      ];
      const metadata = sourceMetadata(row, extractedRow, sourceBlob.content_root);
      records.push(createSourceNativeRecord({
        schema: "vela.source-native-record.v1",
        source_id: "source:formal-conjectures",
        native_id: row.theorem,
        native_kind: "formal_conjecture",
        native_revision: checkout.commit,
        title: row.displayTheorem ?? row.theorem,
        summary: extractedRow?.statement ?? null,
        source_path: row.githubPath,
        locators,
        metadata,
        content_root: sha256(canonicalJson({
          published: row,
          extracted: extractedRow ?? null,
          source_blob_root: sourceBlob.content_root,
        })),
      }));
    }
    if (extractedInput) {
      const unpublished = [...extracted.keys()].filter((theorem) => !publishedIds.has(theorem));
      if (unpublished.length > 0) {
        throw new Error(
          `extract_names dataset has ${unpublished.length} theorem(s) absent from the published dataset`,
        );
      }
    }
    const loss: SourceAdapterDisclosure[] = [
      {
        code: "source_bytes_not_repackaged",
        description: "Normalized rows bind each exact Lean source blob but do not duplicate the repository bytes.",
      },
      {
        code: "published_dataset_tracked_at_no_ref",
        description: "The official published dataset is a GitHub Pages build artifact tracked at no ref, so it cannot be re-fetched at a revision. The adapter binds its byte root, checks out the commit the Pages deployment API names as the one whose build is served, and proves that every referenced source path exists there.",
      },
      ...(!extractedInput ? [{
        code: "formal_statement_not_published",
        description: "Upstream generates the public site dataset with `--exclude=statement,docstring,moduleDocstrings`, so it carries neither, and no revision of it ever will. Supply exact `lake exe extract_names` output from the selected checkout to retain them in normalized rows.",
      }] : []),
    ];
    return {
      source_id: "source:formal-conjectures",
      adapter: formalConjecturesAdapter,
      revision: checkout.revision,
      inputs: [
        checkout.input,
        publishedInput.input,
        ...(extractedInput ? [extractedInput.input] : []),
      ],
      records,
      coverage: {
        status: "complete",
        scope: "Every theorem record in the exact official published Formal Conjectures dataset.",
        native_record_count: published.length,
        emitted_record_count: records.length,
        omitted_record_count: 0,
      },
      omissions: [
        {
          code: "repository_support_code_excluded",
          description: "Mathlib support code, site assets, tests, and build infrastructure are not conjecture records.",
        },
        {
          code: "published_aggregate_statistics_excluded",
          description: "Mutable site statistics and contributor aggregates remain outside source-native theorem rows.",
        },
        {
          code: "no_fidelity_or_acceptance_inference",
          description: "A published or kernel-elaborated formal statement is not represented as statement fidelity or scientific acceptance.",
        },
      ],
      loss,
    };
  } finally {
    await checkout.close();
  }
}
