import { z } from "zod";
import { canonicalJson, sha256 } from "../canonical";
import { acquireBytes } from "./acquisition";
import {
  createSourceAdapterIdentity,
  createSourceNativeRecord,
} from "./contracts";
import type { SourceAdapterOutput } from "./bundle";

export const oeisA309370Adapter = createSourceAdapterIdentity(
  "problems-data/oeis-a309370",
  "1.0.0",
);

const oeisEntrySchema = z.object({
  number: z.literal(309370),
  data: z.string().min(1),
  name: z.string().min(1),
  offset: z.string().min(1).optional(),
  keyword: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  modified: z.string().min(1).optional(),
  comment: z.array(z.string()).optional(),
  link: z.array(z.string()).optional(),
}).passthrough();

const oeisResponseSchema = z.union([
  oeisEntrySchema,
  z.array(oeisEntrySchema).length(1),
]).transform((value) => Array.isArray(value) ? value[0] : value);

export interface OeisA309370AcquisitionOptions {
  dataset: string;
  logicalLocator?: string;
}

/**
 * Acquires the exact public OEIS JSON response as one rooted sequence record.
 * The normalized row intentionally omits narrative fields; their exact bytes
 * remain bound by the adapter input and revision roots.
 */
export async function acquireOeisA309370(
  options: OeisA309370AcquisitionOptions,
): Promise<SourceAdapterOutput> {
  const logicalLocator = options.logicalLocator
    ?? "https://oeis.org/A309370?fmt=json";
  const acquired = await acquireBytes(options.dataset, {
    inputId: "sequence-json",
    role: "published_dataset",
    mediaType: "application/json",
    manifestLocator: logicalLocator,
  });
  const entry = oeisResponseSchema.parse(
    JSON.parse(Buffer.from(acquired.bytes).toString("utf8")),
  );
  const normalized = {
    number: entry.number,
    data: entry.data,
    name: entry.name,
    offset: entry.offset ?? null,
    keyword: entry.keyword ?? null,
    author: entry.author ?? null,
    modified: entry.modified ?? null,
  };
  const record = createSourceNativeRecord({
    schema: "vela.source-native-record.v1",
    source_id: "source:oeis-a309370",
    native_id: "oeis:A309370",
    native_kind: "sequence",
    native_revision: acquired.input.content_root,
    title: "OEIS A309370",
    summary: entry.name,
    source_path: null,
    locators: ["https://oeis.org/A309370"],
    metadata: normalized,
    content_root: sha256(canonicalJson(normalized)),
  });
  return {
    source_id: "source:oeis-a309370",
    adapter: oeisA309370Adapter,
    revision: {
      kind: "snapshot",
      value: acquired.input.content_root,
      git_commit: null,
      git_tree: null,
      content_root: acquired.input.content_root,
    },
    inputs: [acquired.input],
    records: [record],
    coverage: {
      status: "complete",
      scope: "The one exact OEIS A309370 sequence record returned by the declared JSON endpoint.",
      native_record_count: 1,
      emitted_record_count: 1,
      omitted_record_count: 0,
    },
    omissions: [{
      code: "oeis_narrative_fields_not_projected",
      description: "Comments, formulas, programs, links, examples, and revision history remain outside the normalized row.",
    }],
    loss: [{
      code: "oeis_source_labels_remain_attributed",
      description: "OEIS data and comments remain attributed source facts and do not create Vela Verification or Standing.",
    }],
  };
}
