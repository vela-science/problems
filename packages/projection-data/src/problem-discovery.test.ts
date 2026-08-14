import { describe, expect, test } from "bun:test";
import {
  classifyProblemDiscovery,
  parseProblemDiscoveryConfig,
  problemDiscoveryConfig,
  problemDiscoveryConfigRoot,
} from "./problem-discovery";

describe("versioned Problem discovery semantics", () => {
  test("classifies the current Erdős source without deriving taxonomy from a Repository slug", () => {
    expect(problemDiscoveryConfigRoot).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(classifyProblemDiscovery({
      source_id: "source:erdos-problems",
      native_kind: "problem",
      metadata: { tags: '["number theory","additive combinatorics","number theory"]' },
    })).toEqual({
      classification: "profiled",
      area: { key: "mathematics", name: "Mathematics" },
      collection: { key: "erdos-problems", name: "Erdős Problems" },
      field: null,
      topics: [
        { key: "additive combinatorics", name: "Additive Combinatorics" },
        { key: "number theory", name: "Number Theory" },
      ],
      hubs: [{ key: "erdos-problems", name: "Erdős Problems" }],
      authority_effect: "none",
    });
  });

  test("supports explicit non-math profiles and scalar Fields in one domain-neutral model", () => {
    const config = parseProblemDiscoveryConfig({
      schema: "vela.problem-discovery.v1",
      semantics: problemDiscoveryConfig.semantics,
      profiles: [
        {
          source_id: "source:synthetic-math",
          native_kind: "open_question",
          area: { key: "mathematics", name: "Mathematics" },
          collection: { key: "synthetic-math", name: "Synthetic Math" },
          hubs: [{ key: "discrete", name: "Discrete problems" }],
          field: { kind: "none" },
          topics: { kind: "metadata_string_array", key: "topics" },
        },
        {
          source_id: "source:synthetic-biology",
          native_kind: "open_question",
          area: { key: "biology", name: "Biology" },
          collection: { key: "synthetic-biology", name: "Synthetic Biology" },
          hubs: [{ key: "genome", name: "Genome questions" }],
          field: { kind: "metadata_scalar", key: "field" },
          topics: { kind: "metadata_string_array", key: "topics" },
        },
      ],
    });
    expect(classifyProblemDiscovery({
      source_id: "source:synthetic-biology",
      native_kind: "open_question",
      metadata: { field: "Population genetics", topics: ["genomics", "evolution"] },
    }, config)).toMatchObject({
      area: { key: "biology" },
      collection: { key: "synthetic-biology" },
      field: { key: "population-genetics", name: "Population genetics" },
      topics: [{ key: "evolution" }, { key: "genomics" }],
    });
  });

  test("keeps unknown source identities explicitly unclassified", () => {
    expect(classifyProblemDiscovery({
      source_id: "source:unknown",
      native_kind: "problem",
      metadata: { tags: '["geometry"]' },
    })).toEqual({
      classification: "unclassified",
      area: null,
      collection: null,
      field: null,
      topics: [],
      hubs: [],
      authority_effect: "none",
    });
  });

  test("refuses duplicate identities and conflicting Hub semantics", () => {
    const duplicate = structuredClone(problemDiscoveryConfig);
    duplicate.profiles.push(structuredClone(duplicate.profiles[0]!));
    expect(() => parseProblemDiscoveryConfig(duplicate)).toThrow(/source discovery identities must be unique/u);

    const conflict = structuredClone(problemDiscoveryConfig);
    conflict.profiles.push({
      ...structuredClone(conflict.profiles[0]!),
      source_id: "source:other",
      area: { key: "biology", name: "Biology" },
      hubs: [{ key: "erdos-problems", name: "Different label" }],
    });
    expect(() => parseProblemDiscoveryConfig(conflict)).toThrow(/Hub keys must have one label and one scientific area/u);
  });
});
