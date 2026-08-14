import { describe, expect, test } from "bun:test";
import { allRepositories, problemCatalogForRepository, problemRepositorySlugs, problemsForRepository } from "../src/index";

const hasDatabase = Boolean(process.env.VELA_PROJECTION_DATABASE_URL);
if (process.env.VELA_REQUIRE_PROJECTION_TESTS === "1" && !hasDatabase) {
  throw new Error("projection integration tests require VELA_PROJECTION_DATABASE_URL");
}
const describeProjection = hasDatabase ? describe : describe.skip;

const wholeCorpus = 60_000;

/* Read once. Every assertion below is about the same rows, and the ledger
   answers a page at a time. */
let corpus: ReturnType<typeof readEveryProblem> | undefined;

async function readEveryProblem(slug: string) {
  const first = await problemsForRepository(slug, { limit: 250 });
  const items = [...first.items];
  for (let offset = 250; offset < first.total; offset += 250) {
    items.push(...(await problemsForRepository(slug, { limit: 250, offset })).items);
  }
  return { slug, items, total: first.total, facets: first.facets };
}

/* Whichever repository publishes Problems, rather than a slug spelled out
   here. The suite asked for `erdos`, and the registry now holds `math`, so
   every assertion ran against an empty result and reported a working ledger
   as broken. */
async function ledgerSlug(): Promise<string | null> {
  const slugs = await problemRepositorySlugs();
  return slugs[0] ?? null;
}

async function everyProblem(slug: string) {
  corpus ??= readEveryProblem(slug);
  return corpus;
}

/*
  Declared status, formalization, prize and subject tags are fields of the
  Source record. They used to be recovered by regular expression from prose the
  repository builder wrote into a Claim's assertion, in two templates, and a
  pattern reading only one returned NULL on the other.

  What replaced that has the same failure mode one layer down. A native record's
  metadata is flat scalars by contract, the adapter nested four of these fields
  inside objects, and the projection retained each one as the text of its own
  JSON — so `metadata -> 'status' ->> 'state'` was NULL on all 1,217 problems
  and the page drew a source that had recorded nothing. Silence, again, and no
  exception anywhere. These assertions turn it into a failing refresh.

  Statements are not among them. `source:erdos-problems` is declared
  `reference_only` with `retention: "none"`: the prose lives on
  erdosproblems.com, which this repository does not observe, and the adapter
  discloses the omission rather than retaining bytes its rights do not cover. A
  Problem here is an identifier, a locator and the labels upstream publishes.
*/
describeProjection("what the Problem ledger reads off a Source record", () => {
  test("the declared statuses account for every problem the release publishes", async () => {
    const slug = await ledgerSlug();
    if (!slug) {
      console.info("skipped: the release publishes no Problem");
      return;
    }
    const { items, total, facets } = await everyProblem(slug);
    const repository = (await allRepositories()).find((entry) => entry.slug === slug);

    /* The manifest's own count, which counts source-native problem records.
       It counted problem-kind graph nodes, and a graph node exists only where
       a Claim does, so this compared 1,217 rows against zero. */
    expect(total).toBe(repository?.graph?.problem_count ?? 0);
    expect(items).toHaveLength(total);
    expect(total).toBeGreaterThan(0);

    /* A status the projection failed to read is NULL, and the facet drops it.
       So the counts summing to the release's own problem count is the check: it
       holds without naming a single quantity this file has to maintain. */
    const declared = facets.status.reduce((sum, value) => sum + value.count, 0);
    expect(declared).toBe(total);
    expect(items.filter((problem) => !problem.declared_status)).toHaveLength(0);

    /* Upstream regenerates `status` from `informal_status` and `formal_status`,
       and its combined vocabulary is wider than the primitive one. Losing the
       combination looks exactly like a cohort the source never recorded. */
    const primitive = ["open", "proved", "disproved", "solved"];
    expect(facets.status.some((value) => !primitive.includes(value.value))).toBe(true);
  }, wholeCorpus);

  test("each status carries a formalized split that partitions it", async () => {
    const slug = await ledgerSlug();
    if (!slug) {
      console.info("skipped: the release publishes no Problem");
      return;
    }
    const { facets } = await everyProblem(slug);
    expect(facets.status.length).toBeGreaterThan(0);
    for (const status of facets.status) {
      expect(status.parts?.map((part) => part.label)).toEqual(["formalized", "not formalized"]);
      expect(status.parts?.reduce((sum, part) => sum + part.count, 0)).toBe(status.count);
    }
    const split = facets.status.reduce((sum, status) => sum + (status.parts?.[0]?.count ?? 0), 0);
    const formalization = facets.formalization.find((value) => value.value === "formalized");
    expect(split).toBe(formalization?.count);
  }, wholeCorpus);

  /* The tail of the record: the fields beside the status, each read from its
     own metadata key and none derived from another. */
  test("every row carries the subject tags and the prize the source declared", async () => {
    const slug = await ledgerSlug();
    if (!slug) {
      console.info("skipped: the release publishes no Problem");
      return;
    }
    const { items } = await everyProblem(slug);
    expect(items.filter((problem) => problem.tags.length === 0)).toHaveLength(0);
    /* `Prize: no.` is a declared absence on most problems and must never reach
       the eyebrow as a word. What survives is a currency mark and a number. */
    for (const problem of items) {
      if (problem.prize) expect(problem.prize).toMatch(/^\D{1,2}[\d,]+$/u);
    }
    /* Statements are gone by design: this source is `reference_only` with
       `retention: "none"`, so a row carries a locator to the prose and none of
       it. A release that started retaining them would be retaining bytes its
       declared rights do not cover. */
    expect(items.every((problem) => problem.statement === "")).toBe(true);
    expect(items.every((problem) => problem.source_ids.length > 0)).toBe(true);
  }, wholeCorpus);

  test("keeps upstream status and Repository-local Standing on separate fields", async () => {
    const slug = await ledgerSlug();
    if (!slug) return;
    const { items } = await everyProblem(slug);
    expect(items.every((problem) => typeof problem.declared_status === "string")).toBe(true);
    expect(items.every((problem) => problem.local_standing === null || typeof problem.local_standing === "string")).toBe(true);
    /* A Source can report that a Problem is proved without this Repository
       having admitted a Claim about that exact source-native object. Requiring
       an accepted row here fabricated that binding from unrelated Repository
       state. The counterexample is the contract: upstream resolution remains
       visible while Repository-local Standing stays absent. */
    expect(items.some((problem) =>
      problem.declared_status !== "open" && problem.local_standing === null
    )).toBe(true);
  }, wholeCorpus);

  /* Formalization is a flag, and the Lean link is a separate upstream field on
     `formal_status`. They were asserted to agree row for row, which was true of
     a release that scraped the link out of a references array; upstream
     maintains them independently, and at the pinned commit 604 problems are
     declared formalized while five carry a link. Requiring agreement would make
     this suite demand that the projection invent one of the two numbers. What
     must hold is that each is read from its own field: a link never implies the
     flag, and the flag never implies a link. */
  test("the formalization flag and the retained Lean URL are read apart", async () => {
    const slug = await ledgerSlug();
    if (!slug) {
      console.info("skipped: the release publishes no Problem");
      return;
    }
    const { items } = await everyProblem(slug);
    const formalized = items.filter((problem) => problem.formalized);
    const linked = items.filter((problem) => problem.lean_url);
    expect(formalized.length).toBeGreaterThan(0);
    expect(linked.every((problem) => problem.lean_url!.startsWith("http"))).toBe(true);
    /* Neither is the other's proxy, so neither may be its derivation. */
    expect(linked.length).not.toBe(formalized.length);
  }, wholeCorpus);

  test("a repository is offered the section exactly when it has rows", async () => {
    const slugs = await problemRepositorySlugs();
    for (const repository of await allRepositories()) {
      const problems = await problemsForRepository(repository.slug, { limit: 1 });
      expect(problems.total).toBe(repository.graph?.problem_count ?? 0);
      expect(slugs.includes(repository.slug)).toBe(problems.total > 0);
    }
  }, wholeCorpus);

  test("the bounded discovery catalogue equals the exact ledger rows without running facets", async () => {
    const slug = await ledgerSlug();
    if (!slug) return;
    const ledger = await everyProblem(slug);
    const catalog = await problemCatalogForRepository(slug, { limit: 5_000 });
    expect(catalog.total).toBe(ledger.total);
    expect(catalog.items).toEqual(ledger.items);
  }, wholeCorpus);

  test("a narrowed facet keeps its siblings and its own alternatives", async () => {
    const slug = await ledgerSlug();
    if (!slug) {
      console.info("skipped: the release publishes no Problem");
      return;
    }
    const all = await problemsForRepository(slug, { limit: 1 });
    const widest = all.facets.status[0];
    expect(widest).toBeDefined();
    const narrowed = await problemsForRepository(slug, { status: widest!.value, limit: 1 });
    expect(narrowed.total).toBe(widest!.count);
    expect(narrowed.facets.status).toHaveLength(all.facets.status.length);
    expect(narrowed.facets.formalization.reduce((sum, value) => sum + value.count, 0))
      .toBe(narrowed.total);
  }, wholeCorpus);

  /* A number is an identifier, matched exactly and by prefix, and numeric order
     puts the exact match first. Anything else is language, run against
     `search_document` under the `simple` configuration because the projection
     builds that vector unstemmed. Both branches are read off the release rather
     than off a literal that only held in one epoch. */
  test("search dispatches on what was typed", async () => {
    const slug = await ledgerSlug();
    if (!slug) {
      console.info("skipped: the release publishes no Problem");
      return;
    }
    const { items } = await everyProblem(slug);
    const numbered = items.find((problem) => /^[0-9]{3,}$/u.test(problem.problem));
    if (numbered) {
      const numeric = await problemsForRepository(slug, { q: numbered.problem, limit: 5 });
      expect(numeric.items[0]?.problem).toBe(numbered.problem);
      expect(numeric.items.every(
        (problem) => problem.problem.startsWith(numbered.problem),
      )).toBe(true);
    }

    /* The other branch, reached by anything that is not all digits. The term is
       the namespace of an identifier the release publishes, so this asks the
       search whether it indexes what the ledger holds rather than whether one
       literal word survived a change of corpus. */
    const namespace = items[0]?.node_id.split(":")[0];
    expect(namespace).toMatch(/^[a-z][a-z-]+$/u);
    const language = await problemsForRepository(slug, { q: namespace!, limit: 5 });
    expect(language.total).toBeGreaterThan(0);
    /* Not the numeric branch: a prefix match on the number would return one
       cohort, and this returns records whose identifier shares a namespace. */
    expect(language.items.every(
      (problem) => problem.node_id.startsWith(`${namespace}:`),
    )).toBe(true);
  }, wholeCorpus);
});
