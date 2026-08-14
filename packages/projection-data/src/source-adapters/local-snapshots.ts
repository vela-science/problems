import { canonicalJson, sha256 } from "../canonical";
import { acquireBytes } from "./acquisition";
import {
  createSourceAdapterIdentity,
  createSourceNativeRecord,
  type SourceAdapterDisclosure,
  type SourceAdapterRevision,
  type SourceNativeRecord,
} from "./contracts";
import type { SourceAdapterOutput } from "./bundle";

export const localSnapshotAdapters = {
  "erdos-ai-wiki": createSourceAdapterIdentity(
    "problems-data/erdos-ai-contributions-wiki",
    "1.0.0",
  ),
  "gpt-erdos": createSourceAdapterIdentity(
    "problems-data/gpt-erdos",
    "1.0.0",
  ),
} as const;

export type LocalSnapshotAdapterName = keyof typeof localSnapshotAdapters;

const sourceIdentity = {
  "erdos-ai-wiki": {
    sourceId: "source:erdos-ai-contributions-wiki",
    logicalLocator: "https://github.com/erdosproblems/wiki/AI-contributions",
  },
  "gpt-erdos": {
    sourceId: "source:gpt-erdos",
    logicalLocator: "https://github.com/neelsomani/gpt-erdos",
  },
} as const;

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function recordsByProblem(
  document: Record<string, unknown>,
  label: string,
): Array<[number, unknown]> {
  const problems = object(document.problems, `${label}.problems`);
  return Object.entries(problems).map(([key, value]) => {
    const number = Number(key);
    if (!Number.isSafeInteger(number) || number <= 0 || String(number) !== key) {
      throw new Error(`${label} has invalid problem number ${key}`);
    }
    return [number, value] as [number, unknown];
  }).sort(([left], [right]) => left - right);
}

function snapshotRevision(
  revision: string,
  contentRoot: `sha256:${string}`,
): SourceAdapterRevision {
  if (revision.trim() === "") throw new Error("snapshot revision is required");
  return {
    kind: "snapshot",
    value: revision,
    git_commit: null,
    git_tree: null,
    content_root: contentRoot,
  };
}

function nativeRecord(input: {
  sourceId: string;
  nativeId: string;
  nativeKind: string;
  revision: string;
  title: string;
  summary: string | null;
  locators: string[];
  metadata: Record<string, unknown>;
  content: unknown;
}): SourceNativeRecord {
  return createSourceNativeRecord({
    schema: "vela.source-native-record.v1",
    source_id: input.sourceId,
    native_id: input.nativeId,
    native_kind: input.nativeKind,
    native_revision: input.revision,
    title: input.title,
    summary: input.summary,
    source_path: null,
    locators: input.locators,
    metadata: input.metadata,
    content_root: sha256(canonicalJson(input.content)),
  });
}

function wiki(
  document: Record<string, unknown>,
  revision: string,
): {
  records: SourceNativeRecord[];
  nativeCount: number;
  omissions: SourceAdapterDisclosure[];
  loss: SourceAdapterDisclosure[];
} {
  const rows = recordsByProblem(document, "AI-contributions wiki snapshot");
  const records = rows.flatMap(([number, value]) => {
    if (!Array.isArray(value)) {
      throw new Error(`AI-contributions wiki problem ${number} must contain an entry array`);
    }
    return value.map((entryValue, index) => {
      const entry = object(entryValue, `AI-contributions wiki ${number}/${index}`);
      const entryRoot = sha256(canonicalJson(entry));
      return nativeRecord({
        sourceId: "source:erdos-ai-contributions-wiki",
        nativeId: `erdos-ai-wiki:${number}:${entryRoot.slice(7, 23)}`,
        nativeKind: "attributed_activity",
        revision,
        title: `AI contribution record for Erdős ${number}`,
        summary: typeof object(entry.outcome ?? {}, "wiki outcome").label === "string"
          ? String(object(entry.outcome ?? {}, "wiki outcome").label)
          : typeof entry.section_name === "string"
            ? entry.section_name
            : null,
        locators: [
          "https://github.com/erdosproblems/wiki/AI-contributions",
          `https://www.erdosproblems.com/${number}`,
        ],
        metadata: {
          problem_number: number,
          section: entry.section ?? null,
          section_name: entry.section_name ?? null,
          date: entry.date ?? null,
          outcome: entry.outcome ?? null,
          ai_systems: entry.ai_systems ?? [],
          humans: entry.humans ?? [],
        },
        content: entry,
      });
    });
  });
  const summary = object(document.summary, "AI-contributions wiki summary");
  if (Number(summary.entries) !== records.length) {
    throw new Error("AI-contributions wiki entry count does not match its summary");
  }
  return {
    records,
    nativeCount: records.length,
    omissions: [{
      code: "wiki_narrative_excluded",
      description: "Narrative wiki prose outside the exact structured registry is not projected.",
    }],
    loss: [{
      code: "source_labels_remain_attributed",
      description: "Outcome colors and labels are source attributions, not Vela verification or acceptance.",
    }],
  };
}

function gptErdos(
  document: Record<string, unknown>,
  revision: string,
): {
  records: SourceNativeRecord[];
  nativeCount: number;
  omissions: SourceAdapterDisclosure[];
  loss: SourceAdapterDisclosure[];
} {
  const rows = recordsByProblem(document, "GPT-Erdős snapshot");
  const summary = object(document.summary, "GPT-Erdős summary");
  if (Number(summary.problems) !== rows.length) {
    throw new Error("GPT-Erdős problem count does not match its summary");
  }
  return {
    nativeCount: rows.length,
    records: rows.map(([number, value]) => {
      const row = object(value, `GPT-Erdős problem ${number}`);
      return nativeRecord({
        sourceId: "source:gpt-erdos",
        nativeId: `gpt-erdos:${number}`,
        nativeKind: "attributed_classification",
        revision,
        title: `GPT-Erdős classification for problem ${number}`,
        summary: typeof row.category_label === "string" ? row.category_label : null,
        locators: [
          "https://github.com/neelsomani/gpt-erdos",
          `https://www.erdosproblems.com/${number}`,
        ],
        metadata: {
          problem_number: number,
          category: row.category ?? null,
          category_label: row.category_label ?? null,
        },
        content: row,
      });
    }),
    omissions: [{
      code: "unretained_repository_content_excluded",
      description: "Only the exact retained structured classification snapshot is represented.",
    }],
    loss: [{
      code: "classification_not_validation",
      description: "GPT-Erdős categories remain attributed classifications and do not create verification or Standing.",
    }],
  };
}

export interface LocalSnapshotAcquisitionOptions {
  adapter: LocalSnapshotAdapterName;
  input: string;
  revision: string;
}

export async function acquireLocalSnapshot(
  options: LocalSnapshotAcquisitionOptions,
): Promise<SourceAdapterOutput> {
  const identity = sourceIdentity[options.adapter];
  const acquired = await acquireBytes(options.input, {
    inputId: "retained-snapshot",
    role: "retained_snapshot",
    mediaType: "application/json",
    manifestLocator: identity.logicalLocator,
  });
  const document = object(
    JSON.parse(Buffer.from(acquired.bytes).toString("utf8")),
    `${options.adapter} snapshot`,
  );
  const embeddedRevision = (
    options.adapter === "erdos-ai-wiki" ? document.wiki_commit : document.commit
  ) ?? null;
  if (
    embeddedRevision !== null
    && (
      typeof embeddedRevision !== "string"
      || embeddedRevision !== options.revision
    )
  ) {
    throw new Error(
      `${options.adapter} snapshot revision does not match its embedded source revision`,
    );
  }
  const adapted = options.adapter === "erdos-ai-wiki"
    ? wiki(document, options.revision)
    : gptErdos(document, options.revision);
  return {
    source_id: identity.sourceId,
    adapter: localSnapshotAdapters[options.adapter],
    revision: snapshotRevision(options.revision, acquired.input.content_root),
    inputs: [acquired.input],
    records: adapted.records,
    coverage: {
      status: "complete",
      scope: `Every record in the exact retained ${options.adapter} structured snapshot.`,
      native_record_count: adapted.nativeCount,
      emitted_record_count: adapted.records.length,
      omitted_record_count: 0,
    },
    omissions: adapted.omissions,
    loss: adapted.loss,
  };
}
