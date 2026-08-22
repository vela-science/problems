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
    expect(() => buildPluralAuthorityRegistry(source)).toThrow(
      "local Standing must be reconstructed from that Repository's own Decision",
    );

    const sharedDecision = fixture();
    const [left, right] = sharedDecision.repositories;
    right!.decision.decision_record_root = left!.decision.decision_record_root;
    expect(() => buildPluralAuthorityRegistry(sharedDecision)).toThrow("local Decision records must be distinct");
    expect(accepted.repository_id).not.toBe(rejected.repository_id);
  });

  test("refuses portable-input substitution inside either Repository history", () => {
    const source = fixture();
    source.repositories[1]!.ingested_submission_root = `sha256:${"7".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(source)).toThrow(
      "Repository history does not bind the exact portable input",
    );
  });

  test("refuses correction omission and predecessor-root substitution", () => {
    const omitted = fixture() as unknown as Record<string, unknown>;
    delete omitted.correction;
    expect(() => buildPluralAuthorityRegistry(omitted)).toThrow();

    const substituted = fixture();
    substituted.correction.downstream_work[0]!.basis_claim_root = `sha256:${"0".repeat(64)}`;
    expect(() => buildPluralAuthorityRegistry(substituted)).toThrow(
      "dependent work omitted the exact corrected predecessor root",
    );
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
