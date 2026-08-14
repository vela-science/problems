import { z } from "zod";
import { canonicalJson, sha256 } from "../canonical";
import { acquireBytes } from "./acquisition";
import {
  createSourceAdapterIdentity,
  createSourceNativeRecord,
  type SourceNativeRecord,
} from "./contracts";
import type { SourceAdapterOutput } from "./bundle";

/**
 * The VibeMathed catalogue, read from the dataset endpoint the site publishes.
 *
 * Two things about this source shape the whole adapter.
 *
 * The first is that its rights are established. The catalogue is CC BY 4.0,
 * declared in the repository README and again in a `license` field inside the
 * response, so unlike every other problem source here the statement prose may
 * be retained rather than pointed at. `source:erdos-problems` carries a locator
 * and no statement because its rights are `not_established`; this one carries
 * the statement, and every record names the source so the attribution the
 * licence requires travels with it.
 *
 * The second is that the endpoint cannot be pinned, and the adapter is built so
 * that this costs the projection as little as possible. The response is a cached
 * render whose envelope carries a `generated` timestamp inside the bytes, and it
 * re-renders on a cache cycle: measured 2026-08-07, three distinct byte digests
 * inside twelve minutes with all 509 entries identical across every one. So the
 * byte root of the retrieval is recorded as an input, where it belongs, and the
 * revision is rooted on the observed catalogue instead. A refresh that finds a
 * new envelope over an unchanged catalogue produces the same revision, the same
 * records, and the same bundle root, because nothing was observed to change.
 *
 * A corollary worth knowing before you reach for it: the `vibemathed` sha256 in
 * the Repository's `sources.lock.json` is not a root this adapter can be checked
 * against, and nothing here reads it. Three lock regenerations that same day
 * produced three digests over an unchanged catalogue, so holding an acquisition
 * to the recorded one would fail on a response that is correct. The lock records
 * what was served at a moment; the catalogue root below is what holds still.
 * `erdos-problems` verifies against its lock precisely because its bytes come
 * from a commit, and the contrast is the point rather than an inconsistency.
 *
 * The same reasoning excludes votes, comment counts and submitter pseudonyms.
 * They are mutable community state rather than the curatorial attribution this
 * source is observed for, and folding them in would churn every record root on
 * a vote.
 */
export const vibemathedAdapter = createSourceAdapterIdentity(
  "problems-data/vibemathed",
  "1.0.0",
);

export const vibemathedSourceId = "source:vibemathed";

export const vibemathedDataset = "https://vibemathed.com/api/dataset";

/* Scalar leaves only, exactly as `erdos-problems` learned to do it: a native
   record's metadata is flat scalars by contract, and the projection
   canonical-JSONs anything else on its way in, so a nested leaf would be
   retained as the text of its own JSON and read back as nothing. Of the
   catalogue's fields only `links` nests, and its urls travel in the record's
   `locators` instead. `humanCollaborators` stays an array of strings, on the
   same grounds `erdos-problems` keeps `tags` and `oeis` as arrays. */
const catalogueEntrySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1).nullable().optional(),
  problemNumber: z.number().int().nullable().optional(),
  field: z.string().min(1).nullable().optional(),
  fieldGroup: z.string().min(1).nullable().optional(),
  statement: z.string().nullable().optional(),
  posedBy: z.string().min(1).nullable().optional(),
  yearPosed: z.number().int().nullable().optional(),
  solveType: z.string().min(1).nullable().optional(),
  resolution: z.string().min(1).nullable().optional(),
  resolutionMethod: z.string().min(1).nullable().optional(),
  verification: z.string().min(1).nullable().optional(),
  verificationNote: z.string().nullable().optional(),
  aiContribution: z.string().min(1).nullable().optional(),
  aiRole: z.string().nullable().optional(),
  resultNote: z.string().nullable().optional(),
  claimIssueNote: z.string().nullable().optional(),
  significance: z.number().int().nullable().optional(),
  significanceNote: z.string().nullable().optional(),
  solveDate: z.string().min(1).nullable().optional(),
  model: z.string().min(1).nullable().optional(),
  modelMaker: z.string().min(1).nullable().optional(),
  humanCollaborators: z.array(z.string().min(1)).optional(),
  publication: z.string().min(1).nullable().optional(),
  citations: z.number().int().nullable().optional(),
  citationsPaper: z.string().nullable().optional(),
  citationsSource: z.string().nullable().optional(),
  citationsUrl: z.string().nullable().optional(),
  sourceName: z.string().min(1).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  links: z.array(z.object({
    label: z.string().min(1).nullable().optional(),
    url: z.string().url(),
    kind: z.string().min(1).nullable().optional(),
  }).passthrough()).optional(),
}).passthrough();

/* The envelope states its own count and its own licence. Both are checked
   rather than read past: a count that disagrees with the array means the
   response was truncated in transit, and a licence that is no longer CC BY 4.0
   means the rights this source is declared under have changed and the retention
   of statement prose is no longer authorized. Failing here is the point. */
const datasetSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  license: z.string().min(1),
  methodology: z.string().url().optional(),
  generated: z.string().min(1),
  count: z.number().int().nonnegative(),
  problems: z.array(catalogueEntrySchema),
}).passthrough();

const declaredLicense = "CC BY 4.0";

type CatalogueEntry = z.infer<typeof catalogueEntrySchema>;

function text(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * The observed view of one catalogue entry: the curatorial attribution and the
 * problem identity, and nothing that moves on its own. This is what the record
 * carries and what its content root is computed over, so the root describes what
 * was retained rather than what upstream happened to serve alongside it.
 */
function observed(entry: CatalogueEntry): Record<string, string | number | boolean | null | string[]> {
  return {
    slug: entry.slug,
    name: entry.name,
    short_name: text(entry.shortName),
    problem_number: entry.problemNumber ?? null,
    field: text(entry.field),
    field_group: text(entry.fieldGroup),
    statement: text(entry.statement),
    posed_by: text(entry.posedBy),
    year_posed: entry.yearPosed ?? null,
    solve_type: text(entry.solveType),
    resolution: text(entry.resolution),
    resolution_method: text(entry.resolutionMethod),
    verification: text(entry.verification),
    verification_note: text(entry.verificationNote),
    ai_contribution: text(entry.aiContribution),
    ai_role: text(entry.aiRole),
    result_note: text(entry.resultNote),
    claim_issue_note: text(entry.claimIssueNote),
    significance: entry.significance ?? null,
    significance_note: text(entry.significanceNote),
    solve_date: text(entry.solveDate),
    model: text(entry.model),
    model_maker: text(entry.modelMaker),
    human_collaborators: entry.humanCollaborators ?? [],
    publication: text(entry.publication),
    citations: entry.citations ?? null,
    citations_paper: text(entry.citationsPaper),
    citations_source: text(entry.citationsSource),
    citations_url: text(entry.citationsUrl),
    source_name: text(entry.sourceName),
    source_url: text(entry.sourceUrl),
  };
}

function entryLocators(entry: CatalogueEntry): string[] {
  const locators = [
    `https://vibemathed.com/problem/${entry.slug}`,
    ...(entry.sourceUrl ? [entry.sourceUrl] : []),
    ...(entry.links ?? []).map(({ url }) => url),
  ];
  return [...new Set(locators)];
}

export interface VibemathedAcquisitionOptions {
  dataset?: string;
  logicalLocator?: string;
}

/**
 * Acquires the published catalogue and emits one attributed record per entry.
 *
 * `native_kind` is `attributed_activity`, the same kind
 * `source:erdos-ai-contributions-wiki` emits, because it is the same species of
 * claim: somebody else's judgment about who or what solved a problem. Nothing
 * this adapter emits is a Vela Claim, Verification, Decision or Standing, and
 * the loss disclosure says so in those terms.
 */
export async function acquireVibemathed(
  options: VibemathedAcquisitionOptions = {},
): Promise<SourceAdapterOutput> {
  const dataset = options.dataset ?? vibemathedDataset;
  const logicalLocator = options.logicalLocator ?? vibemathedDataset;
  const acquired = await acquireBytes(dataset, {
    inputId: "dataset",
    role: "published_dataset",
    mediaType: "application/json",
    manifestLocator: logicalLocator,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(acquired.bytes).toString("utf8"));
  } catch (error) {
    throw new Error(
      `VibeMathed dataset is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const document = datasetSchema.parse(parsed);

  if (!document.license.includes(declaredLicense)) {
    throw new Error(
      `VibeMathed dataset declares license ${document.license}, not the ${declaredLicense} this source is declared under`,
    );
  }
  if (document.count !== document.problems.length) {
    throw new Error(
      `VibeMathed dataset states ${document.count} entries and serves ${document.problems.length}`,
    );
  }

  const seen = new Set<string>();
  const rows = document.problems.map((entry) => {
    if (seen.has(entry.slug)) {
      throw new Error(`VibeMathed dataset repeats entry ${entry.slug}`);
    }
    seen.add(entry.slug);
    return { entry, view: observed(entry) };
  });

  /* The revision is the root of the observed catalogue, not of the retrieved
     bytes. The retrieved bytes are recorded as the input above and carry the
     envelope's `generated` stamp, which moves on a cache cycle with no change
     to a single entry. Rooting the revision there would republish an identical
     catalogue under a new revision several times an hour. */
  const catalogueRoot = sha256(canonicalJson(rows.map(({ view }) => view)));

  const records: SourceNativeRecord[] = rows.map(({ entry, view }) => (
    createSourceNativeRecord({
      schema: "vela.source-native-record.v1",
      source_id: vibemathedSourceId,
      native_id: `vibemathed:${entry.slug}`,
      native_kind: "attributed_activity",
      native_revision: catalogueRoot,
      title: entry.name,
      /* Retained, not pointed at: the CC BY 4.0 licence permits it and the
         record's locators carry the attribution back. 60 of the 509 entries at
         the observed retrieval state no statement, and those summarise as null
         rather than as an empty string. */
      summary: text(entry.statement),
      source_path: null,
      locators: entryLocators(entry),
      metadata: view,
      content_root: sha256(canonicalJson(view)),
    })
  ));

  return {
    source_id: vibemathedSourceId,
    adapter: vibemathedAdapter,
    revision: {
      kind: "snapshot",
      value: catalogueRoot,
      git_commit: null,
      git_tree: null,
      content_root: catalogueRoot,
    },
    inputs: [acquired.input],
    records,
    coverage: {
      status: "complete",
      scope: "Every catalogue entry served by the VibeMathed dataset endpoint at the observed retrieval.",
      native_record_count: document.problems.length,
      emitted_record_count: records.length,
      omitted_record_count: 0,
    },
    omissions: [
      {
        code: "community_state_not_projected",
        description: "Votes, comment counts, submitter pseudonyms, discussion threads and the field-level edit changelog are mutable site state and are not projected.",
      },
      {
        code: "link_labels_not_retained",
        description: "An entry's cited links are retained as record locators; their upstream labels and kind tags are not carried as fields.",
      },
      {
        code: "linked_evidence_not_acquired",
        description: "The preprints and Lean repositories an entry cites are located, never fetched; their bytes and their separate rights are outside this source.",
      },
    ],
    loss: [
      {
        code: "source_attributions_remain_attributed",
        description: "Resolution, verification rung, AI-contribution tier and significance are source attributions, not Vela verification or acceptance.",
      },
      {
        code: "retrieval_is_not_a_revision",
        description: "The endpoint serves no commit locator, so the recorded revision roots the observed catalogue and names a retrieval rather than an upstream revision.",
      },
    ],
  };
}
