import { describe, expect, test } from "bun:test";
import { canonicalJson, sha256 } from "./canonical";
import { createNativeSourceRecord, type NativeSourceRecord } from "./math-sources";
import {
  candidateProblemIdentity,
  parseProblemResolutionConfig,
  problemResolutionConfig,
  problemResolutionConfigRoot,
  problemResolutionSourcesForNamespace,
  reviewedProblemBindingOccurrences,
  resolveProblemSources,
} from "./problem-resolution";

const observationRoot = sha256("synthetic observation");

function record(input: {
  source_id: string;
  native_id: string;
  native_kind: string;
  metadata?: Record<string, string | number | boolean | null>;
  summary?: string | null;
  content_root?: `sha256:${string}`;
}): NativeSourceRecord {
  const metadata = input.metadata ?? {};
  const created = createNativeSourceRecord({
    schema: "vela.math-native-record.v1",
    observation_root: observationRoot,
    native_revision: "fixture-v1",
    title: input.native_id,
    summary: input.summary ?? null,
    locators: [{ locator_id: "native-1", kind: "artifact", url: `https://example.test/${encodeURIComponent(input.native_id)}` }],
    metadata,
    metadata_root: sha256(canonicalJson(metadata)),
    content_root: input.content_root ?? sha256(input.summary ?? input.native_id),
    availability: "reference_only",
    ...input,
  });
  return created;
}

function configuredOccurrence(sourceId: string, nativeId: string) {
  const occurrence = problemResolutionConfig.entities.flatMap((entity) => [entity.canonical_occurrence, ...entity.reviewed_occurrences])
    .find(({ source_id, native_id }) => source_id === sourceId && native_id === nativeId);
  if (!occurrence) throw new Error(`missing configured fixture ${sourceId}/${nativeId}`);
  return occurrence;
}

const erdos321 = () => record({ source_id: "source:erdos-problems", native_id: "erdos:321", native_kind: "problem", metadata: { problem_number: 321 }, content_root: configuredOccurrence("source:erdos-problems", "erdos:321").content_root });
const formal321 = () => record({ source_id: "source:formal-conjectures", native_id: "Erdos321.erdos_321", native_kind: "formal_conjecture", summary: "Formal statement", metadata: {}, content_root: configuredOccurrence("source:formal-conjectures", "Erdos321.erdos_321").content_root });
const vibe321 = () => record({ source_id: "source:vibemathed", native_id: "vibemathed:erdos-321", native_kind: "attributed_activity", summary: "Attributed source statement", metadata: { problem_number: 321, resolution: "resolved", verification: "site-confirmed" }, content_root: configuredOccurrence("source:vibemathed", "vibemathed:erdos-321").content_root });

describe("reviewed Problem source resolver", () => {
  test("roots the config and distinguishes occurrences, statements, relations and candidates", () => {
    expect(problemResolutionConfigRoot).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(problemResolutionConfig.entities).toHaveLength(5);
    expect(problemResolutionConfig.entities.reduce((sum, entity) => sum + entity.reviewed_occurrences.length + 1, 0)).toBe(32);
    const extraFormal = record({ source_id: "source:formal-conjectures", native_id: "Erdos321.unreviewed_variant", native_kind: "formal_conjecture", summary: "Unreviewed variant", metadata: {} });
    const reviewed = problemResolutionConfig.entities.find(({ problem_number }) => problem_number === 321)!.reviewed_occurrences.map((occurrence) => (
      occurrence.native_id === "Erdos321.erdos_321" ? formal321()
        : occurrence.native_id === "vibemathed:erdos-321" ? vibe321()
        : record({ source_id: occurrence.source_id, native_id: occurrence.native_id, native_kind: occurrence.native_kind, summary: `Formal statement ${occurrence.native_id}`, metadata: {}, content_root: occurrence.content_root })
    ));
    const input = [erdos321(), ...reviewed, extraFormal];
    const resolved = resolveProblemSources(input[0]!, input);

    expect(resolved.entity).toMatchObject({
      entity_id: "problem:erdos:321",
      identity_claim: "navigation_group_only",
      authority_effect: "none",
    });
    expect(resolved.occurrences.find(({ native_id }) => native_id === extraFormal.native_id)).toMatchObject({
      occurrence_status: "candidate_number_link",
      relation_kind: null,
      statement_identity: "not_established",
      authority_effect: "none",
    });
    expect(resolved.relations.map(({ kind }) => kind)).toContain("formal_statement_reference");
    expect(resolved.relations.every(({ statement_identity, equivalence, authority_effect }) => (
      statement_identity === "not_established" && equivalence === "not_established" && authority_effect === "none"
    ))).toBe(true);
    expect(resolved.statements.map(({ text }) => text)).toContain("Formal statement");
    expect(resolved.statements.map(({ text }) => text)).toContain("Unreviewed variant");
    expect(resolved.statements.map(({ text }) => text)).toContain("Attributed source statement");
    expect(resolved.semantics).toEqual(problemResolutionConfig.semantics);
    expect(resolved.statements.every(({ statement_identity, authority_effect }) => statement_identity === "not_established" && authority_effect === "none")).toBe(true);
    expect(JSON.stringify(resolved.statements[0])).not.toMatch(/standing|verification|decision/iu);

    const fromReviewedFormal = resolveProblemSources(formal321(), input);
    expect(fromReviewedFormal.entity?.entity_id).toBe(resolved.entity?.entity_id);
    expect(fromReviewedFormal.relations).toHaveLength(resolved.relations.length);
    expect(fromReviewedFormal.occurrences.find(({ native_id }) => native_id === formal321().native_id)?.occurrence_status).toBe("canonical_anchor");
  });

  test("extracts Formal and metadata numbers but not unrelated records", () => {
    expect(candidateProblemIdentity(formal321())).toEqual({ resolution_namespace: "erdos-problems", problem_number: 321 });
    expect(candidateProblemIdentity(vibe321())).toEqual({ resolution_namespace: "erdos-problems", problem_number: 321 });
    expect(candidateProblemIdentity(record({ source_id: "source:formal-conjectures", native_id: "Other.321", native_kind: "formal_conjecture" }))).toBeNull();
  });

  test("exposes only rooted reviewed occurrences for a Repository Claim join", () => {
    const bindingOccurrences = reviewedProblemBindingOccurrences(erdos321());
    expect(bindingOccurrences).toContainEqual(expect.objectContaining({
      source_id: "source:erdos-problems",
      native_id: "erdos:321",
      native_kind: "problem",
      relation_kind: null,
    }));
    expect(bindingOccurrences).toContainEqual(expect.objectContaining({
      source_id: "source:formal-conjectures",
      native_id: "Erdos321.erdos_321",
      native_kind: "formal_conjecture",
      relation_kind: "formal_statement_reference",
    }));
    expect(bindingOccurrences.every(({ content_root }) => /^sha256:[0-9a-f]{64}$/u.test(content_root))).toBe(true);

    const unavailable887 = record({
      source_id: "source:erdos-problems",
      native_id: "erdos:887",
      native_kind: "problem",
      metadata: { problem_number: 887 },
    });
    expect(reviewedProblemBindingOccurrences(unavailable887)).toEqual([expect.objectContaining({
      source_id: "source:erdos-problems",
      native_id: "erdos:887",
      relation_kind: null,
    })]);
  });

  test("refuses reviewed canonical occurrence drift before producing join identities", () => {
    expect(() => reviewedProblemBindingOccurrences({ ...erdos321(), content_root: sha256("drift") }))
      .toThrow(/drifted from reviewed resolver bytes/u);
  });

  test("resolves a synthetic non-math source set through the same occurrence model", () => {
    const canonical = record({ source_id: "source:biology-catalog", native_id: "biology:17", native_kind: "research_question", summary: "Does intervention X alter phenotype Y?", metadata: { problem_number: 17 } });
    const activity = record({ source_id: "source:biology-activity", native_id: "experiment:17", native_kind: "experiment_record", summary: "An attributed experiment record", metadata: { problem_number: 17 } });
    const config = parseProblemResolutionConfig({
      schema: "vela.problem-resolution.v1",
      semantics: problemResolutionConfig.semantics,
      candidate_sources: [
        {
          source_id: "source:biology-catalog",
          resolution_namespace: "biology-questions",
          label: "Biology catalogue",
          source_role: "problem_catalog",
          native_kinds: ["research_question"],
          number_extraction: { kind: "metadata_integer", key: "problem_number" },
          statement_retention: "summary",
        },
        {
          source_id: "source:biology-activity",
          resolution_namespace: "biology-questions",
          label: "Biology activity",
          source_role: "attributed_activity_catalog",
          native_kinds: ["experiment_record"],
          number_extraction: { kind: "metadata_integer", key: "problem_number" },
          statement_retention: "summary",
        },
      ],
      entities: [{
        entity_id: "problem:biology:17",
        resolution_namespace: "biology-questions",
        label: "Biology question 17",
        problem_number: 17,
        canonical_occurrence: { source_id: "source:biology-catalog", native_id: "biology:17", native_kind: "research_question", content_root: canonical.content_root },
        reviewed_occurrences: [{ source_id: "source:biology-activity", native_id: "experiment:17", native_kind: "experiment_record", content_root: activity.content_root, relation_kind: "attributed_activity_reference" }],
      }],
    });
    const resolved = resolveProblemSources(canonical, [canonical, activity], config);
    expect(resolved).toMatchObject({ resolution_namespace: "biology-questions" });
    expect(resolved.entity).toMatchObject({ entity_id: "problem:biology:17", resolution_namespace: "biology-questions", authority_effect: "none" });
    expect(resolved.relations).toEqual([expect.objectContaining({ kind: "attributed_activity_reference", statement_identity: "not_established", equivalence: "not_established" })]);
    expect(resolved.resolver_root).toBe(sha256(canonicalJson(config)));
  });

  test("keeps equal numbers in different resolver namespaces independent", () => {
    const biology = record({ source_id: "source:biology-catalog", native_id: "biology:321", native_kind: "research_question", metadata: { problem_number: 321 } });
    const experiment = record({ source_id: "source:biology-activity", native_id: "experiment:321", native_kind: "experiment_record", metadata: { problem_number: 321 } });
    const configInput = structuredClone(problemResolutionConfig);
    configInput.candidate_sources.push(
      {
        source_id: "source:biology-catalog",
        resolution_namespace: "biology-questions",
        label: "Biology catalogue",
        source_role: "problem_catalog",
        native_kinds: ["research_question"],
        number_extraction: { kind: "metadata_integer", key: "problem_number" },
        statement_retention: "summary",
      },
      {
        source_id: "source:biology-activity",
        resolution_namespace: "biology-questions",
        label: "Biology activity",
        source_role: "attributed_activity_catalog",
        native_kinds: ["experiment_record"],
        number_extraction: { kind: "metadata_integer", key: "problem_number" },
        statement_retention: "summary",
      },
    );
    configInput.entities.push({
      entity_id: "problem:biology:321",
      resolution_namespace: "biology-questions",
      label: "Biology question 321",
      problem_number: 321,
      canonical_occurrence: { source_id: "source:biology-catalog", native_id: "biology:321", native_kind: "research_question", content_root: biology.content_root },
      reviewed_occurrences: [{ source_id: "source:biology-activity", native_id: "experiment:321", native_kind: "experiment_record", content_root: experiment.content_root, relation_kind: "attributed_activity_reference" }],
    });
    const config = parseProblemResolutionConfig(configInput);
    const biologyResolved = resolveProblemSources(biology, [biology, experiment], config);
    expect(biologyResolved).toMatchObject({ resolution_namespace: "biology-questions" });
    expect(biologyResolved.entity?.entity_id).toBe("problem:biology:321");
    expect(problemResolutionSourcesForNamespace("biology-questions", config).map(({ source_id }) => source_id)).toEqual([
      "source:biology-catalog",
      "source:biology-activity",
    ]);
    expect(problemResolutionSourcesForNamespace("erdos-problems", config).map(({ source_id }) => source_id)).not.toContain("source:biology-catalog");
    expect(() => resolveProblemSources(erdos321(), [erdos321(), biology], config)).toThrow(/conflicts with resolution identity erdos-problems\/321/u);
  });

  test("keeps an unreviewed canonical anchor separate from number candidates", () => {
    const canonical = record({ source_id: "source:erdos-problems", native_id: "erdos:999", native_kind: "problem", metadata: { problem_number: 999 } });
    const attributed = record({ source_id: "source:vibemathed", native_id: "vibemathed:erdos-999", native_kind: "attributed_activity", summary: "Attributed activity", metadata: { problem_number: 999 } });
    const resolved = resolveProblemSources(canonical, [canonical, attributed]);
    expect(resolved.entity).toBeNull();
    expect(resolved.relations).toEqual([]);
    expect(resolved.identity_events).toEqual([]);
    expect(resolved.occurrences.find(({ native_id }) => native_id === canonical.native_id)?.occurrence_status).toBe("canonical_anchor");
    expect(resolved.occurrences.find(({ native_id }) => native_id === attributed.native_id)?.occurrence_status).toBe("candidate_number_link");
  });

  test("fails closed on missing reviewed records, duplicate rows and conflicting numbers", () => {
    expect(() => resolveProblemSources(erdos321(), [erdos321(), formal321(), vibe321()])).toThrow(/missing reviewed occurrence/u);
    const unreviewed = record({ source_id: "source:erdos-problems", native_id: "erdos:999", native_kind: "problem", metadata: { problem_number: 999 } });
    expect(() => resolveProblemSources(unreviewed, [unreviewed, unreviewed])).toThrow(/duplicate occurrence/u);
    const conflict = record({ source_id: "source:vibemathed", native_id: "vibemathed:wrong", native_kind: "attributed_activity", metadata: { problem_number: 998 } });
    expect(() => resolveProblemSources(unreviewed, [unreviewed, conflict])).toThrow(/conflicts with resolution identity/u);
    expect(() => resolveProblemSources(erdos321(), [erdos321(), { ...formal321(), content_root: sha256("rewritten same ID") }, ...problemResolutionConfig.entities.find(({ problem_number }) => problem_number === 321)!.reviewed_occurrences.slice(1).map((occurrence) => record({ source_id: occurrence.source_id, native_id: occurrence.native_id, native_kind: occurrence.native_kind, metadata: occurrence.source_id === "source:vibemathed" ? { problem_number: 321 } : {}, content_root: occurrence.content_root }))])).toThrow(/content root drifted/u);
  });

  test("does not promote Formal or VibeMathed source labels to Standing", () => {
    const canonical = record({ source_id: "source:erdos-problems", native_id: "erdos:999", native_kind: "problem", metadata: { problem_number: 999 } });
    const formal = record({ source_id: "source:formal-conjectures", native_id: "Erdos999.formal", native_kind: "formal_conjecture", summary: "A formal statement", metadata: { category: "proved" } });
    const vibe = record({ source_id: "source:vibemathed", native_id: "vibemathed:999", native_kind: "attributed_activity", summary: "An activity record", metadata: { problem_number: 999, resolution: "resolved", verification: "site-confirmed" } });
    const serialized = JSON.stringify(resolveProblemSources(canonical, [canonical, formal, vibe]));
    expect(serialized).not.toMatch(/standing|site-confirmed|"resolved"|"proved"/iu);
    expect(serialized).toContain("candidate_number_link");
  });

  test("refuses duplicate reviewed identity and relation/source-role conflicts at config load", () => {
    const duplicate = structuredClone(problemResolutionConfig);
    duplicate.entities[1]!.reviewed_occurrences.push(structuredClone(duplicate.entities[0]!.reviewed_occurrences[0]!));
    expect(() => parseProblemResolutionConfig(duplicate)).toThrow(/reviewed occurrences must be globally unique/u);

    const conflict = structuredClone(problemResolutionConfig);
    conflict.entities[0]!.reviewed_occurrences[0]!.relation_kind = "proof_manifest_reference";
    expect(() => parseProblemResolutionConfig(conflict)).toThrow(/reviewed relation must match the Source role/u);
  });
});
