import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, sha256 } from "../src/canonical.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewPath = resolve(root, "config/formal-conjectures-collection-review.v1.json");
const outputPath = resolve(root, "config/formal-conjectures-collection.v1.json");
const review = JSON.parse(readFileSync(reviewPath, "utf8"));

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const checkout = option("--checkout");
const revision = option("--revision");
const check = process.argv.includes("--check");
if (!checkout || !revision || !/^[0-9a-f]{40}$/u.test(revision)) {
  throw new Error("usage: build-formal-conjectures-collection.mjs --checkout PATH --revision 40_HEX [--check]");
}

const git = (args, encoding = "utf8") => execFileSync("git", ["-C", checkout, ...args], {
  encoding,
  maxBuffer: 32 * 1024 * 1024,
});
git(["cat-file", "-e", `${revision}^{commit}`]);
const tree = git(["rev-parse", `${revision}^{tree}`]).trim();

function sourceBytes(path) {
  return git(["show", `${revision}:${path}`], "buffer");
}

function cleanDocstring(raw) {
  /* Lean docstrings are not JSDoc: a leading `**` is source-authored Markdown,
     not a comment-margin star. Removing one star here corrupted the exact
     retained question before it was rooted. */
  return raw.split("\n").map((line) => line.trimEnd()).join("\n").trim();
}

function moduleHeading(source, path) {
  const match = source.match(/\/-!\s*[\s\S]*?^#\s+([^\n]+)$/mu);
  if (!match?.[1]) throw new Error(`${path} has no exact module heading`);
  return match[1].trim();
}

function firstParagraph(docstring) {
  const paragraph = docstring.split(/\n\s*\n/u)[0]?.replaceAll(/\*\*/gu, "").trim();
  if (!paragraph) throw new Error("declaration docstring has no first paragraph");
  return paragraph;
}

function extract(item) {
  const bytes = sourceBytes(item.source_path);
  const source = bytes.toString("utf8");
  const namespace = item.declaration.split(".")[0];
  const localName = item.declaration.startsWith(`${namespace}.`)
    ? item.declaration.slice(namespace.length + 1)
    : item.declaration;
  const escapedName = localName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const theorem = new RegExp(`\\btheorem\\s+${escapedName}(?=[\\s(:])`, "u").exec(source);
  if (!theorem) throw new Error(`${item.declaration} is absent from ${item.source_path} at ${revision}`);
  const before = source.slice(0, theorem.index);
  const comments = [...before.matchAll(/\/--([\s\S]*?)-\//gu)];
  const comment = comments.at(-1);
  if (!comment || comment.index === undefined) throw new Error(`${item.declaration} has no exact tracked docstring`);
  const between = source.slice(comment.index + comment[0].length, theorem.index);
  if (!/@\[category\s+research\s+open(?:,|\])/u.test(between)) {
    throw new Error(`${item.declaration} is not source-categorized research open at ${revision}`);
  }
  const proof = source.slice(theorem.index).match(/:=\s*by\b/u);
  if (!proof?.index) throw new Error(`${item.declaration} has no bounded theorem signature`);
  const signatureEnd = theorem.index + proof.index;
  const proofTail = source.slice(signatureEnd).match(/^:=\s*by\s*\n\s*sorry\b[^\n]*/u);
  if (!proofTail) throw new Error(`${item.declaration} no longer has the reviewed direct-sorry proof shape`);
  const excerptEnd = signatureEnd + proofTail[0].length;
  const docstring = cleanDocstring(comment[1]);
  const heading = moduleHeading(source, item.source_path);
  const title = item.display_basis === "module_heading" ? heading : firstParagraph(docstring);
  const sourceBlobOid = git(["rev-parse", `${revision}:${item.source_path}`]).trim();
  const formalStatement = source.slice(theorem.index, signatureEnd).trim();
  const sourceExcerpt = source.slice(comment.index, excerptEnd).trim();
  const exact = {
    collection_id: review.collection_id,
    occurrence_id: item.occurrence_id ?? `formal-conjectures:${item.declaration}`,
    route_slug: item.route_slug,
    declaration: item.declaration,
    source_path: item.source_path,
    title,
    question: docstring,
    formal_statement: formalStatement,
    source_excerpt: sourceExcerpt,
    category: "research open",
    source_family: item.source_family,
    source_locator: item.source_locator,
    source_url: `${review.upstream_repository}/blob/${revision}/${item.source_path}`,
    source_blob_oid: sourceBlobOid,
    source_blob_root: sha256(bytes),
    formal_proof: false,
    ...(item.upstream_identity ? { upstream_identity: item.upstream_identity } : {}),
    rights: item.rights,
    group_id: item.group_id,
    relations: item.relations,
    aliases: item.aliases ?? [],
    history: item.history ?? [{ event: "registered", revision, note: "Published from this exact Formal Conjectures declaration occurrence." }],
    authority_effect: "none",
  };
  return { ...exact, content_root: sha256(canonicalJson(exact)) };
}

const items = review.items.map(extract);
const routeSlugs = new Set(items.map(({ route_slug }) => route_slug));
const occurrences = new Set(items.map(({ occurrence_id }) => occurrence_id));
if (routeSlugs.size !== items.length || occurrences.size !== items.length) throw new Error("collection identities collide");
for (const item of items) for (const relation of item.relations) {
  if (!routeSlugs.has(relation.target)) throw new Error(`${item.route_slug} relates to missing ${relation.target}`);
}

const leanToolchain = sourceBytes("lean-toolchain").toString("utf8").trim();
const data = {
  items,
  groups: [
    { id: "wikipedia-oppermann", kind: "multipart", title: "Oppermann's Conjecture", members: items.filter(({ group_id }) => group_id === "wikipedia-oppermann").map(({ route_slug }) => route_slug) },
    { id: "oeis-a103662", kind: "variant_set", title: "OEIS A103662 open questions", members: items.filter(({ group_id }) => group_id === "oeis-a103662").map(({ route_slug }) => route_slug) }
  ],
};
const sourceSnapshot = {
  repository: review.upstream_repository,
  commit: revision,
  tree,
  lean_toolchain: leanToolchain,
  access: "public",
  source_license: "Apache-2.0",
};
const reviewRoot = sha256(canonicalJson(review));
const dataRoot = sha256(canonicalJson(data));
const document = {
  schema: "vela.web.formal-conjectures-collection.v1",
  collection_id: review.collection_id,
  name: review.name,
  selection_id: review.selection_id,
  authority_effect: "none",
  source_snapshot: sourceSnapshot,
  selection_policy: review.selection_policy,
  roots: {
    review_root: reviewRoot,
    data_root: dataRoot,
    collection_root: sha256(canonicalJson({ source_snapshot: sourceSnapshot, review_root: reviewRoot, data_root: dataRoot })),
  },
  data,
};
const encoded = `${JSON.stringify(document, null, 2)}\n`;
if (check) {
  if (readFileSync(outputPath, "utf8") !== encoded) throw new Error("Formal Conjectures collection snapshot is stale");
} else {
  writeFileSync(outputPath, encoded);
}
console.log(JSON.stringify({ ok: true, collection_root: document.roots.collection_root, commit: revision, tree, items: items.length }, null, 2));
