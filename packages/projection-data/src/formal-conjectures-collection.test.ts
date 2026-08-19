import { describe, expect, test } from "bun:test";
import { formalConjecturesCollection, formalConjecturesSearchRecords, parseFormalConjecturesCollection } from "./formal-conjectures-collection";
import { canonicalJson, sha256 } from "./canonical";

const mutate = (apply: (value: any) => void) => {
  const value = structuredClone(formalConjecturesCollection);
  apply(value);
  return value;
};

const reroot = (value: any) => {
  for (const item of value.data.items) {
    const { content_root: _root, ...content } = item;
    item.content_root = sha256(canonicalJson(content));
  }
  value.roots.data_root = sha256(canonicalJson(value.data));
  value.roots.collection_root = sha256(canonicalJson({ source_snapshot: value.source_snapshot, review_root: value.roots.review_root, data_root: value.roots.data_root }));
  return value;
};

describe("Formal Conjectures public collection", () => {
  test("reconstructs seven exact rights-reviewed occurrences without a provider", () => {
    expect(parseFormalConjecturesCollection(structuredClone(formalConjecturesCollection))).toEqual(formalConjecturesCollection);
    expect(formalConjecturesCollection.data.items).toHaveLength(7);
    expect(new Set(formalConjecturesCollection.data.items.map(({ source_path }) => source_path))).toEqual(new Set([
      "FormalConjectures/Wikipedia/Oppermann.lean",
      "FormalConjectures/OEIS/103662.lean",
      "FormalConjectures/Mathoverflow/434111.lean",
      "FormalConjectures/Wikipedia/InvariantSubspaceProblem.lean",
    ]));
    expect(formalConjecturesCollection.authority_effect).toBe("none");
  });

  test("indexes collection-qualified human labels and exact declaration identity", () => {
    expect(formalConjecturesSearchRecords("Oppermann")).toHaveLength(3);
    expect(formalConjecturesSearchRecords("A103662")).toHaveLength(2);
    expect(formalConjecturesSearchRecords("Invariant")[0]).toMatchObject({
      id: "formal-conjectures:InvariantSubspaceProblem.Invariant_subspace_problem",
      href: "/problems/formal-conjectures/wikipedia-invariant-subspace-problem",
      source_title: "Formal Conjectures",
    });
  });

  test.each([
    ["missing question text", (value: any) => { value.data.items[0].question = ""; }],
    ["missing source locator", (value: any) => { value.data.items[0].source_locator = ""; }],
    ["rights refusal", (value: any) => { value.data.items[0].rights.question_text_license = "NOASSERTION"; }],
    ["category drift", (value: any) => { value.data.items[0].category = "research solved"; }],
    ["identity collision", (value: any) => { value.data.items[1].route_slug = value.data.items[0].route_slug; }],
    ["declaration rename without migration", (value: any) => { value.data.items[0].declaration = "Oppermann.renamed"; }],
    ["missing relation target", (value: any) => { value.data.items[0].relations[0].target = "missing-target"; }],
    ["group membership drift", (value: any) => { value.data.groups[0].members.pop(); }],
    ["snapshot drift", (value: any) => { value.source_snapshot.commit = "0".repeat(40); }],
    ["content drift", (value: any) => { value.data.items[0].title = "Changed"; }],
  ])("fails closed on %s", (_label, apply) => {
    expect(() => parseFormalConjecturesCollection(mutate(apply))).toThrow();
  });

  test("requires an explicit shared group for duplicate upstream mappings", () => {
    expect(() => parseFormalConjecturesCollection(mutate((value) => {
      value.data.items[4].group_id = null;
    }))).toThrow(/duplicate upstream identity/u);
  });

  test("refuses a re-rooted declaration rename without explicit migration", () => {
    const value = mutate((copy) => { copy.data.items[0].declaration = "Oppermann.renamed"; });
    expect(() => parseFormalConjecturesCollection(reroot(value))).toThrow(/explicit rename chain/u);
  });

  test("preserves durable occurrence identity through an explicit rename chain", () => {
    const value = mutate((copy) => {
      const item = copy.data.items[0];
      const prior = item.declaration;
      item.declaration = "Oppermann.renamed";
      item.aliases = [prior];
      item.history.push({
        event: "renamed",
        revision: copy.source_snapshot.commit,
        note: "The exact upstream declaration was renamed without changing this retained occurrence identity.",
        from_declaration: prior,
        to_declaration: item.declaration,
      });
    });
    expect(parseFormalConjecturesCollection(reroot(value)).data.items[0]?.occurrence_id).toBe(formalConjecturesCollection.data.items[0]?.occurrence_id);
  });
});
