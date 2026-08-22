import { describe, expect, test } from "bun:test";
import {
  buildPluralAuthorityRegistry,
  pluralAuthorityReferenceProjection,
  pluralAuthorityReferenceSource,
} from "../src/plural-authority";

function fixture() {
  return structuredClone(pluralAuthorityReferenceSource);
}

describe("plural-authority registry projection", () => {
  test("preserves the same portable input and divergent Repository-local outcomes", () => {
    const view = pluralAuthorityReferenceProjection;
    expect(view.source_root).toBe("sha256:38827057cca6161e9decd9ed9ca3408f12b81e1f237293a6903adb893613a325");
    expect(view.projection_root).toBe("sha256:087ffd92fa2ebc56e88f1b5e304bc4ed07c45b96e987e65be391ec780e184709");
    expect(view.protocol_source.reader.version).toBe("0.977.4");
    expect(view.protocol_source.reader.binary_sha256).toBe(
      "sha256:06f912d107d29e4ce1dadd19bf7ef849ec42d7e62cbc9332c9807e6b8c9bd05e",
    );
    expect(view.portable_submission.submission_root).toBe(
      "sha256:f1669cdfa498ff85c162bce6173f04b39cdf7620fb198a19b45f6d932302204a",
    );
    expect(view.repositories.map(({ decision }) => decision.status).sort()).toEqual(["accepted", "rejected"]);
    expect(view.repositories.map(({ local_standing }) => local_standing).sort()).toEqual(["accepted", "unassessed"]);
    expect(new Set(view.repositories.map(({ source }) => source.repository_root)).size).toBe(2);
    expect(new Set(view.repositories.map(({ source }) => source.authority_keyset_root)).size).toBe(2);
    expect(view.repositories.every(
      ({ source }) => source.ingested_submission_root === view.portable_submission.submission_root,
    )).toBe(true);
    expect(new Set(view.repositories.map(({ decision }) => decision.principal_id)).size).toBe(2);
    expect(view.repositories.map(({ source }) => source.evidence_root).sort()).toEqual([
      "sha256:da0b7a5edda4912b3c5397f0025b7eeaabc395a66915cba5db4fa2936872cac4",
      "sha256:fcff42697c5f5cb09fa1274196e41af60ca87bbcaf0dc2d50b0c052b291794bd",
    ]);
  });

  test("fails closed on authority leakage", () => {
    const source = fixture() as unknown as Record<string, unknown>;
    source.authority_effect = "standing";
    expect(() => buildPluralAuthorityRegistry(source)).toThrow();

    const extra = fixture() as unknown as Record<string, unknown>;
    extra.signing_key = "global-key";
    expect(() => buildPluralAuthorityRegistry(extra)).toThrow();
  });

  test("has no global-consensus or aggregate-Standing inference surface", () => {
    const source = fixture() as unknown as Record<string, unknown>;
    source.global_consensus = "accepted";
    expect(() => buildPluralAuthorityRegistry(source)).toThrow();

    const encoded = JSON.stringify(pluralAuthorityReferenceProjection);
    expect(encoded).not.toContain("global_consensus");
    expect(encoded).not.toContain("aggregate_standing");
    expect(pluralAuthorityReferenceProjection.authority_effect).toBe("none");
  });

  test("surfaces stale exact roots and stops before interpretation", () => {
    const source = fixture();
    const accepted = source.repositories.find(({ local_standing }) => local_standing === "accepted")!;
    const currentRoots = { [accepted.repository_id]: `sha256:${"f".repeat(64)}` };
    const stale = buildPluralAuthorityRegistry(source, currentRoots);
    const staleRepository = stale.repositories.find(({ repository_id }) => repository_id === accepted.repository_id)!;
    expect(staleRepository.source.stale).toBe(true);
    const member = stale.frontiers.flatMap(({ members }) => members)
      .find(({ repository_id }) => repository_id === accepted.repository_id)!;
    expect(member.safe_next_action).toContain("Refresh this Repository");
  });

  test("refuses cross-Repository Standing transport", () => {
    const source = fixture();
    const accepted = source.repositories.find(({ decision }) => decision.status === "accepted")!;
    const rejected = source.repositories.find(({ decision }) => decision.status === "rejected")!;
    rejected.local_standing = "accepted";
    expect(() => buildPluralAuthorityRegistry(source)).toThrow();

    const sharedDecision = fixture();
    const [left, right] = sharedDecision.repositories;
    right!.decision.decision_record_root = left!.decision.decision_record_root;
    expect(() => buildPluralAuthorityRegistry(sharedDecision)).toThrow();
    expect(accepted.repository_id).not.toBe(rejected.repository_id);
  });

  test("refuses portable-input substitution inside either Repository history", () => {
    const source = fixture();
    source.repositories[1]!.ingested_submission_root = `sha256:${"7".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(source)).toThrow();
  });

  test("refuses correction omission and predecessor-root substitution", () => {
    const omitted = fixture() as unknown as Record<string, unknown>;
    delete omitted.correction;
    expect(() => buildPluralAuthorityRegistry(omitted)).toThrow();

    const substituted = fixture();
    substituted.correction.downstream_work[0]!.basis_claim_root = `sha256:${"0".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(substituted)).toThrow("synthetic correction packet root drift");
  });

  test("fails closed on reader version, binary, projection, and bundle-root substitution", () => {
    const version = fixture() as unknown as { protocol_source: { reader: { version: string } } };
    version.protocol_source.reader.version = "0.977.3";
    expect(() => buildPluralAuthorityRegistry(version)).toThrow();

    const binary = fixture();
    binary.protocol_source.reader.binary_sha256 = `sha256:${"a".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(binary)).toThrow("Repository evidence reader identity drift");

    const projection = fixture();
    projection.repositories[0]!.replay_projection_root = `sha256:${"b".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(projection)).toThrow("Repository projection binding drift");

    const bundle = fixture();
    bundle.repositories[0]!.bundle_root = `sha256:${"c".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(bundle)).toThrow("Repository bundle root drift");
  });

  test("fails closed on Decision, Event, principal, performer, Standing, and Repository substitution", () => {
    const mutations: Array<(source: ReturnType<typeof fixture>) => void> = [
      (source) => { source.repositories[0]!.decision.decision_record_root = `sha256:${"1".repeat(64)}`; },
      (source) => { source.repositories[0]!.decision.event_root = `sha256:${"2".repeat(64)}`; },
      (source) => { source.repositories[0]!.decision.principal_id = "local:substituted"; },
      (source) => { source.repositories[0]!.decision.performer = "agent:substituted"; },
      (source) => { source.repositories[0]!.local_standing = "unassessed"; },
      (source) => { source.repositories[0]!.repository_root = `sha256:${"3".repeat(64)}`; },
    ];
    for (const mutate of mutations) {
      const source = fixture();
      mutate(source);
      expect(() => buildPluralAuthorityRegistry(source)).toThrow();
    }
  });

  test("fails closed on portable object, Proposal, raw Event, and replay substitutions", () => {
    const submission = fixture();
    submission.portable_submission.submission_root = `sha256:${"4".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(submission)).toThrow();

    const artifact = fixture();
    artifact.repositories[0]!.derived_artifact_root = `sha256:${"5".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(artifact)).toThrow();

    const claim = fixture();
    claim.repositories[0]!.derived_claim_root = `sha256:${"6".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(claim)).toThrow();

    const proposal = fixture();
    proposal.repositories[0]!.proposal_root = `sha256:${"7".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(proposal)).toThrow();

    const event = fixture();
    event.repositories[0]!.evidence.raw_records.authority_events[0]!.event_root = `sha256:${"8".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(event)).toThrow("Repository evidence root drift");

    const replay = fixture();
    replay.repositories[0]!.replay.counts.accepted_claims = 0;
    expect(() => buildPluralAuthorityRegistry(replay)).toThrow("Repository replay counts drift");
  });

  test("fails closed on correction successor substitution and Frontier persistence or identity", () => {
    const successor = fixture();
    successor.correction.synthetic_successor.claim_root = `sha256:${"9".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(successor)).toThrow("synthetic correction packet root drift");

    const encoded = JSON.stringify(pluralAuthorityReferenceProjection);
    expect(encoded).not.toContain('"persistence":"repository"');
    expect(pluralAuthorityReferenceProjection.frontiers.every(({ id, query_root }) => id === `frontier:${query_root.slice(7, 23)}`)).toBe(true);
  });

  test("keeps Frontiers derived, discardable, and stable by query identity", () => {
    const source = fixture();
    const first = buildPluralAuthorityRegistry(source);
    const rebuilt = buildPluralAuthorityRegistry(source);
    expect(rebuilt).toEqual(first);
    expect(first.frontiers).toHaveLength(2);
    for (const frontier of first.frontiers) {
      expect(frontier.kind).toBe("derived_query");
      expect(frontier.persistence).toBe("none");
      expect(frontier.rebuildable).toBe(true);
      expect(frontier.authority_effect).toBe("none");
      expect(frontier.id).toBe(`frontier:${frontier.query_root.slice(7, 23)}`);
    }

    const repository = source.repositories[0]!;
    const stale = buildPluralAuthorityRegistry(source, {
      [repository.repository_id]: `sha256:${"9".repeat(64)}`,
    });
    expect(stale.frontiers.map(({ id }) => id)).toEqual(first.frontiers.map(({ id }) => id));
    expect(stale.frontiers.map(({ result_root }) => result_root)).not.toEqual(
      first.frontiers.map(({ result_root }) => result_root),
    );
    expect(source).toEqual(fixture());
  });

  test("keeps the correction seam explicit and bounded", () => {
    const view = pluralAuthorityReferenceProjection;
    expect(view.correction.fixture_class).toBe("synthetic_reference");
    expect(view.correction.integration_seam).toBe("replace_with_real_consequential_correction_packet");
    expect(view.correction.affected_work_count).toBe(2);
    expect(view.correction.unaffected_work_count).toBe(1);
    expect(view.does_not_establish).toContain("a real accepted dependency cascade or external adoption");
  });
});
