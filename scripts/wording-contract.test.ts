import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/*
  The retired noun, held out of the current surface by a test rather than by
  care.

  ADR 0039 made Repository the authority boundary and left Frontier a derived,
  identifier-free query that owns nothing. The Problems then spent three
  releases naming the boundary after the query: the table with one row per
  authority was `frontiers`, the route a reader landed on was `/frontiers`, and
  `product-language.ts` mapped the kind `frontier` onto the axis "Repository
  integrity" — the file that exists to keep the vocabulary honest, holding both
  words at once.

  Vela itself already bans the word from its help tree and error surface, and
  the reason that guard exists applies here with more force: this is the surface
  a reader actually sees. Two hand sweeps had already run over this repository's
  prose. A third would have found what the first two missed and left the fourth
  to someone else.

  Two properties, not one. A file not exempted may not say it, and an exemption
  that has stopped being needed has to be deleted — otherwise the next file to
  take that path inherits a pass nobody reviewed.
*/

const repositoryRoot = resolve(import.meta.dirname, "..");

/* Records, not current prose. Nothing here is edited to reflect a later
   decision: a plan says what was planned, a release note says what shipped,
   an evidence file carries the root of its own bytes, and the vendored docs
   say what the pinned Vela release said. Rewriting any of them would not
   update a record — it would falsify one. */
const RECORDS = [
  "docs/history/",
  "docs/releases/",
  "packages/projection-data/evidence/",
  "packages/projection-data/config/formal-conjectures/",
];

/* Prose in an authored voice. `constellations` coins "public frontier" as its
   own term, alludes to Vannevar Bush in its title, and carries a personal
   account; the essay components and the publication catalogue quote it. An
   argument is not a vocabulary to be swept, and a citation is not drift. */
const AUTHORED = [
  "content/editorial/source/src/app/essay.tsx",
  "content/editorial/source/src/components/essay/the-test.tsx",
  "content/editorial/source/src/components/editorial/masthead.tsx",
  "content/editorial/source/src/data/publications.ts",
  "content/editorial/source/public/images/constellations/endless-og.png",
];

/* Occurrences that are not the Vela noun at all, and would be wrong in any
   other spelling. Written as terms rather than as file paths because each is
   true wherever it appears, and a path list would let a real occurrence in
   beside one of them. */
const NOT_THE_VELA_NOUN: Array<[RegExp, string]> = [
  [/erdos-frontier/gu, "archived repository, an address rather than a word"],
  [/sidon-frontier/gu, "archived repository"],
  [/quantum-codes-frontier/gu, "archived repository"],
  [/formal-conjectures-frontier/gu, "archived repository"],
  [/vela-frontiers/gu, "archived repository"],
  [/[Ff]rontier[Mm]ath/gu, "the benchmark, a proper noun"],
  [/jagged[- ][Ff]rontier/gu, "term of art for the shape of model capability"],
  [/frontier[- ]risk/gu, "the governance term the source pages use"],
  [/[Ff]rontier[- ]lab/gu, "what those organizations are called"],
  [/[Ee]ndless [Ff]rontier/gu, "Vannevar Bush's 1945 report"],
  [/frontier-to-commons/gu, "the named disposition in the source schema"],
  [/disease-frontier/gu, "the named pilot in the essay"],
  [/volume_frontier|multibrotSet_frontier/gu, "Mathlib: the topological frontier of a set"],
];

/* Individual files that keep the word for a reason of their own, each with the
   reason it earns. Anything not on this list, in RECORDS, or in AUTHORED may
   not say it. */
const WHY_THE_WORD_STAYS: Array<[string, string]> = [
  [
    "apps/problems/vercel.json",
    "the permanent redirects that keep every published /frontiers URL reachable",
  ],
  [
    "eslint.bans.mjs",
    "the retired-component ban list, which has to name what it bans",
  ],
  [
    "packages/projection-data/tests/semantic-correction.test.ts",
    "epoch-1 fixture describing a correction in a repository identified vfr_0a25edabc16db143",
  ],
  [
    "packages/projection-data/tests/support/semantic-correction.ts",
    "the shape of that same fixture",
  ],
  [
    "scripts/wording-contract.test.ts",
    "this file, which cannot state the rule without naming what it forbids",
  ],
];

const RETIRED = /frontier/iu;

/** Every tracked text file, read through git so nothing untracked or ignored
 *  can quietly satisfy the rule. */
function trackedText(): string[] {
  const listed = spawnSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (listed.status !== 0) throw new Error(`git ls-files failed: ${listed.stderr}`);
  const paths = listed.stdout.split("\0").filter(Boolean);
  /* A guard that reads nothing passes. */
  expect(paths.length).toBeGreaterThan(300);
  return paths;
}

const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|bundle|sig)$/u;

function currentProse(path: string): string | null {
  if (RECORDS.some((tree) => path.startsWith(tree))) return null;
  if (AUTHORED.includes(path)) return null;
  if (BINARY.test(path)) return null;
  try {
    return readFileSync(resolve(repositoryRoot, path), "utf8");
  } catch {
    return null;
  }
}

/** What is left after every occurrence that is not the Vela noun is removed. */
function velaNounHits(body: string): string[] {
  let text = body;
  for (const [term] of NOT_THE_VELA_NOUN) text = text.replaceAll(term, "");
  return text
    .split("\n")
    .map((line, index) => [index + 1, line] as const)
    .filter(([, line]) => RETIRED.test(line))
    .map(([number, line]) => `${number}: ${line.trim().slice(0, 120)}`);
}

describe("the retired noun stays off the current surface", () => {
  test("no current file names a Frontier", () => {
    const allowed = new Set(WHY_THE_WORD_STAYS.map(([path]) => path));
    const offenders: string[] = [];
    for (const path of trackedText()) {
      if (allowed.has(path)) continue;
      const body = currentProse(path);
      if (body === null) continue;
      for (const hit of velaNounHits(body)) offenders.push(`${path}:${hit}`);
    }
    expect(offenders).toEqual([]);
  });

  /* The half a list of exceptions never has. Without it an entry outlives its
     reason, and the next file to take that path is exempt for a reason that
     stopped being true before it was written. */
  test("every exception is still earned", () => {
    const unearned: string[] = [];
    for (const [path, reason] of WHY_THE_WORD_STAYS) {
      const body = currentProse(path);
      if (body === null) {
        unearned.push(`${path} is gone or exempt twice — delete the entry (${reason})`);
        continue;
      }
      if (velaNounHits(body).length === 0) {
        unearned.push(`${path} no longer says it — delete the entry (${reason})`);
      }
    }
    expect(unearned).toEqual([]);
  });

  /* A term allowlist is the more dangerous half: it applies everywhere at once.
     Each entry has to still match something, or it is a hole nobody is
     watching. */
  test("every protected term is still present somewhere", () => {
    const corpus = trackedText()
      .filter((path) => !BINARY.test(path))
      .map((path) => {
        try {
          return readFileSync(resolve(repositoryRoot, path), "utf8");
        } catch {
          return "";
        }
      })
      .join("\n");
    const absent = NOT_THE_VELA_NOUN
      .filter(([term]) => !corpus.match(term))
      .map(([term, reason]) => `${term} (${reason})`);
    expect(absent).toEqual([]);
  });
});
