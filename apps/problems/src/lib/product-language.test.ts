import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { stateAxesByWord } from "@vela/ui/vela/status-badge";
import { kindLabel, recordHeading, recordTitle, stateAxis, stateLabel, stateOptionGroups } from "./product-language";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), "src", path), "utf8");
}

function productContract() {
  return readFileSync(resolve(process.cwd(), "..", "..", "PRODUCT.md"), "utf8");
}

/* PRODUCT.md retires Finding, Work, Review, Activity, Run and Bundle. The
   sidebar was the only file checked for them, so they came back everywhere
   else: a sheet footer that said "Open activity" over `/decisions`, a stat
   labelled "Open review", and a table column headed "Finding".
 *
 * The scan reads the two places the retirement actually binds — the name of a
 * destination and the heading of a section — because that is what PRODUCT.md
 * says the table governs: "navigation, headings, and URLs all follow it". A
 * `label=` or `title=` prop is a field label carrying a retained value, and an
 * Alert title is a sentence about a fact, so neither is read here; prose is
 * free to use `work` and `review` as the ordinary English words TERMINOLOGY.md
 * keeps as navigation verbs. */
const RETIRED = /\b(finding|findings|work|review|activity|activities|run|runs|bundle|bundles)\b/iu;

const HEADINGS = "h1|h2|h3|h4|th|TableHead|SheetTitle|EmptyTitle|ItemTitle";

/* A choice in a control group names a destination the same way a link does, so
   the two toggle primitives are read alongside Button and Link. */
const CHOICES = "Button|Link|ToggleGroupItem|TabsTrigger";

function destinationsAndHeadings(contents: string): string[] {
  const stripped = contents
    .replace(/^import[\s\S]*?from\s+".*?";$/gmu, "")
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/gu, "")
    .replace(/^\s*\/\/.*$/gmu, "");
  const found: string[] = [];
  const push = (text: string) => {
    const value = text.replace(/\s+/gu, " ").trim();
    if (value) found.push(value);
  };
  for (const match of stripped.matchAll(/\blabel:\s*"([^"\n]+)"/gu)) push(match[1]);
  /* Prettier breaks a long element across lines, so a pattern that stops at a
     newline reads nothing at all on exactly the elements most likely to carry a
     retired word. Both scans span lines and the whitespace is collapsed after. */
  for (const match of stripped.matchAll(new RegExp(`<(?:${HEADINGS})\\b[^>]*>([^<{}]+)`, "gu"))) push(match[1]);
  for (const element of stripped.matchAll(new RegExp(`<(${CHOICES})\\b[\\s\\S]*?</\\1>`, "gu"))) {
    for (const text of element[0].matchAll(/>([^<>{}]+)</gu)) push(text[1]);
  }
  return found;
}

describe("current product language", () => {
  it("classifies the five public product nouns without promoting them to protocol authority", () => {
    const contract = productContract();
    expect(contract).toContain("The Problem is the primary public object.");
    expect(contract).toContain("The canonical Problem modes are:");
    for (const label of ["Overview", "Work", "Results", "Sources", "History"]) {
      expect(contract).toContain(`**${label}**`);
    }
    expect(contract).toContain("The user-facing durable output is a **Result**.");
    expect(contract).toContain("Use **contribution** for the act of adding work");
    expect(contract).toContain("WorkOS identity, GitHub access, connected codebases");
    expect(contract).toContain("Login identity, scientific attribution, and Repository");
    expect(contract).toContain("Hosted Problems cannot sign for a user, issue a Vela Event or Decision");
    expect(contract).toContain("Hosted Problems may mutate account, shared workspace");
    expect(contract).not.toMatch(/local Workbench/iu);
  });

  it("separates the user-intent product navigation from contextual scientific records", () => {
    const sidebar = source("components/vela/app-sidebar.tsx");
    for (const label of ["Home", "Problems", "Updates", "My work"]) {
      expect(sidebar).toContain(`label: "${label}"`);
    }
    expect(sidebar).toContain("Add contribution");
    expect(sidebar).toContain("Erdős Problems");
    expect(sidebar).not.toContain('label: "Hubs"');
    expect(sidebar).not.toContain('label: "Review"');
    /* Search stays in the command control; scientific records and maps are
       contextual destinations rather than permanent global navigation. The
       exclusion is scoped to the global spine, because a Problem's own
       sections legitimately carry some of the same words. */
    const spine = sidebar.slice(sidebar.indexOf("const PRIMARY_DESTINATIONS"), sidebar.indexOf("export function AppSidebar"));
    for (const label of ["Search", "Research map", "Release details", "Repositories", "Sources", "Assertions", "Proposed changes"]) {
      expect(spine).not.toContain(`label: "${label}"`);
    }
    /* One control names the Problem's sections, and it is the Problem's own
       header. The rail carried them for a while; the page then named the same
       object three times and offered no way out of it. */
    expect(sidebar).not.toContain("PROBLEM_SECTIONS");
    expect(source("components/vela/problem-header.tsx")).toContain('aria-label="Problem sections"');
    expect(source("components/vela/problem-overview-reference.tsx")).not.toContain('aria-label="Problem sections"');
    /* The repository tab bar owns section naming; the header carries only the
       ancestor it does not provide. */
    expect(source("components/vela/app-header.tsx")).not.toContain('repositoryCollectionTitles');
    expect(source("app/repositories/[slug]/claims/page.tsx")).toContain(
      'RouteTitle title="Assertions"',
    );
  });

  it("uses reader-facing contribution labels while preserving exact protocol kinds in provenance", () => {
    const chain = source("components/vela/proposal-object-chain.tsx");
    const evidence = source("components/vela/proposal-evidence.tsx");
    expect(chain).toContain('return "Published contribution"');
    expect(chain).toContain("<ItemTitle>Proposed change</ItemTitle>");
    expect(chain).not.toContain("<ItemTitle>Check</ItemTitle>");
    expect(evidence).toContain("data-verification-record-id={record.verification_record_id}");
    expect(evidence).toContain("<ItemTitle>Verification Record</ItemTitle>");
    expect(chain).toContain('label="Exact Submission ID"');
    expect(chain).toContain('label="Exact Proposal ID"');
    expect(chain).not.toContain('label="Exact Verification Record ID"');
    const record = source("app/repositories/[slug]/claims/[id]/page.tsx");
    expect(record).not.toContain("historical Finding era");
    expect(record).not.toContain("Historical Finding ID");
    expect(record).toContain('label="Claim ID"');
    expect(record).toContain('label="Claim root"');
  });

  it("does not expose historical graph kinds as current object names", () => {
    /* Protocol kinds remain exact underneath, while product lists use the
       public object language a reader is choosing between. */
    expect(kindLabel("claim")).toBe("Result");
    expect(kindLabel("verifier_attachment")).toBe("historical check attachment");
    expect(kindLabel("proposal")).toBe("proposed change");
    /* The mapping had two byte-identical homes and could drift; the controllers
       read it from here now, and this is what keeps them from taking it back. */
    for (const path of [
      "components/controllers/repository-graph.tsx",
      "components/controllers/search-results.tsx",
    ]) {
      const contents = source(path);
      expect(contents).not.toContain("function kindLabel");
      expect(contents).toContain('from "@/lib/product-language"');
    }
  });

  it("names a state's own axis rather than presenting four vocabularies as one", () => {
    /* DESIGN.md's State table: rejected and withdrawn are Proposal statuses,
       never standing, and a passing verifier is not an acceptance. */
    expect(stateAxis("rejected")).toBe("proposal");
    expect(stateAxis("withdrawn")).toBe("proposal");
    expect(stateAxis("verified")).toBe("verification");
    expect(stateAxis("strict_pass")).toBe("integrity");
    expect(stateAxis("retracted")).toBe("standing");
    /* `accepted` is the one word legal on two axes, so the row's kind decides. */
    expect(stateAxis("accepted", "claim")).toBe("standing");
    expect(stateAxis("accepted", "proposal")).toBe("proposal");
    expect(stateAxis("accepted", "commit")).toBeNull();
    /* Words the protocol does not name make no axis claim at all. */
    expect(stateAxis("historical_reference", "claim_reference")).toBeNull();
    /* `recorded` and `contested` were filed under standing in the badge's map,
       so every Artifact and Problem row read "Claim standing · recorded" —
       naming a vocabulary that contains neither word. Claim standing runs
       unassessed, accepted, accepted_with_conditions, retracted, superseded,
       corrected, and `accepted_with_conditions` is the one the map had been
       missing. */
    expect(stateAxis("recorded", "artifact")).toBeNull();
    expect(stateAxis("recorded", "problem")).toBeNull();
    expect(stateAxis("contested", "claim")).toBeNull();
    expect(stateLabel("recorded", stateAxis("recorded", "artifact"))).toBe("recorded");
    expect(stateAxis("accepted_with_conditions", "claim")).toBe("standing");

    expect(stateLabel("strict_pass", stateAxis("strict_pass"))).toBe("integrity · strict pass");
  });

  it("takes the word-to-axis map from the badge rather than keeping a second copy", () => {
    /* The badge already files every state under an axis, and this module was
       repeating that map — two lists of twenty words that a new state would
       land in one of. It derives from `stateAxesByWord` now, and every word the
       badge knows must come through with the badge's own answer. */
    expect(source("lib/product-language.ts")).not.toMatch(/const axisByState[^=]*=\s*\{/u);
    for (const [state, axis] of Object.entries(stateAxesByWord)) {
      /* `accepted` is the sole exception, and deliberately so: the badge can
         file a word under one axis only, so it picks standing. Here it is dual
         and the kind decides, which the case above pins. */
      if (state === "accepted") continue;
      expect(stateAxis(state)).toBe(axis);
    }
  });

  it("groups one state filter's options under the axis each word belongs to", () => {
    const groups = stateOptionGroups(["accepted", "recorded", "reviewed", "contested", "strict_pass", "verified", "withdrawn"]);
    expect(groups.map((group) => group.label)).toEqual([
      "Local Standing or Proposed change status",
      "Check outcome",
      "Proposed change status",
      "Repository integrity",
      "Outside the state axes",
    ]);
    expect(groups.at(-1)?.values).toEqual(["contested", "recorded"]);
  });

  it("offers only kinds the projection writes into a search document", () => {
    const search = source("components/controllers/search-results.tsx");
    /* Search documents and graph nodes both carry kind `claim` now. While the
       graph wrote `finding`, an option named for it matched nothing, because
       the builder keeps Claim nodes out of the search projection entirely. */
    expect(search).toContain('"repository", "claim", "problem"');
    expect(search).not.toContain('"finding"');
  });

  it("keeps the retired words out of every destination name and heading, not only the sidebar", () => {
    for (const path of [
      "components/vela/notification-center.tsx",
      "app/repositories/[slug]/contribute/page.tsx",
      "app/repositories/page.tsx",
      "app/repositories/[slug]/claims/[id]/page.tsx",
      "app/repositories/[slug]/proposals/[proposalId]/page.tsx",
      "app/repositories/[slug]/problems/[problem]/page.tsx",
      "components/controllers/repository-graph.tsx",
    ]) {
      for (const name of destinationsAndHeadings(source(path))) {
        expect(name, `retired product word in ${path}`).not.toMatch(RETIRED);
      }
    }
  });

  it("reads the destination names and headings it claims to read", () => {
    /* The scan is a regex over source, so it is worth nothing if it silently
       matches nothing. These are the shapes the regressions took. The last two
       are why the earlier version of this test proved less than it looked: it
       posed only single-line elements, and the pattern stopped at a newline, so
       a prettier-wrapped Button and a lens toggle were both read as empty. */
    const found = destinationsAndHeadings(`
      const items = [{ label: "Open review" }];
      export function Surface() {
        return <>
          <th className="py-2">Finding</th>
          <Button render={<Link href="/decisions" />}>Open activity</Button>
          <EmptyTitle>No published review needs attention</EmptyTitle>
          <Button
            nativeButton={false}
            render={
              <Link
                href={\`/repositories/\${slug}/contribute#\${id}\`}
              />
            }
          >
            Open ranked work
          </Button>
          <ToggleGroupItem value="activity" size="sm">Activity</ToggleGroupItem>
        </>;
      }
    `);
    expect(found).toEqual([
      "Open review",
      "Finding",
      "No published review needs attention",
      "Open activity",
      "Open ranked work",
      "Activity",
    ]);
    for (const name of found) expect(name).toMatch(RETIRED);
  });
});

describe("recordHeading", () => {
  /* The heading used to be the id on every kind, so a search result and a
     browser tab both read as 76 characters of hexadecimal. */
  it("names a record by its own text, not its content address", () => {
    expect(recordHeading({ id: "vcl_8ef85fca", assertion: "Erdos730 proves infinitude." }))
      .toBe("Erdos730 proves infinitude.");
  });

  /* An Artifact's assertion IS its digest, so there is nothing else to show and
     the caller must fall back to the id rather than print the digest twice. */
  it("has no heading for a record whose text is a bare digest", () => {
    const digest = "a".repeat(64);
    expect(recordHeading({ id: `artifact:${digest}`, assertion: digest })).toBeNull();
    expect(recordHeading({ id: "vcl_5d28", assertion: "vcl_5d28" })).toBeNull();
    expect(recordHeading({ id: "vcl_5d28", assertion: "  " })).toBeNull();
  });

  /* A tab shows perhaps forty characters, and a Claim's assertion runs to
     several sentences. */
  it("cuts a title at the first sentence and falls back to a hard cap", () => {
    expect(recordTitle({
      id: "vcl_1",
      assertion: "Erdős Problem #1113: declared status 'open'. Formalized: yes. A positive odd integer.",
    })).toBe("Erdős Problem #1113: declared status 'open'.");
    const unbroken = `x${"y".repeat(200)}`;
    expect(recordTitle({ id: "vcl_2", assertion: unbroken })).toHaveLength(110);
    expect(recordTitle({ id: "vcl_3", assertion: null })).toBe("vcl_3");
  });
});

/* Two surfaces the scan above never reads, and both shipped something false.
 *
 * `destinationsAndHeadings` reads labels, headings and control text. A route's
 * `metadata.description` is none of those — it is what a search engine indexes
 * and what a link preview shows — and an `aria-label` is what a screen reader
 * announces in place of the visible text. `/repositories` described "four pinned
 * Vela repository checkouts" against a registry holding one, and `/graph` called
 * itself "complete" over a graph with zero nodes, in both its description and
 * its landmark label.
 *
 * These read a different vocabulary. `RETIRED` above is about naming a
 * destination after an activity; this is TERMINOLOGY.md's four words that may
 * never appear unqualified, plus a spelled-out cardinality, which is wrong the
 * moment the projection publishes a different set. */
const UNQUALIFIED = /\b(verified|valid|approved|complete)\b/iu;
const SPELLED_COUNT = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:pinned|exact|published|Vela|repositor|repository)/iu;

describe("indexed and announced text", () => {
  const ROUTES = [
    "app/repositories/page.tsx",
    "app/graph/page.tsx",
    "app/sources/page.tsx",
    "app/decisions/page.tsx",
    "app/contribute/page.tsx",
    "app/proposals/page.tsx",
    "app/search/page.tsx",
  ];

  it("describes a route without a banned word or a spelled-out count", () => {
    for (const route of ROUTES) {
      for (const match of source(route).matchAll(/\bdescription:\s*"([^"\n]+)"/gu)) {
        expect(match[1], `${route} description`).not.toMatch(UNQUALIFIED);
        expect(match[1], `${route} description`).not.toMatch(SPELLED_COUNT);
      }
    }
  });

  it("announces a landmark without a banned word", () => {
    for (const route of ROUTES) {
      for (const match of source(route).matchAll(/\baria-label="([^"\n]+)"/gu)) {
        expect(match[1], `${route} aria-label`).not.toMatch(UNQUALIFIED);
      }
    }
  });
});
