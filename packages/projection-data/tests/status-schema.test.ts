import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import velaRelease from "../config/vela-release.v1.json";
import vendored from "../config/vela-schemas.v1.json";
import schema from "../config/vela-status-v4.schema.json";
import { compactStatusSchema, type CompactStatus } from "../src";

/*
  `vela.status.v4` is declared twice.

  Upstream declares it once, generated from the Rust type that emits it, and
  publishes it as `schemas/status-v4.schema.json`. This package declares it a
  second time as a zod schema, because a document arriving over the wire has to
  be parsed before anything reads it. Nothing held the two together. Upstream
  could rename a field and the first thing to notice would be a projection
  refresh failing in CI, after the release — the fail-closed direction, but far
  too late and with nothing saying which field.

  The upstream declaration is vendored at the pinned commit by
  `scripts/sync-vela-schemas.mjs`, and this holds the reader to it: every field
  the producer promises, this package refuses to go without.

  Only `required` is checked, and deliberately. Upstream leaves
  `vela.status.v4` open and this package does the same — a field it does not
  name is the same document with more in it, and rejecting extras cost three
  fail-closed breaks of the refresh in six days. Reading only `required` is the
  interoperability rule, not an oversight; see the note above
  `currentCompactStatusSchema`.
*/

const root = (digit: string) => `sha256:${digit.repeat(64)}` as const;

/* The same document `status-root.test.ts` builds, kept here rather than shared
   so that neither test can weaken the other by editing one fixture. */
function currentStatus(): CompactStatus {
  return {
    schema: "vela.status.v4",
    ok: true,
    command: "status",
    repository: { id: "123e4567-e89b-42d3-a456-426614174000", name: "Test repository", profile_root: root("1") },
    git: { role: "repository_head", commit: "1".repeat(40), tree: "2".repeat(40) },
    roots: { origin: root("2"), repository: root("3"), authority_keyset: root("4"), authority_policy: root("5") },
    integrity: { replay: "verified", strict: "pass", blocker_count: 0, blockers_by_code: {} },
    counts: {
      claims: 12, accepted_claims: 10, pending_claims: 2,
      pending_review: 2, accepted_review: 1, rejected_review: 0, withdrawn_review: 0,
      submissions: 2, verifications: 2, artifacts: 4,
    },
    decision_inbox: {
      pending_count: 2, protocol_ready_count: 1, protocol_blocked_count: 1,
      projection_root: root("6"), first_entry_root: root("7"),
    },
    actions: {
      review: { pending_count: 2, command: "vela review inbox . --json" },
      work: { mode: "direct_submission", command: "vela submit --repo . --help", note: "Submit bounded evidence directly." },
    },
  };
}

interface JsonSchemaNode {
  required?: string[];
  properties?: Record<string, JsonSchemaNode>;
  oneOf?: JsonSchemaNode[];
  anyOf?: JsonSchemaNode[];
  const?: unknown;
}

/* Paths every valid document must carry, so only those reached through
   `properties`. A field required inside one arm of a union is required of that
   arm alone, and deleting it may leave a document that satisfies a sibling arm
   — those are checked separately below, by the discriminator. */
function unconditionalRequired(node: JsonSchemaNode, path: string[] = []): string[][] {
  const found = (node.required ?? []).map((name) => [...path, name]);
  for (const [name, child] of Object.entries(node.properties ?? {})) {
    found.push(...unconditionalRequired(child, [...path, name]));
  }
  return found;
}

function withoutPath(document: unknown, path: string[]): unknown {
  const [head, ...rest] = path;
  const copy = { ...(document as Record<string, unknown>) };
  if (rest.length === 0) delete copy[head as string];
  else copy[head as string] = withoutPath(copy[head as string], rest);
  return copy;
}

const required = unconditionalRequired(schema as JsonSchemaNode);

describe("the status reader and the schema upstream publishes", () => {
  /* A vendored file that stopped being vendored, or a schema that stopped
     requiring anything, would make every case below pass by having none. */
  test("the vendored schema is the one this reader claims to read", () => {
    expect((schema as { $id?: string }).$id).toBe("https://vela.science/schemas/status.schema.json");
    expect(required.length).toBeGreaterThan(30);
    expect(compactStatusSchema.parse(currentStatus())).toEqual(currentStatus());
  });

  /* A vendored file has no stamp of its own, so the sync records where it came
     from. A pin that moves without a re-sync fails here rather than shipping a
     reader checked against a schema the advertised release no longer publishes;
     the digest catches the other direction, an edit made here instead of
     upstream. Re-run `bun packages/projection-data/scripts/sync-vela-schemas.mjs`. */
  test("it was vendored from the release this package advertises", () => {
    expect(vendored.vela_commit).toBe(velaRelease.commit);
    expect(vendored.vela_version).toBe(velaRelease.version);
    expect(vendored.files.length).toBeGreaterThan(0);
    for (const file of vendored.files) {
      const text = readFileSync(new URL(`../config/${file.file}`, import.meta.url), "utf8");
      expect(`sha256:${createHash("sha256").update(text).digest("hex")}`, file.file).toBe(file.sha256);
    }
  });

  test.each(required.map((path) => [path.join("."), path] as const))(
    "refuses a document missing %s",
    (_label, path) => {
      expect(compactStatusSchema.safeParse(withoutPath(currentStatus(), [...path])).success).toBe(false);
    },
  );

  /* `actions.work` is a union and its arms are told apart by `mode`. When a
     third arm arrived the refresh broke on a value the reader had never heard
     of, so the set of modes is held to the schema rather than to memory. */
  test("accepts exactly the work modes the schema declares", () => {
    const arms = ((schema as JsonSchemaNode).properties?.actions?.properties?.work?.oneOf ?? []);
    const declared = arms.map((arm) => arm.properties?.mode?.const).filter(Boolean) as string[];
    expect(declared.length).toBe(arms.length);
    expect(new Set(declared).size).toBe(declared.length);

    for (const arm of arms) {
      const mode = arm.properties?.mode?.const as string;
      const status = currentStatus();
      const work: Record<string, unknown> = { mode, command: "vela submit --repo . --help" };
      for (const field of arm.required ?? []) {
        if (!(field in work)) work[field] = "a sentence the producer wrote";
      }
      const parsed = compactStatusSchema.safeParse({ ...status, actions: { ...status.actions, work } });
      expect(parsed.success, `${mode} is declared upstream and must parse`).toBe(true);
    }

    const status = currentStatus();
    expect(compactStatusSchema.safeParse({
      ...status,
      actions: { ...status.actions, work: { ...status.actions.work, mode: "a mode nobody declared" } },
    }).success).toBe(false);
  });
});
