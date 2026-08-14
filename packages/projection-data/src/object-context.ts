import type { HashRoot } from "./index";

export interface ObjectContextNode {
  id: string;
  kind: string;
  label: string;
  plane: string | null;
  trust: string | null;
  standing: string;
  href: string | null;
}

export interface ObjectContextEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  trust: string | null;
  inferred: boolean;
  source_root: HashRoot | null;
  evidence: string | null;
}

export type ObjectContextDirection = "outgoing" | "incoming";

export interface ObjectContextRelationship extends ObjectContextEdge {
  direction: ObjectContextDirection;
  related: ObjectContextNode;
}

export interface ObjectContextGroup {
  key: string;
  direction: ObjectContextDirection;
  relation: string;
  count: number;
  relationships: ObjectContextRelationship[];
}

export interface SiteObjectContext {
  schema: "site.object-context.v1";
  root: HashRoot;
  repository: string;
  object: ObjectContextNode;
  relationship_count: number;
  groups: ObjectContextGroup[];
}

export interface ObjectContextIdentityMapping {
  claim_id: string;
  imported_object_id: string | null;
}

interface BuildObjectContextInput {
  root: HashRoot;
  repository: string;
  object: ObjectContextNode;
  related: ObjectContextNode[];
  edges: ObjectContextEdge[];
  relationship_total: number;
}

const rootPattern = /^sha256:[0-9a-f]{64}$/u;

/**
 * Resolves a current Claim identifier to the immutable predecessor identifier
 * retained by an imported graph. The mapping is source data, not an inferred
 * alias: callers must supply the exact projected Claim row.
 */
export function resolveObjectContextGraphId(
  requestedId: string,
  mapping: ObjectContextIdentityMapping | undefined,
): string {
  if (!requestedId) throw new Error("object context requested id is required");
  if (!mapping) return requestedId;
  if (!mapping.claim_id) throw new Error("object context Claim mapping is missing a Claim id");
  if (
    mapping.claim_id !== requestedId
    && mapping.imported_object_id !== requestedId
  ) {
    throw new Error(`object context Claim mapping does not bind ${requestedId}`);
  }
  if (mapping.imported_object_id === null) return mapping.claim_id;
  if (!mapping.imported_object_id) {
    throw new Error("object context Claim mapping has an empty imported object id");
  }
  return mapping.imported_object_id;
}

function compareCodePoints(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareRelationships(left: ObjectContextRelationship, right: ObjectContextRelationship): number {
  return compareCodePoints(left.related.id, right.related.id)
    || compareCodePoints(left.id, right.id);
}

function sameNode(left: ObjectContextNode, right: ObjectContextNode): boolean {
  return left.id === right.id
    && left.kind === right.kind
    && left.label === right.label
    && left.plane === right.plane
    && left.trust === right.trust
    && left.standing === right.standing
    && left.href === right.href;
}

function closedNode(node: ObjectContextNode): ObjectContextNode {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    plane: node.plane,
    trust: node.trust,
    standing: node.standing,
    href: node.href,
  };
}

/**
 * Builds the object-centered view of already-rooted graph rows. This is a pure
 * read projection: it groups retained edges without deriving authority,
 * evidence, or scientific standing.
 */
export function buildSiteObjectContext(input: BuildObjectContextInput): SiteObjectContext {
  if (!rootPattern.test(input.root)) throw new Error("object context root is malformed");
  if (!input.repository) throw new Error("object context repository is required");
  if (!input.object.id) throw new Error("object context object is required");
  if (!Number.isSafeInteger(input.relationship_total) || input.relationship_total < 0) {
    throw new Error("object context relationship total is invalid");
  }
  if (input.relationship_total !== input.edges.length) {
    throw new Error(`object context is incomplete: expected ${input.relationship_total} relationships, received ${input.edges.length}`);
  }

  const object = closedNode(input.object);
  const nodes = new Map<string, ObjectContextNode>([[object.id, object]]);
  for (const rawNode of input.related) {
    const node = closedNode(rawNode);
    if (!node.id) throw new Error("object context related object is missing an id");
    const existing = nodes.get(node.id);
    if (existing) {
      if (!sameNode(existing, node)) throw new Error(`conflicting object context node ${node.id}`);
      continue;
    }
    nodes.set(node.id, node);
  }

  const edgeIds = new Set<string>();
  const grouped = new Map<string, ObjectContextRelationship[]>();
  for (const edge of input.edges) {
    if (!edge.id) throw new Error("object context edge id is required");
    if (edgeIds.has(edge.id)) throw new Error(`duplicate object context edge ${edge.id}`);
    edgeIds.add(edge.id);
    if (!edge.source) throw new Error(`object context edge ${edge.id} source is required`);
    if (!edge.target) throw new Error(`object context edge ${edge.id} target is required`);
    if (!edge.relation) throw new Error(`object context edge ${edge.id} relation is required`);
    if (edge.source_root !== null && !rootPattern.test(edge.source_root)) {
      throw new Error(`object context edge ${edge.id} has a malformed source root`);
    }

    const direction = edge.source === object.id
      ? "outgoing"
      : edge.target === object.id
        ? "incoming"
        : null;
    if (!direction) throw new Error(`object context edge ${edge.id} does not touch ${object.id}`);
    const relatedId = direction === "outgoing" ? edge.target : edge.source;
    const related = nodes.get(relatedId);
    if (!related) throw new Error(`object context edge ${edge.id} is missing related object ${relatedId}`);

    const relationship: ObjectContextRelationship = { ...edge, direction, related };
    const key = `${direction}:${edge.relation}`;
    const relationships = grouped.get(key) ?? [];
    relationships.push(relationship);
    grouped.set(key, relationships);
  }

  const groups = [...grouped.entries()]
    .map(([key, relationships]) => {
      const [direction, ...relationParts] = key.split(":");
      const relation = relationParts.join(":");
      const sorted = relationships.sort(compareRelationships);
      return {
        key,
        direction: direction as ObjectContextDirection,
        relation,
        count: sorted.length,
        relationships: sorted,
      };
    })
    .sort((left, right) =>
      Number(left.direction === "incoming") - Number(right.direction === "incoming")
      || compareCodePoints(left.relation, right.relation),
    );

  return {
    schema: "site.object-context.v1",
    root: input.root,
    repository: input.repository,
    object,
    relationship_count: input.relationship_total,
    groups,
  };
}
