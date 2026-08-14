import { describe, expect, test } from "bun:test";
import { sha256, type HashRoot } from "./canonical";
import {
  MAX_SOURCE_CORPUS_VALUES_PER_PROFILE,
  parseSourceCorpusProfilesConfig,
  sourceCorpusProfilesConfig,
  sourceCorpusProfilesRoot,
  summarizeSourceCorpusMap,
  type SourceCorpusInventoryInput,
  type SourceCorpusMapSummaryInput,
  type SourceCorpusProfilesConfig,
} from "./source-corpus-map";

const root = (label: string): HashRoot => sha256(label);

function source(
  sourceId: string,
  sourceKind: SourceCorpusInventoryInput["source_kind"],
  count: number,
  status: SourceCorpusInventoryInput["coverage_status"] = "complete",
): SourceCorpusInventoryInput {
  return {
    source_id: sourceId,
    source_kind: sourceKind,
    declaration_root: root(`${sourceId} declaration`),
    observation_root: root(`${sourceId} observation`),
    coverage_status: status,
    native_record_count: count,
    repository_binding_count: 0,
  };
}

function summaryInput(): SourceCorpusMapSummaryInput {
  const sources = [
    source("source:erdos-problems", "problem_collection", 3),
    source("source:formal-conjectures", "formal_library", 2),
    source("source:vibemathed", "problem_collection", 2),
    source("source:unprofiled-proof", "proof_manifest", 0, "unobserved"),
  ];
  return {
    release_root: root("release"),
    source_registry: {
      schema: "vela.math-source-registry-release.v1",
      declaration_root: root("registry declarations"),
      observation_bundle_root: root("observation bundle"),
      source_count: sources.length,
      observation_count: sources.length,
      native_record_count: 7,
      release_source_count: sources.length,
      repository_binding_count: 0,
    },
    sources,
    profiles: [
      {
        source_id: "source:erdos-problems",
        native_kind: "problem",
        facet_values: [
          ["number theory", "graph theory", "number theory"],
          ["number theory"],
          null,
        ],
      },
      {
        source_id: "source:formal-conjectures",
        native_kind: "formal_conjecture",
        facet_values: ["Erdős Problems", "Wikipedia"],
      },
      {
        source_id: "source:vibemathed",
        native_kind: "attributed_activity",
        facet_values: ["Combinatorics", "Combinatorics"],
      },
    ],
  };
}

function oneProfileConfig(index = 0): SourceCorpusProfilesConfig {
  return parseSourceCorpusProfilesConfig({
    ...sourceCorpusProfilesConfig,
    profiles: [structuredClone(sourceCorpusProfilesConfig.profiles[index]!)],
  });
}

describe("source corpus map", () => {
  test("summarizes every Source plus complete source-authored scalar and multi-value buckets", () => {
    const map = summarizeSourceCorpusMap(summaryInput());
    expect(map).toMatchObject({
      schema: "vela.source-corpus-map-read.v1",
      release_root: root("release"),
      profile_root: sourceCorpusProfilesRoot,
      coverage_complete: true,
      semantics: {
        authority_effect: "none",
        identity_effect: "none",
        equivalence: "not_established",
        standing_effect: "none",
        record_count_effect: "inventory_only",
        source_values: "source_authored",
      },
      inventory: {
        source_count: 4,
        observed_source_count: 3,
        unobserved_source_count: 1,
        native_record_count: 7,
      },
    });
    expect(map.inventory.source_kinds).toEqual([
      { source_kind: "formal_library", source_count: 1, native_record_count: 2 },
      { source_kind: "problem_collection", source_count: 2, native_record_count: 5 },
      { source_kind: "proof_manifest", source_count: 1, native_record_count: 0 },
    ]);
    expect(map.corpora.find(({ source_id }) => source_id === "source:erdos-problems")?.facet).toEqual({
      kind: "metadata_string_array",
      key: "tags",
      label: "Source topics",
      multi_valued: true,
      records_with_value: 2,
      missing_records: 1,
      assignment_count: 3,
      values: [
        { value: "graph theory", record_count: 1 },
        { value: "number theory", record_count: 2 },
      ],
    });
    expect(map.corpora.find(({ source_id }) => source_id === "source:formal-conjectures")?.facet).toMatchObject({
      multi_valued: false,
      records_with_value: 2,
      missing_records: 0,
      assignment_count: 2,
    });
    expect(JSON.stringify(map)).not.toMatch(/accepted|verified|verification|decision|equivalent/iu);
  });

  test("refuses duplicate profile identities and a second facet for one Source", () => {
    const duplicate = structuredClone(sourceCorpusProfilesConfig);
    duplicate.profiles.push(structuredClone(duplicate.profiles[0]!));
    expect(() => parseSourceCorpusProfilesConfig(duplicate)).toThrow(/profile identities must be unique|one faceted profile per Source/u);

    const secondFacet = structuredClone(sourceCorpusProfilesConfig);
    secondFacet.profiles.push({
      ...structuredClone(secondFacet.profiles[0]!),
      native_kind: "second_kind",
    });
    expect(() => parseSourceCorpusProfilesConfig(secondFacet)).toThrow(/one faceted profile per Source/u);
  });

  test("refuses incomplete inventory, count drift, duplicate reads and unknown profiled Sources", () => {
    const missingInventory = summaryInput();
    missingInventory.sources.pop();
    expect(() => summarizeSourceCorpusMap(missingInventory)).toThrow(/does not cover every/u);

    const countDrift = summaryInput();
    countDrift.source_registry.native_record_count += 1;
    expect(() => summarizeSourceCorpusMap(countDrift)).toThrow(/do not reconcile/u);

    const duplicateRead = summaryInput();
    duplicateRead.profiles[1] = structuredClone(duplicateRead.profiles[0]!);
    expect(() => summarizeSourceCorpusMap(duplicateRead)).toThrow(/repeats profiled read/u);

    const unknownConfig = structuredClone(sourceCorpusProfilesConfig);
    unknownConfig.profiles[0]!.source_id = "source:not-retained";
    const unknownRead = summaryInput();
    unknownRead.profiles[0]!.source_id = "source:not-retained";
    expect(() => summarizeSourceCorpusMap(
      unknownRead,
      parseSourceCorpusProfilesConfig(unknownConfig),
    )).toThrow(/unknown Source/u);
  });

  test("refuses malformed metadata instead of silently creating buckets", () => {
    const malformedArray = summaryInput();
    malformedArray.profiles[0]!.facet_values[0] = ["number theory", 7];
    expect(() => summarizeSourceCorpusMap(malformedArray)).toThrow(/nonempty source-authored string/u);

    const malformedScalar = summaryInput();
    malformedScalar.profiles[1]!.facet_values[0] = ["Wikipedia"];
    expect(() => summarizeSourceCorpusMap(malformedScalar)).toThrow(/nonempty source-authored string/u);
  });

  test("decodes the canonical JSON-string representation used by projected arrays", () => {
    const projected = summaryInput();
    projected.profiles[0]!.facet_values[0] = '["number theory","geometry"]';

    const summary = summarizeSourceCorpusMap(projected);

    expect(summary.corpora[0]!.facet.values).toEqual([
      { value: "geometry", record_count: 1 },
      { value: "number theory", record_count: 2 },
    ]);
    expect(summary.corpora[0]!.facet.assignment_count).toBe(3);
  });

  test("refuses value and record bounds rather than clipping the exact profile", () => {
    const config = oneProfileConfig();
    const distinct = Array.from(
      { length: MAX_SOURCE_CORPUS_VALUES_PER_PROFILE + 1 },
      (_, index) => [`topic ${index}`],
    );
    const inventory = source("source:erdos-problems", "problem_collection", distinct.length);
    const bounded: SourceCorpusMapSummaryInput = {
      release_root: root("bounded release"),
      source_registry: {
        schema: "vela.math-source-registry-release.v1",
        declaration_root: root("bounded registry"),
        observation_bundle_root: root("bounded observations"),
        source_count: 1,
        observation_count: 1,
        native_record_count: distinct.length,
        release_source_count: 1,
        repository_binding_count: 0,
      },
      sources: [inventory],
      profiles: [{ source_id: inventory.source_id, native_kind: "problem", facet_values: distinct }],
    };
    expect(() => summarizeSourceCorpusMap(bounded, config)).toThrow(/128-value bound/u);
  });
});
