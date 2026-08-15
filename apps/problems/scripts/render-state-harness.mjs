#!/usr/bin/env bun

/*
  A development-only gallery of the Problems's Problem surface in every
  lifecycle state, rendered as static HTML outside Next.

  Why not a route. A dev-only route has to defeat four things at once: the
  scientific-authority boundary scanner, which enumerates route handlers by
  name; `check-public-routes.mjs`, which derives the route contract from the
  file tree in both directions; `next typegen`, which would have to know about a
  path production does not serve; and `PageShell`, which a scenario wrapper
  would nest inside its own. Rendering outside Next removes all four while
  still using the real page component through `renderToStaticMarkup`. Nothing
  in this file enters a build, a bundle, a manifest, or the route contract.

  Why it exists. The retained correction supplies one exact lifecycle path, but
  other error, empty, and unavailable states still have no live instance. A
  designer cannot inspect a state the data has never reached,
  and inventing that state in the projection would be falsifying scientific
  record. This renders it in the real components instead, and says on every
  scenario which of three tiers it belongs to:

    Retained    — the record as the live projection holds it.
    Composed    — real retained records recombined into a shape the release
                  does not currently contain.
    Constructed — no live instance exists; the values are illustrative.

  The tier word is inside each scenario's own heading, not only in a legend, so
  a cropped screenshot cannot lose it.

  Usage:  bun apps/problems/scripts/render-state-harness.mjs [--output DIR]
  Output is gitignored and served by nothing.
*/

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ProblemState } from "../src/components/vela/problem-state.tsx";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RETAINED = "Retained";
const COMPOSED = "Composed";
const CONSTRUCTED = "Constructed";

const root = (seed) => `sha256:${seed.repeat(64).slice(0, 64)}`;
const claimId = (seed) => `vcl_${seed.repeat(64).slice(0, 64)}`;

/* A fixed release fixture keeps the harness offline and makes its basis explicit. */
const LIVE = {
  release: "sha256:5c0df33530097a06a3be49cc26eb79fa65d3db5e9bc9aa7c89ecc646ec95256b",
  repositoryCommit: "c654010cfc7eb09d0f93f68c6792982d38f28b99",
};

function baseState(overrides = {}) {
  return {
    repositorySlug: "math",
    repositoryName: "Vela Mathematics",
    problem: {
      problem: "321",
      declared_status: "open",
      formalized: true,
      tags: [],
      oeis: [],
      source_ids: ["source:erdos-problems"],
      prize: null,
      lean_url: null,
      metadata: {},
    },
    repository: {
      status: {
        actions: {
          work: {
            mode: "direct_submission",
            command: "vela submit --repo . --help",
            note: "Submit bounded evidence directly.",
          },
        },
      },
    },
    claims: [],
    reviews: [],
    source: {
      source_id: "source:erdos-problems",
      native_id: "erdos:321",
      native_kind: "problem",
      row_root: root("2"),
      metadata_root: root("3"),
      observation_root: root("4"),
      content_root: root("5"),
    },
    sources: {
      schema: "vela.problem-source-read.v1",
      release_root: LIVE.release,
      resolver_root: root("a"),
      resolution_namespace: "erdos-problems",
      canonical_record: { source_id: "source:erdos-problems", native_id: "erdos:321" },
      problem_number: 321,
      entity: null,
      occurrences: [],
      statements: [],
      relations: [],
      identity_events: [],
      coverage: [],
      candidate_limit: 250,
    },
    anchor: {
      repositoryRoot: root("6"),
      projectionReleaseRoot: LIVE.release,
      sourceCommit: LIVE.repositoryCommit,
    },
    locator: "https://www.erdosproblems.com/321",
    sourceAudits: [],
    ...overrides,
  };
}

/* Every scenario the product needs. Where a live instance exists the values are
   the retained ones; where none does, the tier says so. */
const SCENARIOS = [
  {
    id: "unassessed",
    tier: RETAINED,
    title: "Open Problem the Repository has not assessed",
    note: "1,215 of 1,217 Problems are in this state. It is the default page, and it must not read as a broken one.",
    state: baseState(),
  },
  {
    id: "strong-evidence",
    tier: COMPOSED,
    title: "Problem with an accepted Assertion",
    note: "The Assertion is retained, while its exact source occurrence is not joined to this illustrative Problem state.",
    state: baseState({
      problem: { ...baseState().problem, declared_status: "solved", prize: "$500", tags: ["number theory"], oeis: ["A276661"] },
      claims: [{
        id: claimId("d"),
        assertion: "The Lean development starfleet/erdos-321 establishes a two-sided asymptotic bound on extremalSize, which denotes the same quantity as Formal Conjectures' Erdos321.R at pages commit 59f30aa3, and which therefore supplies a candidate answer for erdos_321.variants.isTheta rather than a proof of it.",
        standing: "accepted",
      }],
    }),
  },
  {
    id: "negative-result",
    tier: RETAINED,
    title: "Accepted Assertion that establishes a negative result",
    note: "A retained Claim whose content is that an implication does not hold. Accepted Standing on a negative finding is not a failure state.",
    state: baseState({
      claims: [{
        id: claimId("c"),
        assertion: "At the exact retained Erdős 321 source revisions, the terminal theorem and structural comparison do not establish implication to either fixed Nat.log variant.",
        standing: "accepted",
      }],
    }),
  },
  {
    id: "terminal-records",
    tier: COMPOSED,
    title: "Accepted, rejected and withdrawn Proposals on one Problem",
    note: "All three terminal statuses are retained in the release — three accepted, two rejected, one withdrawn — but no Problem page reaches them.",
    state: baseState({
      reviews: [
        { proposal_id: "vpr_4cce463df6f23e2b", status: "accepted", target: claimId("c"), claim: "Terminal bridge disposition", decision_provenance: "signed_record", decision_reason: "Admitted on exact retained evidence after two attributed Checks." },
        { proposal_id: "vpr_44ff50ca8cf1bd6e", status: "rejected", target: claimId("e"), claim: "Unscoped implication", decision_provenance: "signed_record", decision_reason: "The submitted evidence does not cover the quantified case it claims." },
        { proposal_id: "vpr_326639847c2fceab", status: "withdrawn", target: claimId("f"), claim: "Producer-withdrawn candidate", decision_provenance: "producer_withdrawal", decision_reason: null },
      ],
    }),
  },
  {
    id: "correction-with-descendants",
    tier: CONSTRUCTED,
    title: "Corrected Assertion with an unresolved descendant",
    note: "No live Claim carries corrected or superseded Standing, and no claim_retirement is recorded in the release. Correction-aware inheritance has never rendered.",
    state: baseState({
      claims: [
        { id: claimId("1"), assertion: "The original bound, corrected after an error was found in its third step.", standing: "corrected" },
        { id: claimId("2"), assertion: "A later assertion that depends on the corrected bound and has not been reassessed.", standing: "unassessed" },
      ],
      reviews: [
        { proposal_id: "vpr_correction", status: "accepted", target: claimId("1"), claim: "Correction", decision_provenance: "signed_record", decision_reason: "Corrects the third step; descendants require reassessment." },
      ],
    }),
  },
  {
    id: "mixed-standing",
    tier: CONSTRUCTED,
    title: "Source and Repository disagree",
    note: "The Source declares the question solved; the Repository has admitted nothing. Source status and Local Standing are separate axes and the page must never collapse them.",
    state: baseState({
      problem: { ...baseState().problem, declared_status: "solved" },
      claims: [],
    }),
  },
];

function page(bodies) {
  return `<!doctype html>
<html lang="en" data-theme="dark" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Problems state harness — non-authoritative</title>
<link rel="stylesheet" href="./harness.css">
</head>
<body>
<header class="harness-banner">
  <strong>Development state harness — not authoritative.</strong>
  Rendered outside Next from <code>apps/problems/scripts/render-state-harness.mjs</code>.
  Retained values come from release <code>${LIVE.release}</code>; Composed and Constructed values do not exist in any release and are not scientific record.
  <br>This renders outside Next and so carries none of the application's styling. It is a harness for structure, reading order, state coverage and copy — not for visual review, which belongs in the running app.
</header>
${bodies.join("\n")}
</body>
</html>`;
}

function scenarioSection(scenario, markup) {
  return `<section class="harness-scenario" id="${scenario.id}">
  <h1 class="harness-heading">${scenario.tier} · ${scenario.title}</h1>
  <p class="harness-note">${scenario.note}</p>
  <div class="harness-surface">${markup}</div>
</section>`;
}

const CSS = `:root { color-scheme: dark; }
body { margin: 0; background: #0b1220; color: #e9ebef; font-family: ui-sans-serif, system-ui, sans-serif; }
.harness-banner { padding: 1rem 1.5rem; background: #3a2a12; color: #f6e6c8; font-size: .8125rem; line-height: 1.5; border-bottom: 2px solid #c9a664; }
.harness-banner code { font-family: ui-monospace, monospace; font-size: .75rem; word-break: break-all; }
.harness-scenario { padding: 2.5rem 1.5rem 3.5rem; border-bottom: 1px solid #1e2a41; }
.harness-heading { margin: 0; font-size: 1rem; letter-spacing: .02em; color: #c9a664; }
.harness-note { margin: .5rem 0 0; max-width: 76ch; font-size: .8125rem; line-height: 1.55; color: #a1a7b0; }
.harness-surface { margin-top: 1.75rem; }
`;

async function main() {
  const args = process.argv.slice(2);
  const outputFlag = args.indexOf("--output");
  const output = outputFlag >= 0 && args[outputFlag + 1]
    ? resolve(args[outputFlag + 1])
    : resolve(appRoot, ".state-harness");

  await mkdir(output, { recursive: true });

  const bodies = [];
  for (const scenario of SCENARIOS) {
    const markup = renderToStaticMarkup(
      React.createElement(ProblemState, {
        state: scenario.state,
        basePath: `/p/math/${scenario.state.problem.problem}`,
      }),
    );
    bodies.push(scenarioSection(scenario, markup));
  }

  await writeFile(resolve(output, "harness.css"), CSS, "utf8");
  await writeFile(resolve(output, "index.html"), page(bodies), "utf8");

  const tiers = SCENARIOS.reduce((counts, scenario) => ({ ...counts, [scenario.tier]: (counts[scenario.tier] ?? 0) + 1 }), {});
  console.log(JSON.stringify({
    ok: true,
    schema: "vela.projection-state-harness.v1",
    authority_effect: "none",
    scenarios: SCENARIOS.length,
    tiers,
    release_basis: LIVE.release,
    output: resolve(output, "index.html"),
  }, null, 2));
}

await main();
