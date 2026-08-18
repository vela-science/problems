---
register: product
product: problems.science
version: 2026-08-18
---

# problems.science product brief

## Product in one sentence

problems.science is a place to find scientific problems, understand what is
currently known, see work and durable results, and contribute evidence.

The Problem is the primary object. The public product should feel like a
scientific working document, not a protocol explorer, an internal state console,
or a marketing site.

## People and jobs

Researchers, reviewers, maintainers, and tool-using agents come here to:

- find a question by wording, number, field, or collection;
- understand the current scientific picture without reading raw records;
- inspect durable Results, their evidence, checks, sources, and limitations;
- see active Work without confusing it with published Results;
- understand how corrections and decisions changed Repository-local state;
- start a contribution, connect code, or continue in a local tool;
- resume private workspaces and manage account connections.

Human and AI performers use the same provenance hierarchy. Performer kind is
not a quality score; method, evidence, environment, independence, and limits are
what make work interpretable.

## Ten-second Problem test

Every Problem page must answer these questions within ten seconds:

1. What is the problem?
2. What is currently known?
3. What is being tried?
4. What results exist?
5. How did the state get here?

If the data does not answer one of them, show a compact honest missing state.
Do not replace missing scientific data with explanatory prose.

## Current release truth

Today there is one published Problem collection: **1,217 Erdős Problems**.
`/problems` is the global entry and states this plainly.
`/problems/erdos-problems` is the collection directory. A number such as `321`
is meaningful only inside the collection.

Formal Conjectures, Lean libraries, VibeMathed, TheoremDB, papers, datasets,
and code repositories may appear as sources or evidence. They are not Problem
collections unless they publish stable source-owned Problem identities through
an accepted collection profile.

## Visible information architecture

Primary navigation:

- Problems
- Research map
- Updates
- My work when signed in
- Search
- the product mark for Home

The canonical Problem tabs are:

- **Overview** — question, orthogonal state, current synthesis, landmarks,
  open targets, latest Results, representations, and exact related Problems;
- **Work** — mutable shared workspace, approaches, attempts, canvas, Research
  Blocks, notes, and local handoff;
- **Results** — durable outputs, checks, decisions, evidence, and limitations;
- **Sources** — collection entry, retained excerpts, declarations, paths,
  revisions, and source links;
- **History** — semantic chronology, corrections, supersession, and diffs.

Files are a recognizable instrument inside Sources, Work, or an individual
Result. They are not a primary conceptual mode. A relationship map is a
contextual action and a global Explore destination, not a sixth Problem tab.

Durable old `view=` links map into the five current views. Internal navigation
generates only the current names.

## Public language

The user-facing durable output is a **Result**. It may be a proof, computation,
dataset, review, negative result, correction, or other bounded evidence.
Underlying Vela records and types remain unchanged and may be named in
technical disclosure.

Use **contribution** for the action of adding work and for exact technical
identity where necessary. Use **Work** for mutable approaches and attempts.
Use **Result** for durable outputs a reader can inspect.

Keep these axes separate:

- formal target, such as open or proved in retained formal material;
- source-reported status, visibly attributed to its collection;
- Repository decision on an exact contribution;
- evidence and check outcomes;
- publication or workspace state.

An accepted contribution does not mean the Problem is solved. A passing check
does not accept a contribution. A signature proves attribution, not truth.

## Core workflows

### Discover

Home is the activation front door: search, Browse problems, Add a contribution,
one-collection truth, useful questions, coverage, and recent changes. It is not
a manifesto or a signed-in analytics dashboard.

Problems and collection pages use question-led rows, useful filters, exact
counts, and honest coverage views. Search leads with human labels and always
qualifies numeric Problem identities by collection.

### Read

The Problem question leads. Overview synthesizes the strongest exact data into
one reference screen. It does not repeat the tab labels as explanatory
sections. A compact fact rail carries stable identity and representation facts.
Technical roots live behind disclosure.

### Inspect Results and Sources

Results show the claim, Result type, producer, evidence, checks, Repository
decision, revision, and linked sources. Checks use outcome-appropriate glyphs.
Sources use a familiar tree/list plus selected preview. When full bytes are not
retained or rights prevent display, show the exact retained excerpt or
declaration and an Open exact source action.

### Work and contribute

The browser may host shared, authority-free coordination: workspaces, follows,
approaches, attempts, notes, Research Blocks, selected artifact references, and
unsigned Submission v3 drafts.

The contribution path is:

1. choose a Problem;
2. attach work and evidence;
3. review scope and checks;
4. submit an unsigned handoff.

Repository checkout, local files, terminals, proof or experiment execution,
secrets, generic agent sessions, signing, and key custody stay in local tools.
The browser offers explicit Open source or Continue locally handoffs; it does
not simulate an IDE or upload local state implicitly.

### Follow change

Updates and History use semantic chronology. They show what changed, who or
what acted, and the affected Problem or Result. Exact hashes and roots appear
only after expansion. Corrections retain before/after comparison.

### Account and continuity

Account is a private hub for sign-in identity, connected GitHub access, saved
work, exact codebase revisions, session controls, and next actions. My work is
for resuming workspaces. WorkOS identity, scientific attribution, and Vela
authority remain explicitly separate.

## Product principles

- Start with the object and the action, not system vocabulary.
- Prefer a working visual instrument over a prose explanation of the instrument.
- Use familiar search, file, diff, timeline, canvas, settings, and repository patterns.
- Use real data for every count, node, edge, chart, preview, and status.
- Exact identity is authoritative; similarity and orientation are advisory.
- Treat empty, loading, degraded, stale, disconnected, and error states as product states.
- Preserve durable links and URL-backed selection, filters, and tabs.
- Keep primary screens concise; disclose provenance where it changes interpretation.
- Do not infer scientific summaries, open targets, family membership, or relationships.

## Authority boundary

Canonical scientific state remains in Repository Git history. The hosted
scientific projection is SELECT-only and reconstructable. Hosted activity is
non-authoritative. The application cannot sign, issue a scientific Decision,
change Standing, or hold a Repository authority key.

## Success criteria

- A newcomer can say what the product is, what exists today, and where to begin.
- A Problem answers the ten-second test on desktop, mobile, and 200% zoom.
- Results, Sources, Work, History, and exact relationships are discoverable
  without knowing a hidden URL.
- Question and collection identity remain legible at 320px.
- Keyboard, touch, forced colours, reduced motion, print, and screen readers
  preserve the same task order.
- Heavy maps and canvases load below a useful server-rendered frame and retain
  a list or text equivalent.
- No hosted action crosses the authority boundary.

## Copy failures

Remove copy that only repeats a visible badge, label, row, edge, tab, or action.
Avoid vague words such as platform, network, coordination, bounded, authority,
record, root, and standing in first-use copy. Use those terms only where they
change a decision or in technical detail.

Never ship a screen as a sequence of questions, numbered explanations,
disclaimer paragraphs, or identical cards. Never present a source status as a
global scientific verdict, a Repository decision as Problem resolution, or an
AI/human label as evidence quality.

## Related contracts

[`DESIGN.md`](DESIGN.md) defines the visual and interaction system.
[`apps/problems/PRODUCT.md`](apps/problems/PRODUCT.md) maps routes to jobs.
[`apps/problems/DESIGN.md`](apps/problems/DESIGN.md) maps routes to compositions.
Implementation and release mechanics live in [`docs/WEB.md`](docs/WEB.md).
