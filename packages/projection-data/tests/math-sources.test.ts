import { describe, expect, test } from "bun:test";
import {
  bindMathSourceObservationToDeclaration,
  createRepositorySourceBinding,
  createMathSourceObservation,
  createMathSourceObservationBundle,
  createMathSourceRegistryRelease,
  createNativeSourceRecord,
  createReleaseSource,
  mathSourceDeclarationSchema,
  mathSourceObservationSchema,
  mathSourceRegistry,
  mathSourceRegistrySchema,
  sourceDeclarationRows,
} from "../src/math-sources";
import { canonicalJson, sha256 } from "../src/canonical";
import { formalConjecturesAuditProjection } from "../src/formal-conjectures-audit";
import { repositoryRegistry, repositorySlugs, repositoryIdSchema } from "../src/registry";

const root = (character: string) => `sha256:${character.repeat(64)}` as const;
const releaseA = root("a");
const releaseB = root("b");

function observation() {
  return createMathSourceObservation({
    source_id: "source:erdos-problems",
    observation_id: "observation:erdos-problems:2026-07-30",
    acquisition_root: root("1"),
    observed_at: "2026-07-30T12:01:00Z",
    native_revision: {
      kind: "git",
      value: "eacd0368a2428663dff6999b17921706137217e4",
      tree: "1".repeat(40),
      content_root: root("1"),
    },
    snapshot_root: null,
    snapshot_state: "content_root_only",
    projected_record_count: 1217,
    projected_records_root: root("2"),
    coverage: {
      status: "complete",
      included: ["All 1,217 records in the exact retained problems.yaml observation"],
      native_record_count: 1217,
      projected_record_count: 1217,
    },
    omissions: [{
      code: "website_chrome_excluded",
      description: "Presentation outside the retained data observation is not projected.",
    }],
  });
}

function nativeRecord() {
  const metadata = { problem_number: 1056 };
  return createNativeSourceRecord({
    schema: "vela.math-native-record.v1",
    source_id: "source:erdos-problems",
    observation_root: observation().observation_root,
    native_id: "1056",
    native_kind: "problem",
    native_revision: "eacd0368a2428663dff6999b17921706137217e4",
    title: "Erdős problem 1056",
    summary: "A bounded exact problem statement.",
    locators: [{
      locator_id: "problem",
      kind: "homepage",
      url: "https://www.erdosproblems.com/1056",
    }],
    metadata,
    metadata_root: sha256(canonicalJson(metadata)),
    content_root: null,
    availability: "reference_only",
  });
}

function binding(releaseRoot = releaseA) {
  const record = nativeRecord();
  return createRepositorySourceBinding({
    schema: "vela.repository-source-binding.v1",
    release_root: releaseRoot,
    repository_id: "123e4567-e89b-42d3-a456-426614174000",
    binding_id: "binding:erdos:1056",
    source_id: "source:erdos-problems",
    observation_root: observation().observation_root,
    native_id: "1056",
    native_record_root: record.row_root,
    binding_kind: "reference",
    repository_object_kind: "claim",
    repository_object_id: "vcl_123",
    repository_object_root: root("4"),
    local_standing_effect: "none",
  });
}

function releaseSource(
  releaseRoot = releaseA,
  nativeRecordCount = 1,
  repositoryBindingCount = 1,
) {
  const observed = observation();
  return createReleaseSource({
    schema: "vela.math-release-source.v1",
    release_root: releaseRoot,
    source_id: observed.source_id,
    declaration_root: observed.declaration_root,
    observation_root: observed.observation_root,
    native_record_count: nativeRecordCount,
    repository_binding_count: repositoryBindingCount,
  });
}

describe("checked Math source declarations", () => {
  test("takes its Repository vocabulary from the registry", () => {
    /* The registry parse rejects an entry whose slug is missing from the list;
       this is the other direction, where the list keeps a Repository the registry
       has dropped. */
    expect([...repositorySlugs]).toEqual(repositoryRegistry.repositories.map(({ slug }) => slug));
  });

  test("accepts only canonical lowercase RFC 9562 UUIDv4 repository identities", () => {
    expect(repositoryIdSchema.safeParse("123e4567-e89b-42d3-a456-426614174000").success).toBe(true);
    for (const invalid of [
      "123E4567-E89B-42D3-A456-426614174000",
      "123e4567-e89b-72d3-a456-426614174000",
      "123e4567-e89b-42d3-7456-426614174000",
      "vrepo_0123456789abcdef0123456789abcdef",
      "123e4567e89b42d3a456426614174000",
    ]) {
      expect(repositoryIdSchema.safeParse(invalid).success, invalid).toBe(false);
    }
  });

  test("covers the declared native sources and bounded research releases", () => {
    expect(mathSourceRegistrySchema.parse(mathSourceRegistry)).toEqual(mathSourceRegistry);
    expect(mathSourceRegistry.sources.map(({ source_id }) => source_id)).toEqual([
      "source:erdos-problems",
      "source:openai-ten-proofs",
      "source:formal-conjectures",
      "source:formal-conjectures-pr-audit",
      "source:physlib",
      "source:plby-lean-proofs",
      "source:jayyhk-erdos-lean",
      "source:alphaproof-nexus-results",
      "source:williamjblair-lean-proofs",
      "source:erdos-ai-contributions-wiki",
      "source:gpt-erdos",
      "source:vibemathed",
      "source:oeis-a309370",
      "source:palomar-registry",
      "source:codetables-stabilizer",
    ]);
    expect(new Set(
      mathSourceRegistry.sources.flatMap(({ coverage }) => coverage.repository_slugs),
    )).toEqual(new Set(["math"]));
    expect(mathSourceRegistry.sources.find(
      ({ source_id }) => source_id === "source:plby-lean-proofs",
    )?.adapter.mode).toBe("exact_git_checkout");
    const audit = mathSourceRegistry.sources.find(
      ({ source_id }) => source_id === "source:formal-conjectures-pr-audit",
    );
    expect(audit).toMatchObject({
      source_kind: "frozen_reference",
      rights: {
        status: "declared",
        license_expression: "Apache-2.0",
        access: "public",
      },
      snapshot_policy: {
        mode: "reference_only",
        retention: "none",
      },
    });
    expect(audit?.locators.find(({ locator_id }) => locator_id === "audit-packet")?.url)
      .toContain(formalConjecturesAuditProjection.source.commit);
    expect(audit?.coverage.included).toContain(
      `The public audit package identity at commit ${formalConjecturesAuditProjection.source.commit} and tree ${formalConjecturesAuditProjection.source.tree}`,
    );
    /* CC0 registry metadata is what authorizes `retained_exact_bytes` here, and
       the declaration must keep restating the semantic-loss classes the frozen
       Palomar contract names — external standing above all. */
    const palomar = mathSourceRegistry.sources.find(
      ({ source_id }) => source_id === "source:palomar-registry",
    );
    expect(palomar).toMatchObject({
      source_kind: "formal_library",
      rights: {
        status: "declared",
        license_expression: "CC0-1.0",
        redistribution: "full_under_license",
      },
      snapshot_policy: {
        mode: "retained_exact_bytes",
        retention: "immutable_artifact",
      },
      adapter: {
        adapter_id: "problems-data/palomar-registry",
        mode: "networked_acquisition",
      },
    });
    for (const code of [
      "palomar_status_is_external_standing",
      "palomar_nonclaims_are_registry_level",
      "palomar_mechanical_pass_is_one_scoped_check",
      "palomar_review_is_llm_under_policy",
      "palomar_consent_is_asserted_relationship",
      "palomar_admission_process_unobservable",
      "palomar_version_relation_reconstructed",
      "palomar_entry_bytes_not_provider_signed",
      "palomar_challenge_render_not_archived",
      "palomar_evidence_tree_not_archived",
    ]) {
      expect(
        palomar?.coverage.omissions.map((omission) => omission.code),
        code,
      ).toContain(code);
    }
  });

  test("bind every declaration, adapter, attribution, locator, right, and omission", () => {
    for (const source of mathSourceRegistry.sources) {
      expect(source.declaration_root).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(source.adapter.adapter_root).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(source.locators.length).toBeGreaterThan(0);
      expect(source.attributed_claims.length).toBeGreaterThan(0);
      expect(source.rights.basis).not.toBe("");
      expect(source.snapshot_policy.reason).not.toBe("");
      expect(source.coverage.included.length).toBeGreaterThan(0);
      expect(source.coverage.omissions.length).toBeGreaterThan(0);
    }
    expect(sourceDeclarationRows()).toHaveLength(mathSourceRegistry.sources.length);
  });

  test("fails closed when unknown rights are widened or silently snapshotted", () => {
    const source = mathSourceRegistry.sources.find(
      ({ source_id }) => source_id === "source:erdos-problems",
    )!;
    const widened = mathSourceDeclarationSchema.safeParse({
      ...source,
      rights: { ...source.rights, redistribution: "full_under_license" },
    });
    expect(widened.success).toBe(false);
    expect(
      widened.error?.issues.some(({ message }) => message.includes("reference-only")),
    ).toBe(true);

    const snapshotted = mathSourceDeclarationSchema.safeParse({
      ...source,
      snapshot_policy: {
        ...source.snapshot_policy,
        mode: "retained_exact_bytes",
        retention: "immutable_artifact",
      },
    });
    expect(snapshotted.success).toBe(false);
    expect(
      snapshotted.error?.issues.some(({ message }) => message.includes("retained source bytes")),
    ).toBe(true);
  });
});

describe("adapter and offline observation boundary", () => {
  test("keeps offline observation free of fetch state and operational failures", () => {
    const observed = observation();
    expect(mathSourceObservationSchema.parse(observed)).toEqual(observed);
    expect(observed).not.toHaveProperty("acquired_at");
    expect(observed).not.toHaveProperty("locators");
    expect(observed).not.toHaveProperty("last_failed_ingestion");
    expect(mathSourceObservationSchema.safeParse({
      ...observed,
      acquired_at: "2026-07-30T12:00:00Z",
    }).success).toBe(false);
  });

  test("fails closed on snapshot-policy, source-root, and projected-count drift", () => {
    const observed = observation();
    expect(mathSourceObservationSchema.safeParse({
      ...observed,
      snapshot_state: "retained_exact_bytes",
      snapshot_root: root("6"),
    }).success).toBe(false);
    expect(mathSourceObservationSchema.safeParse({
      ...observed,
      declaration_root: root("7"),
    }).success).toBe(false);
    expect(mathSourceObservationSchema.safeParse({
      ...observed,
      projected_record_count: 1216,
    }).success).toBe(false);
  });

  test("binds historical observations to their retained declaration", () => {
    const observed = observation();
    const currentDeclaration = mathSourceRegistry.sources.find(
      ({ source_id }) => source_id === observed.source_id,
    )!;
    const {
      declaration_root: _currentDeclarationRoot,
      ...currentDeclarationBody
    } = currentDeclaration;
    const historicalDeclarationBody = {
      ...currentDeclarationBody,
      publisher_or_maintainer: `${currentDeclaration.publisher_or_maintainer} (historical)`,
    };
    const historicalDeclaration = mathSourceDeclarationSchema.parse({
      ...historicalDeclarationBody,
      declaration_root: sha256(canonicalJson(historicalDeclarationBody)),
    });
    const {
      observation_root: _currentObservationRoot,
      ...currentObservationBody
    } = observed;
    const historicalObservationBody = {
      ...currentObservationBody,
      declaration_root: historicalDeclaration.declaration_root,
    };
    const historicalObservation = mathSourceObservationSchema.parse({
      ...historicalObservationBody,
      observation_root: sha256(canonicalJson(historicalObservationBody)),
    });

    expect(bindMathSourceObservationToDeclaration(
      historicalObservation,
      historicalDeclaration,
    )).toEqual(historicalObservation);
    expect(() => bindMathSourceObservationToDeclaration(
      historicalObservation,
      currentDeclaration,
    )).toThrow("observation does not bind its retained source declaration");
  });
});

describe("release-scoped source projection rows", () => {
  test("keeps content roots stable when only the release scope changes", () => {
    expect(observation().observation_root).toBe(observation().observation_root);
    expect(nativeRecord().row_root).toBe(nativeRecord().row_root);
    expect(binding(releaseA).binding_root).toBe(binding(releaseB).binding_root);
    expect(releaseSource(releaseA).release_source_root).toBe(
      releaseSource(releaseB).release_source_root,
    );

    const bundleA = createMathSourceObservationBundle({
      release_root: releaseA,
      observations: [observation()],
      native_records: [nativeRecord()],
      release_sources: [releaseSource(releaseA)],
      repository_bindings: [binding(releaseA)],
    });
    const bundleB = createMathSourceObservationBundle({
      release_root: releaseB,
      observations: [observation()],
      native_records: [nativeRecord()],
      release_sources: [releaseSource(releaseB)],
      repository_bindings: [binding(releaseB)],
    });
    expect(bundleA.observation_bundle_root).toBe(bundleB.observation_bundle_root);
  });

  test("rejects cross-release release bindings and dangling observations", () => {
    expect(() => createMathSourceObservationBundle({
      release_root: releaseA,
      observations: [observation()],
      native_records: [nativeRecord()],
      release_sources: [releaseSource(releaseB)],
      repository_bindings: [],
    })).toThrow("belongs to another release");
    expect(() => createMathSourceObservationBundle({
      release_root: releaseA,
      observations: [],
      native_records: [nativeRecord()],
      release_sources: [],
      repository_bindings: [],
    })).toThrow("absent observation");
  });

  test("rejects duplicate rows, dangling native bindings, and unrooted available records", () => {
    expect(() => createNativeSourceRecord({
      schema: "vela.math-native-record.v1",
      source_id: "source:erdos-problems",
      observation_root: observation().observation_root,
      native_id: "1056",
      native_kind: "problem",
      native_revision: "eacd0368a2428663dff6999b17921706137217e4",
      title: "Erdős problem 1056",
      summary: null,
      locators: [],
      metadata: {},
      metadata_root: sha256(canonicalJson({})),
      content_root: null,
      availability: "available",
    })).toThrow("require an exact content root");

    expect(() => createMathSourceObservationBundle({
      release_root: releaseA,
      observations: [observation(), observation()],
      native_records: [],
      release_sources: [],
      repository_bindings: [],
    })).toThrow("identities must be unique");

    expect(() => createMathSourceObservationBundle({
      release_root: releaseA,
      observations: [observation()],
      native_records: [],
      release_sources: [releaseSource(releaseA, 0, 1)],
      repository_bindings: [binding()],
    })).toThrow("absent native record");
  });

  test("emits the compact manifest summary expected by the current deployment", () => {
    const bundle = createMathSourceObservationBundle({
      release_root: releaseA,
      observations: [observation()],
      native_records: [nativeRecord()],
      release_sources: [releaseSource()],
      repository_bindings: [binding()],
    });
    expect(createMathSourceRegistryRelease(bundle)).toEqual({
      schema: "vela.math-source-registry-release.v1",
      declaration_root: mathSourceRegistry.declaration_root,
      observation_bundle_root: bundle.observation_bundle_root,
      source_count: 15,
      observation_count: 1,
      native_record_count: 1,
      release_source_count: 1,
      repository_binding_count: 1,
    });
  });
});
