import { YAML } from "bun";
import { join } from "node:path";
import { z } from "zod";
import { canonicalJson, sha256 } from "../canonical";
import {
  acquireBytes,
  acquireExactGitCheckout,
  gitBlobRoot,
} from "./acquisition";
import {
  createSourceAdapterIdentity,
  createSourceNativeRecord,
  type SourceAdapterDisclosure,
  type SourceNativeRecord,
} from "./contracts";
import type { SourceAdapterOutput } from "./bundle";

/**
 * The Erdős problem registry, read from an exact Git checkout of the commit the
 * repository's source lock pins.
 *
 * This source is declared `content_root_only` with `retention: "none"` and
 * `redistribution: "reference_only"`, so the adapter binds the observed bytes
 * and copies none of them into a second archive. It replaces a retained-snapshot
 * adapter that read a normalized JSON file out of a sibling repository's working
 * tree: that file carried verbatim problem statements, which the declaration's
 * own rights and snapshot policy do not permit retaining, and it was inherited
 * rather than acquired, so its bytes answered to no pin.
 */
export const erdosProblemsAdapter = createSourceAdapterIdentity(
  "problems-data/erdos-problems",
  "3.0.0",
);

export const erdosProblemsSourceId = "source:erdos-problems";

const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);

/* Upstream regenerates `status` from `informal_status` and `formal_status` on
   every push and regenerates `formalized` from the formal-conjectures registry.
   All four are carried through exactly as served; none is recomputed here. A
   reader that wants the primitives has them, and a reader that wants upstream's
   own combination has that too, without this adapter arbitrating between them. */
/* Scalar leaves only, and a catchall rather than a passthrough. A native
   record's metadata is flat scalars by contract, and the projection
   canonical-JSONs anything else on its way in — so a leaf upstream nests would
   be retained as the *text* of its own JSON, which is how `status` reached the
   projection as a string and made `metadata -> 'status' ->> 'state'` NULL on
   all 1,217 problems. A pin that nests something now fails here, in the
   adapter, naming the field. */
const declaredStateSchema = z.object({
  state: z.string().min(1),
  last_update: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
}).catchall(z.union([z.string(), z.number(), z.boolean(), z.null()]));

const problemEntrySchema = z.object({
  number: z.union([z.string().min(1), z.number().int().positive()]),
  prize: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  oeis: z.array(z.string().min(1)).optional(),
  informal_status: declaredStateSchema.optional(),
  formal_status: declaredStateSchema.optional(),
  status: declaredStateSchema.optional(),
  formalized: declaredStateSchema.optional(),
  comments: z.string().min(1).optional(),
}).passthrough();

const problemRegistrySchema = z.array(problemEntrySchema);

const declaredStateFields = [
  "status",
  "informal_status",
  "formal_status",
  "formalized",
] as const;

/**
 * The four declared states, one flat scalar per leaf upstream publishes.
 *
 * `status_state`, `formal_status_url` and the rest carry the same values under
 * names the metadata contract can actually hold. Every leaf travels, including
 * the ones only a handful of problems carry (`formal_status.url` on five at the
 * pinned commit, `formal_status.note` on two): dropping them here would be loss
 * this adapter does not disclose. `<field>_state` is written for all four
 * whether or not upstream declared the field, so an absent state and an absent
 * field read alike to SQL and differ in the record; the optional leaves appear
 * only where they exist.
 */
function flatDeclaredStates(
  entry: z.infer<typeof problemEntrySchema>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(declaredStateFields.flatMap((field) => {
    const declared = entry[field];
    return [
      [`${field}_state`, declared?.state ?? null],
      ...Object.entries(declared ?? {})
        .filter(([leaf]) => leaf !== "state")
        .map(([leaf, value]) => [`${field}_${leaf}`, value] as const),
    ];
  }));
}

function exactBlobLocator(
  repository: string,
  commit: string,
  path: string,
): string {
  const match = /(?:https:\/\/github\.com\/|git@github\.com:)?([^/\s]+\/[^/\s]+?)(?:\.git)?$/u
    .exec(repository);
  return match
    ? `https://github.com/${match[1]}/blob/${commit}/${path}`
    : `${repository}#${commit}:${path}`;
}

export interface ErdosProblemsAcquisitionOptions {
  repository: string;
  revision: string;
  dataPath: string;
  expectedDataRoot: string;
  logicalLocator: string;
}

/**
 * Reads `data/problems.yaml` from an exact detached checkout, verifies its byte
 * root against the pin the source lock records, and emits one problem record per
 * upstream entry.
 */
export async function acquireErdosProblems(
  options: ErdosProblemsAcquisitionOptions,
): Promise<SourceAdapterOutput> {
  const expectedDataRoot = hashRootSchema.parse(options.expectedDataRoot);
  const checkout = await acquireExactGitCheckout(
    options.repository,
    options.revision,
  );
  try {
    if (checkout.commit !== options.revision) {
      throw new Error(
        `Erdős problem registry resolved ${checkout.commit}, expected ${options.revision}`,
      );
    }
    const committedBlob = await gitBlobRoot(
      checkout.directory,
      checkout.commit,
      options.dataPath,
    );
    if (committedBlob.content_root !== expectedDataRoot) {
      throw new Error(
        `Erdős problem registry root ${committedBlob.content_root} does not match source lock ${expectedDataRoot}`,
      );
    }
    const acquired = await acquireBytes(
      join(checkout.directory, options.dataPath),
      {
        inputId: "problem-registry",
        role: "published_dataset",
        mediaType: "application/yaml",
        manifestLocator: options.logicalLocator,
      },
    );
    if (acquired.input.content_root !== committedBlob.content_root) {
      throw new Error(
        "Erdős problem registry working bytes differ from the exact committed blob",
      );
    }
    let parsed: unknown;
    try {
      parsed = YAML.parse(Buffer.from(acquired.bytes).toString("utf8"));
    } catch (error) {
      throw new Error(
        `Erdős problem registry is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const entries = problemRegistrySchema.parse(parsed);
    const blobLocator = exactBlobLocator(
      options.repository,
      checkout.commit,
      options.dataPath,
    );

    const seen = new Set<string>();
    const records: SourceNativeRecord[] = [];
    /* Upstream's schema permits a `number` such as "12-15" for a problem stated
       as a range. None appears at the pinned commit, but a later pin may carry
       one, and a range has no single problem number to key a record on. Counting
       it as omitted keeps the coverage arithmetic honest; renumbering or
       dropping it silently would not. */
    let omitted = 0;
    for (const entry of entries) {
      const number = String(entry.number);
      if (seen.has(number)) {
        throw new Error(`Erdős problem registry repeats problem ${number}`);
      }
      seen.add(number);
      if (!/^[1-9][0-9]*$/u.test(number)) {
        omitted += 1;
        continue;
      }
      records.push(createSourceNativeRecord({
        schema: "vela.source-native-record.v1",
        source_id: erdosProblemsSourceId,
        native_id: `erdos:${number}`,
        native_kind: "problem",
        native_revision: checkout.commit,
        title: `Erdős problem ${number}`,
        /* The pinned registry carries no statement prose; it lives on
           erdosproblems.com, which this repository does not observe. A locator
           reaches it, and the omission below says so rather than leaving a
           reader to infer it from an empty field. */
        summary: null,
        source_path: options.dataPath,
        locators: [
          `https://www.erdosproblems.com/${number}`,
          blobLocator,
        ],
        /* `tags` and `oeis` stay lists: the contract's own reader accessor
           handles a JSON array under a single key, and a subject vocabulary
           does not flatten to a fixed set of names the way a declared state
           does. Everything else here is already a scalar. */
        metadata: {
          problem_number: Number(number),
          prize: entry.prize ?? null,
          tags: entry.tags ?? [],
          oeis: entry.oeis ?? [],
          ...flatDeclaredStates(entry),
          comments: entry.comments ?? null,
        },
        content_root: sha256(canonicalJson(entry)),
      }));
    }

    const omissions: SourceAdapterDisclosure[] = [
      {
        code: "statement_prose_not_observed",
        description: "Verbatim problem statements are served by erdosproblems.com, which this source does not observe; records carry a locator to the problem page and no statement text.",
      },
      {
        code: "website_presentation_excluded",
        description: "Website presentation and mutable discussion outside the pinned registry are not represented as covered.",
      },
    ];
    if (omitted > 0) {
      omissions.push({
        code: "range_numbered_entries_omitted",
        description: "Entries whose upstream number states a range rather than a single problem have no problem number to key a record on and are omitted.",
      });
    }

    return {
      source_id: erdosProblemsSourceId,
      adapter: erdosProblemsAdapter,
      revision: checkout.revision,
      inputs: [checkout.input, acquired.input],
      records,
      coverage: {
        status: omitted === 0 ? "complete" : "partial",
        scope: "Every single-numbered entry in the exact Erdős problem registry the source lock pins.",
        native_record_count: entries.length,
        emitted_record_count: records.length,
        omitted_record_count: omitted,
      },
      omissions,
      loss: [{
        code: "source_labels_remain_attributed",
        description: "Upstream status, formalization, prize and subject tags remain attributed source facts. None of them is a Vela Standing, and none creates Verification.",
      }],
    };
  } finally {
    await checkout.close();
  }
}
