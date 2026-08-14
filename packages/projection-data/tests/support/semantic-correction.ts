import { createHash } from "node:crypto";

const PROJECTION_DOMAIN = Buffer.from(
  "vela.erdos-correction-projection.v2\0",
  "utf8",
);

export const semanticCorrectionPackages = {
  core_root: "sha256:70d7a125997c4cbbc4a0e3e022478427b36a84c5a9f08a0411b3dc116c408b24",
  erdos_root: "sha256:4403e537e232c4674e1299bfa96ccfa625aa8b8a0889179659245f9dc0625341",
  mapping_commit: "2063beae0d1e4a86c9528e521965a516a2abf667",
  mapping_root: "sha256:8e6b25c3872880b666fe29bbf8111c0483b1abc61101ff21bb26e045d0c67d3c",
  mapping_tree: "65eafae446aaac13be14a35fa50696ddbb9ca629",
} as const;

type Json =
  | boolean
  | null
  | number
  | string
  | Json[]
  | { [key: string]: Json };

interface SemanticRelationProjection {
  consequence_tier: "organization";
  does_not_establish: string[];
  evidence_roots: string[];
  frontier_algebra_atom: null;
  projected_observation: string;
  source_id: string;
  standing_effect: "none" | "observe_repository_decision";
  target_id: string;
  target_relation_kind: string;
}

export interface SemanticCorrectionProjection {
  assurance: Record<string, string>;
  authority_effect: "none";
  case_id: string;
  correction: {
    accepted_claim_delta: 0;
    after: "rejected";
    before: "pending_review";
    retains_rejected_evidence: true;
  };
  frontier_algebra: {
    atom_count: 0;
    reason: "all mapped relations are organizational";
  };
  package_identity: typeof semanticCorrectionPackages;
  projection_root: `sha256:${string}`;
  relations: SemanticRelationProjection[];
  repair_requirements: string[];
  schema: "vela.erdos-correction-projection.v2";
  source: {
    frontier_id: string;
    post_git_commit: string;
    post_git_tree: string;
    pre_git_commit: string;
    pre_git_tree: string;
  };
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function json(value: unknown): Json {
  if (
    value === null
    || typeof value === "boolean"
    || typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (Array.isArray(value)) return value.map(json);
  const source = object(value, "canonical JSON value");
  return Object.fromEntries(
    Object.keys(source)
      .sort()
      .map((key) => [key, json(source[key])]),
  );
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(json(value));
}

function projectionRoot(value: unknown): `sha256:${string}` {
  const hash = createHash("sha256");
  hash.update(PROJECTION_DOMAIN);
  hash.update(canonicalJson(value), "utf8");
  return `sha256:${hash.digest("hex")}`;
}

/**
 * Builds the read-only conformance projection from exact package documents.
 * This is test support, not an Problems runtime or authority surface.
 */
export function projectSemanticCorrection(
  fixtureValue: unknown,
  mappingValue: unknown,
): SemanticCorrectionProjection {
  const fixture = object(fixtureValue, "Erdős correction fixture");
  const mapping = object(mappingValue, "Erdős correction mapping");
  if (fixture.schema !== "vela.erdos-correction-vector.v2") {
    throw new Error("wrong Erdős correction fixture schema");
  }
  if (
    mapping.schema !== "vela.semantic-mapping.v1"
    || mapping.target_contract !== "vela.erdos-correction-projection.v2"
  ) {
    throw new Error("wrong Erdős correction mapping contract");
  }
  const sourcePackage = object(mapping.source_package, "mapping source package");
  if (sourcePackage.package_root !== semanticCorrectionPackages.erdos_root) {
    throw new Error("mapping source package root mismatch");
  }

  const sourceObjects = array(
    fixture.source_objects,
    "fixture source objects",
  ).map((value) => object(value, "fixture source object"));
  const availableRoles = new Set(
    sourceObjects.map((source) => string(source.role, "source object role")),
  );
  const relations = array(fixture.relations, "fixture relations").map(
    (value) => object(value, "fixture relation"),
  );
  const rules = array(mapping.rules, "mapping rules").map(
    (value) => object(value, "mapping rule"),
  );
  const rulesByKind = new Map(
    rules.map((rule) => [
      string(rule.source_relation_kind, "source relation kind"),
      rule,
    ]),
  );
  if (
    rulesByKind.size !== relations.length
    || relations.some(
      (relation) => !rulesByKind.has(string(relation.kind, "relation kind")),
    )
  ) {
    throw new Error("mapping rules do not cover exact fixture relations");
  }

  const projectedRelations: SemanticRelationProjection[] = relations.map(
    (relation) => {
      const kind = string(relation.kind, "relation kind");
      const rule = rulesByKind.get(kind);
      if (!rule) throw new Error(`missing mapping rule for ${kind}`);
      if (
        rule.consequence_tier !== "organization"
        || rule.frontier_algebra_atom !== null
        || !["none", "observe_repository_decision"].includes(
          string(rule.standing_effect, "standing effect"),
        )
      ) {
        throw new Error(
          "organizational mapping attempted assurance or standing transport",
        );
      }
      for (const role of array(
        rule.required_evidence_roles,
        "required evidence roles",
      )) {
        if (!availableRoles.has(string(role, "required evidence role"))) {
          throw new Error(`mapping evidence role is unavailable: ${role}`);
        }
      }
      return {
        consequence_tier: "organization",
        does_not_establish: array(
          rule.does_not_establish,
          "does not establish",
        ).map((value) => string(value, "does not establish value")),
        evidence_roots: array(
          relation.evidence_roots,
          "relation evidence roots",
        ).map((value) => string(value, "relation evidence root")),
        frontier_algebra_atom: null,
        projected_observation: string(
          rule.projected_observation,
          "projected observation",
        ),
        source_id: string(relation.source_id, "relation source"),
        standing_effect: string(
          rule.standing_effect,
          "standing effect",
        ) as SemanticRelationProjection["standing_effect"],
        target_id: string(relation.target_id, "relation target"),
        target_relation_kind: string(
          rule.target_relation_kind,
          "target relation kind",
        ),
      };
    },
  );

  const correction = object(
    mapping.correction_projection,
    "mapping correction projection",
  );
  const pre = object(fixture.pre, "fixture pre state");
  const post = object(fixture.post, "fixture post state");
  const standing = object(fixture.standing, "fixture standing");
  const document = {
    assurance: Object.fromEntries(
      Object.entries(standing).map(([key, value]) => [
        key,
        string(value, `assurance ${key}`),
      ]),
    ),
    authority_effect: "none" as const,
    case_id: string(fixture.case_id, "case id"),
    correction: {
      accepted_claim_delta: correction.accepted_claim_delta as 0,
      after: correction.after as "rejected",
      before: correction.before as "pending_review",
      retains_rejected_evidence:
        correction.retains_rejected_evidence as true,
    },
    frontier_algebra: {
      atom_count: 0 as const,
      reason: "all mapped relations are organizational" as const,
    },
    package_identity: semanticCorrectionPackages,
    relations: projectedRelations,
    repair_requirements: array(
      correction.repair_requirements,
      "repair requirements",
    ).map((value) => string(value, "repair requirement")),
    schema: "vela.erdos-correction-projection.v2" as const,
    source: {
      frontier_id: string(fixture.frontier_id, "frontier id"),
      post_git_commit: string(post.git_commit, "post Git commit"),
      post_git_tree: string(post.git_tree, "post Git tree"),
      pre_git_commit: string(pre.git_commit, "pre Git commit"),
      pre_git_tree: string(pre.git_tree, "pre Git tree"),
    },
  };
  return {
    ...document,
    projection_root: projectionRoot(document),
  };
}

export function verifySemanticCorrection(
  projection: SemanticCorrectionProjection,
): void {
  const { projection_root: actual, ...document } = projection;
  if (projectionRoot(document) !== actual) {
    throw new Error("correction projection root mismatch");
  }
  if (projection.authority_effect !== "none") {
    throw new Error("correction projection has authority effect");
  }
  if (projection.frontier_algebra.atom_count !== 0) {
    throw new Error("organizational mapping created an atom");
  }
}
