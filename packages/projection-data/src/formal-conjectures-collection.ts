import { z } from "zod";
import snapshotInput from "../config/formal-conjectures-collection.v1.json";
import reviewInput from "../config/formal-conjectures-collection-review.v1.json";
import { canonicalJson, sha256, type HashRoot } from "./canonical";
import type { SiteSearchRecord } from "./search";

const hashRoot = z.string().regex(/^sha256:[0-9a-f]{64}$/u) as z.ZodType<HashRoot>;
const gitOid = z.string().regex(/^[0-9a-f]{40}$/u);
const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", "locators must use HTTPS");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

const rightsSchema = z.object({
  lean_source_license: z.literal("Apache-2.0"),
  question_text_license: z.enum(["CC-BY-4.0", "CC-BY-SA-4.0", "Apache-2.0"]),
  attribution: z.string().min(1),
  retention: z.literal("exact_tracked_docstring"),
}).strict();

const relationSchema = z.object({
  kind: z.enum(["part_of", "composed_of", "variant_of"]),
  target: slug,
}).strict();

const historySchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("registered"), revision: gitOid, note: z.string().min(1) }).strict(),
  z.object({
    event: z.literal("renamed"),
    revision: gitOid,
    note: z.string().min(1),
    from_declaration: z.string().min(1),
    to_declaration: z.string().min(1),
  }).strict(),
  z.object({ event: z.literal("split"), revision: gitOid, note: z.string().min(1) }).strict(),
  z.object({ event: z.literal("merged"), revision: gitOid, note: z.string().min(1) }).strict(),
  z.object({ event: z.literal("superseded"), revision: gitOid, note: z.string().min(1) }).strict(),
]);

const itemSchema = z.object({
  collection_id: z.literal("formal-conjectures"),
  occurrence_id: z.string().regex(/^formal-conjectures:.+/u),
  route_slug: slug,
  declaration: z.string().min(1),
  source_path: z.string().regex(/^FormalConjectures\/.+\.lean$/u),
  title: z.string().min(1),
  question: z.string().min(1),
  formal_statement: z.string().min(1),
  source_excerpt: z.string().min(1),
  category: z.literal("research open"),
  source_family: z.enum(["Wikipedia", "OEIS", "MathOverflow"]),
  source_locator: httpsUrl,
  source_url: httpsUrl,
  source_blob_oid: gitOid,
  source_blob_root: hashRoot,
  formal_proof: z.boolean(),
  upstream_identity: z.object({ provider: z.enum(["OEIS", "MathOverflow"]), id: z.string().min(1) }).strict().optional(),
  rights: rightsSchema,
  group_id: slug.nullable(),
  relations: z.array(relationSchema),
  aliases: z.array(z.string().min(1)),
  history: z.array(historySchema).min(1),
  authority_effect: z.literal("none"),
  content_root: hashRoot,
}).strict();

const groupSchema = z.object({
  id: slug,
  kind: z.enum(["multipart", "variant_set"]),
  title: z.string().min(1),
  members: z.array(slug).min(2),
}).strict();

export const formalConjecturesCollectionSchema = z.object({
  schema: z.literal("vela.web.formal-conjectures-collection.v1"),
  collection_id: z.literal("formal-conjectures"),
  name: z.literal("Formal Conjectures"),
  selection_id: z.literal("research-open-rights-reviewed-v1"),
  authority_effect: z.literal("none"),
  source_snapshot: z.object({
    repository: z.literal("https://github.com/google-deepmind/formal-conjectures"),
    commit: gitOid,
    tree: gitOid,
    lean_toolchain: z.string().min(1),
    access: z.literal("public"),
    source_license: z.literal("Apache-2.0"),
  }).strict(),
  selection_policy: z.object({
    included_category: z.literal("research open"),
    scope: z.string().min(1),
    exclusions: z.string().min(1),
    scientific_status: z.string().min(1),
    review_boundary: z.string().min(1),
  }).strict(),
  roots: z.object({ review_root: hashRoot, data_root: hashRoot, collection_root: hashRoot }).strict(),
  data: z.object({ items: z.array(itemSchema).min(1), groups: z.array(groupSchema) }).strict(),
}).strict().superRefine((collection, context) => {
  const routes = new Set<string>();
  const occurrences = new Set<string>();
  const declarations = new Set<string>();
  const groups = new Map(collection.data.groups.map((group) => [group.id, group]));
  const upstream = new Map<string, { group: string | null; route: string }>();
  for (const [index, item] of collection.data.items.entries()) {
    for (const [set, value, label] of [
      [routes, item.route_slug, "route"],
      [occurrences, item.occurrence_id, "occurrence"],
      [declarations, item.declaration, "declaration"],
    ] as const) {
      if (set.has(value)) context.addIssue({ code: "custom", path: ["data", "items", index], message: `duplicate ${label} identity ${value}` });
      set.add(value);
    }
    const originalDeclaration = item.occurrence_id.slice("formal-conjectures:".length);
    let declaredIdentity = originalDeclaration;
    if (item.history[0]?.event !== "registered") {
      context.addIssue({ code: "custom", path: ["data", "items", index, "history"], message: "occurrence history must begin with registration" });
    }
    for (const event of item.history) if (event.event === "renamed") {
      if (event.from_declaration !== declaredIdentity || !item.aliases.includes(event.from_declaration)) {
        context.addIssue({ code: "custom", path: ["data", "items", index, "history"], message: "declaration rename must continue the retained identity and preserve its alias" });
      }
      declaredIdentity = event.to_declaration;
    }
    if (declaredIdentity !== item.declaration || new Set(item.aliases).size !== item.aliases.length || item.aliases.includes(item.declaration)) {
      context.addIssue({ code: "custom", path: ["data", "items", index, "declaration"], message: "occurrence identity must equal the declaration or carry an explicit rename chain" });
    }
    if (item.group_id && !groups.has(item.group_id)) {
      context.addIssue({ code: "custom", path: ["data", "items", index, "group_id"], message: "item group is absent" });
    }
    for (const relation of item.relations) if (!collection.data.items.some(({ route_slug }) => route_slug === relation.target)) {
      context.addIssue({ code: "custom", path: ["data", "items", index, "relations"], message: `relation target ${relation.target} is absent` });
    }
    if (item.upstream_identity) {
      const key = `${item.upstream_identity.provider}:${item.upstream_identity.id}`;
      const prior = upstream.get(key);
      if (prior && (!prior.group || prior.group !== item.group_id)) {
        context.addIssue({ code: "custom", path: ["data", "items", index, "upstream_identity"], message: `duplicate upstream identity ${key} lacks one explicit shared group` });
      }
      upstream.set(key, { group: item.group_id, route: item.route_slug });
    }
    const { content_root: _root, ...content } = item;
    if (sha256(canonicalJson(content)) !== item.content_root) {
      context.addIssue({ code: "custom", path: ["data", "items", index, "content_root"], message: "item content root does not match retained fields" });
    }
  }
  for (const [index, group] of collection.data.groups.entries()) {
    const declaredMembers = new Set(group.members);
    const assignedMembers = collection.data.items.filter(({ group_id }) => group_id === group.id).map(({ route_slug }) => route_slug);
    if (
      declaredMembers.size !== group.members.length
      || group.members.some((member) => !routes.has(member))
      || assignedMembers.length !== group.members.length
      || assignedMembers.some((member) => !declaredMembers.has(member))
    ) {
      context.addIssue({ code: "custom", path: ["data", "groups", index, "members"], message: "group members must be unique retained routes" });
    }
  }
});

export type FormalConjecturesCollection = z.infer<typeof formalConjecturesCollectionSchema>;
export type FormalConjectureOccurrence = FormalConjecturesCollection["data"]["items"][number];

export function parseFormalConjecturesCollection(input: unknown): FormalConjecturesCollection {
  const collection = formalConjecturesCollectionSchema.parse(input);
  const reviewRoot = sha256(canonicalJson(reviewInput));
  const dataRoot = sha256(canonicalJson(collection.data));
  const collectionRoot = sha256(canonicalJson({ source_snapshot: collection.source_snapshot, review_root: reviewRoot, data_root: dataRoot }));
  if (collection.roots.review_root !== reviewRoot || collection.roots.data_root !== dataRoot || collection.roots.collection_root !== collectionRoot) {
    throw new Error("Formal Conjectures collection roots do not match retained provider-loss data");
  }
  return collection;
}

const input: unknown = snapshotInput;
export const formalConjecturesCollection = parseFormalConjecturesCollection(input);
export const formalConjecturesCollectionRoot = formalConjecturesCollection.roots.collection_root;

export function compositeSearchRoot(projectionRoot: HashRoot): HashRoot {
  return sha256(canonicalJson({
    schema: "site.composite-search-identity.v1",
    projection_root: projectionRoot,
    supplemental_collections: [{
      collection_id: formalConjecturesCollection.collection_id,
      collection_root: formalConjecturesCollectionRoot,
    }],
  }));
}

export function formalConjectureOccurrence(routeSlug: string): FormalConjectureOccurrence | null {
  return formalConjecturesCollection.data.items.find(({ route_slug }) => route_slug === routeSlug) ?? null;
}

export function formalConjecturesSearchRecords(query = ""): SiteSearchRecord[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  return formalConjecturesCollection.data.items.filter((item) => {
    const text = `${item.title} ${item.question} ${item.declaration} ${item.source_family} ${item.upstream_identity?.id ?? ""}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  }).map((item) => ({
    kind: "problem",
    repository: "source:formal-conjectures",
    id: item.occurrence_id,
    assertion: item.title,
    source_title: formalConjecturesCollection.name,
    standing: "source_open",
    href: `/problems/formal-conjectures/${item.route_slug}`,
  }));
}
