import { describe, expect, test } from "bun:test";
import {
  buildSiteObjectContext,
  resolveObjectContextGraphId,
  type ObjectContextEdge,
  type ObjectContextNode,
} from "../src/object-context";
import {
  parseGraphEdgeRecord,
  parseGraphNeighborRecord,
  parseGraphNodeRecord,
} from "../src/read-contracts";

const root = "sha256:1faedc24f040a60a22177b456c74b969a61ce8836082297b1835797a57b4fa56";
const object: ObjectContextNode = {
  id: "vcl_130aa0182cb91b362a44aefda896dc6b71f39273ce6a4052bced4b3d77414364",
  kind: "claim",
  label: "Hosted Lean proof: plby proof of 694 (state conditional).",
  plane: "state",
  trust: "signed",
  standing: "accepted",
  href: "/repositories/erdos/claims/vcl_130aa0182cb91b362a44aefda896dc6b71f39273ce6a4052bced4b3d77414364",
};
const related: ObjectContextNode[] = [
  {
    id: "erdos:694",
    kind: "problem",
    label: "Erdős 694",
    plane: "reference",
    trust: "declared",
    standing: "recorded",
    href: "/repositories/erdos/problems/694",
  },
  {
    id: "vcl_1c82557ff465e92b6697e43e6ba0b2f8a94652039ffeb2b3dbea382c618b2042",
    kind: "claim",
    label: "Load-bearing condition: Linnik's theorem.",
    plane: "state",
    trust: "signed",
    standing: "accepted",
    href: "/repositories/erdos/claims/vcl_1c82557ff465e92b6697e43e6ba0b2f8a94652039ffeb2b3dbea382c618b2042",
  },
  {
    id: "vcl_878a44fbac8b153c13498ffaad38da3a0b86727691928b6fd135cfe5c8980977",
    kind: "claim",
    label: "Load-bearing condition: Mertens' product theorem.",
    plane: "state",
    trust: "signed",
    standing: "accepted",
    href: "/repositories/erdos/claims/vcl_878a44fbac8b153c13498ffaad38da3a0b86727691928b6fd135cfe5c8980977",
  },
  {
    id: "vcl_f23a8b92c4fe1c3825e4b324ef8d7b8e6fb9792d175e56bebf037ac312eccb37",
    kind: "claim",
    label: "Erdős Problem #694: declared status solved.",
    plane: "state",
    trust: "signed",
    standing: "accepted",
    href: "/repositories/erdos/claims/vcl_f23a8b92c4fe1c3825e4b324ef8d7b8e6fb9792d175e56bebf037ac312eccb37",
  },
  {
    id: "vcl_0dd1f9b55ab0e699c9144d486c265fc0c0c9b6f228a2b7db8605416411b3fc3c",
    kind: "claim",
    label: "AI-contributions wiki claim — wiki: Full solution.",
    plane: "state",
    trust: "signed",
    standing: "accepted",
    href: "/repositories/erdos/claims/vcl_0dd1f9b55ab0e699c9144d486c265fc0c0c9b6f228a2b7db8605416411b3fc3c",
  },
  {
    id: "vcl_b6c2022aeca82d5d5a2f7ebd2363b6528e5e08cbc7c3c573465eeda00005161a",
    kind: "claim",
    label: "Hosted Lean proof: jayyhk proof of 694 (state axiomatic).",
    plane: "state",
    trust: "signed",
    standing: "accepted",
    href: "/repositories/erdos/claims/vcl_b6c2022aeca82d5d5a2f7ebd2363b6528e5e08cbc7c3c573465eeda00005161a",
  },
];

function edge(
  id: string,
  source: string,
  target: string,
  relation: string,
  evidence: string,
): ObjectContextEdge {
  return { id, source, target, relation, trust: "signed", inferred: true, source_root: root, evidence };
}

const edges: ObjectContextEdge[] = [
  edge("edge_describes", object.id, "erdos:694", "describes", "Problem identity derived from the accepted Claim's pinned source anchor."),
  edge("edge_depends_linnik", object.id, "vcl_1c82557ff465e92b6697e43e6ba0b2f8a94652039ffeb2b3dbea382c618b2042", "depends", "Materialized typed link between accepted Claims."),
  edge("edge_depends_mertens", object.id, "vcl_878a44fbac8b153c13498ffaad38da3a0b86727691928b6fd135cfe5c8980977", "depends", "Materialized typed link between accepted Claims."),
  edge("edge_supports", object.id, "vcl_f23a8b92c4fe1c3825e4b324ef8d7b8e6fb9792d175e56bebf037ac312eccb37", "supports", "Materialized typed link between accepted Claims."),
  edge("edge_contradicts", "vcl_0dd1f9b55ab0e699c9144d486c265fc0c0c9b6f228a2b7db8605416411b3fc3c", object.id, "contradicts", "Materialized typed link between accepted Claims."),
  edge("edge_replicates", "vcl_b6c2022aeca82d5d5a2f7ebd2363b6528e5e08cbc7c3c573465eeda00005161a", object.id, "replicates", "Materialized typed link between accepted Claims."),
];

describe("site.object-context.v1", () => {
  test("resolves a current Claim route to its exact imported graph object", () => {
    const claimId = "vcl_9394cc203635d5665c9a91b4f36e5c5281f97c905351c033e2195728765686b6";
    const importedObjectId = "vf_c84f3b9237e811e7";
    const mapping = {
      claim_id: claimId,
      imported_object_id: importedObjectId,
    };

    expect(resolveObjectContextGraphId(claimId, mapping)).toBe(importedObjectId);
    expect(resolveObjectContextGraphId(importedObjectId, mapping)).toBe(importedObjectId);
    expect(resolveObjectContextGraphId("erdos:1056", undefined)).toBe("erdos:1056");
    expect(() => resolveObjectContextGraphId("vcl_unrelated", mapping)).toThrow(
      "does not bind",
    );
    expect(() => resolveObjectContextGraphId(claimId, {
      claim_id: claimId,
      imported_object_id: "",
    })).toThrow("empty imported object id");
  });

  test("groups the exact conditional Erdős Claim relationships without changing their semantics", () => {
    const context = buildSiteObjectContext({
      root,
      repository: "erdos",
      object,
      related,
      edges,
      relationship_total: edges.length,
    });

    expect(context.schema).toBe("site.object-context.v1");
    expect(context.root).toBe(root);
    expect(context.object.id).toBe("vcl_130aa0182cb91b362a44aefda896dc6b71f39273ce6a4052bced4b3d77414364");
    expect(context.relationship_count).toBe(6);
    expect(context.groups.map(({ key, count }) => [key, count])).toEqual([
      ["outgoing:depends", 2],
      ["outgoing:describes", 1],
      ["outgoing:supports", 1],
      ["incoming:contradicts", 1],
      ["incoming:replicates", 1],
    ]);

    const premises = context.groups.find(({ key }) => key === "outgoing:depends");
    expect(premises?.relationships.map(({ related: node }) => node.id)).toEqual([
      "vcl_1c82557ff465e92b6697e43e6ba0b2f8a94652039ffeb2b3dbea382c618b2042",
      "vcl_878a44fbac8b153c13498ffaad38da3a0b86727691928b6fd135cfe5c8980977",
    ]);
    const contradiction = context.groups.find(({ key }) => key === "incoming:contradicts")?.relationships[0];
    expect(contradiction).toMatchObject({
      direction: "incoming",
      relation: "contradicts",
      trust: "signed",
      inferred: true,
      source_root: root,
      evidence: "Materialized typed link between accepted Claims.",
      related: { id: "vcl_0dd1f9b55ab0e699c9144d486c265fc0c0c9b6f228a2b7db8605416411b3fc3c" },
    });
  });

  test("fails closed on an unrelated edge or missing related object", () => {
    expect(() => buildSiteObjectContext({
      root,
      repository: "erdos",
      object,
      related,
      edges: [edge("edge_unrelated", "vcl_a", "vcl_b", "supports", "not connected")],
      relationship_total: 1,
    })).toThrow("does not touch");

    expect(() => buildSiteObjectContext({
      root,
      repository: "erdos",
      object,
      related: [],
      edges: [edge("edge_missing", object.id, "vcl_missing", "depends", "missing node")],
      relationship_total: 1,
    })).toThrow("missing related object");
  });

  test("fails closed rather than presenting a truncated relationship set as exact", () => {
    expect(() => buildSiteObjectContext({
      root,
      repository: "erdos",
      object,
      related,
      edges,
      relationship_total: edges.length + 1,
    })).toThrow("object context is incomplete");
  });

  test("closes projected nodes and validates exact edge identity fields", () => {
    const objectWithDatabaseFields = { ...object, content: { accepted: true }, x: 1, y: 2 };
    const relatedWithEdgeFields = related.map((node) => ({
      ...node,
      edge_id: "must-not-leak",
      relation: "must-not-leak",
      source_root: root,
    }));
    const context = buildSiteObjectContext({
      root,
      repository: "erdos",
      object: objectWithDatabaseFields,
      related: relatedWithEdgeFields,
      edges,
      relationship_total: edges.length,
    });
    const expectedNodeFields = ["href", "id", "kind", "label", "plane", "standing", "trust"];
    expect(Object.keys(context.object).sort()).toEqual(expectedNodeFields);
    expect(Object.keys(context.groups[0].relationships[0].related).sort()).toEqual(expectedNodeFields);

    const invalid = (changes: Partial<ObjectContextEdge>) => [{ ...edges[0], ...changes }];
    expect(() => buildSiteObjectContext({ root, repository: "erdos", object, related, edges: invalid({ id: "" }), relationship_total: 1 })).toThrow("edge id is required");
    expect(() => buildSiteObjectContext({ root, repository: "erdos", object, related, edges: invalid({ source: "" }), relationship_total: 1 })).toThrow("source is required");
    expect(() => buildSiteObjectContext({ root, repository: "erdos", object, related, edges: invalid({ target: "" }), relationship_total: 1 })).toThrow("target is required");
    expect(() => buildSiteObjectContext({ root, repository: "erdos", object, related, edges: invalid({ relation: "" }), relationship_total: 1 })).toThrow("relation is required");
  });
});

describe("closed graph database boundary", () => {
  const nodeRow = {
    ...object,
    x: 1.25,
    y: -3.5,
  };
  const edgeRow = {
    id: "edge_exact",
    source: object.id,
    target: related[0].id,
    relation: "describes",
    trust: "signed",
    inferred: true,
    source_root: root,
    evidence: "Exact retained edge.",
  };

  test("accepts only closed node and edge records", () => {
    expect(parseGraphNodeRecord(nodeRow)).toEqual(nodeRow);
    expect(parseGraphEdgeRecord(edgeRow)).toEqual(edgeRow);
    expect(parseGraphNeighborRecord({
      ...related[0],
      x: 2,
      y: 4,
      edge_id: edgeRow.id,
      source: edgeRow.source,
      target: edgeRow.target,
      direction: "outgoing",
      relation: edgeRow.relation,
      outgoing: true,
      edge_trust: edgeRow.trust,
      inferred: edgeRow.inferred,
      source_root: edgeRow.source_root,
      evidence: edgeRow.evidence,
    })).toMatchObject({
      id: related[0].id,
      edge_id: edgeRow.id,
      direction: "outgoing",
      outgoing: true,
    });
  });

  test("rejects coercible values and unsafe application links", () => {
    expect(() => parseGraphNodeRecord({ ...nodeRow, id: undefined })).toThrow("id must be a non-empty string");
    expect(() => parseGraphNodeRecord({ ...nodeRow, x: "1.25" })).toThrow("x must be a finite number");
    expect(() => parseGraphNodeRecord({ ...nodeRow, x: Number.NaN })).toThrow("x must be a finite number");
    expect(() => parseGraphNodeRecord({ ...nodeRow, href: "javascript:alert(1)" })).toThrow("safe absolute application path");
    expect(() => parseGraphNodeRecord({ ...nodeRow, href: "//evil.example/path" })).toThrow("safe absolute application path");
    expect(() => parseGraphNodeRecord({ ...nodeRow, href: "/\\evil" })).toThrow("safe absolute application path");
    expect(() => parseGraphEdgeRecord({ ...edgeRow, inferred: "true" })).toThrow("inferred must be a boolean");
    expect(() => parseGraphEdgeRecord({ ...edgeRow, source_root: "sha256:short" })).toThrow("full lowercase sha256");
    expect(() => parseGraphNeighborRecord({
      ...nodeRow,
      edge_id: edgeRow.id,
      source: edgeRow.source,
      target: edgeRow.target,
      direction: "incoming",
      relation: edgeRow.relation,
      outgoing: true,
      edge_trust: edgeRow.trust,
      inferred: edgeRow.inferred,
      source_root: edgeRow.source_root,
      evidence: edgeRow.evidence,
    })).toThrow("direction and outgoing flag disagree");
  });
});
