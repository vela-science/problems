# Problems design contract

The root [`DESIGN.md`](../../DESIGN.md) governs the Vela system. This file
records only the Problems-specific profile.

## Product register

The Problems is a light-first scientific workbench:

- Geist for interface text;
- IBM Plex Mono only for identifiers, roots, commands, and exact values;
- neutral shadcn surfaces;
- Vela gold only for the sail, focus, provenance, and one primary direction;
- compact controls and open ledgers rather than metric-card dashboards.

Dark mode is token-equivalent and explicit. Scientific state always uses text,
shape or icon, and color.

## Composition

- **Collections:** heading, filter toolbar, an Item ledger on hairlines,
  pagination, and a record route per row. A row is a thing a reader sends to a
  colleague, so its destination is a URL and not a selection query. Nothing in
  the Problems uses TanStack, and no collection opens a record in a pane: the
  release. Contribution routes group Problems by Repository and link each row
  into that Repository's own page; the product does not synthesize a global
  ranked work inventory.
- **Records:** object heading, semantic badges, Tabs or Item groups, one
  metadata Sheet, and Collapsible exact roots.
- **Instruments:** compact toolbar, principal canvas or command surface,
  inspector Sheet, and an equivalent table or Item view.

The application shell uses the official inset Sidebar composition. The frame
persists across internal navigation; its destination list is scoped to the
Repository you are in. Route controllers own data and URL state, not a separate
styling vocabulary.

Navigation itself is governed by the root [`DESIGN.md`](../../DESIGN.md);
sidebar scoping, the header trail, headings, and retired paths are stated
there and are not restated here. Exact release access sits in the sidebar
footer. Two Problems-specific rules remain:

- Account state is a compact header control with a dedicated `/account` detail
  surface. It never implies authorship, Standing, or repository authority.
- Notifications open a triage surface: Proposals awaiting a Decision, counted
  per Repository, over `/proposals` and `/decisions`. They never duplicate either
  ledger or imply that a Verification is an accepted Decision.

## Ownership

Generic interaction comes from `@vela/ui`. Stable Vela status, exact-value,
copy, and scientific-text semantics also come from `@vela/ui`.

The Problems owns:

- its shell and navigation;
- domain table columns and filters;
- URL-backed selection;
- the Sigma graph and its accessible ledger;
- rooted activity and evidence compositions.

It must not recreate app-local `components/ui`, generic cards, primitive
wrappers, token palettes, or icon systems.

## State and evidence

- Verification and acceptance are never visually or verbally conflated.
- Graph position and search order never imply authority.
- Exact roots remain one disclosure away.
- Complex maps and timelines include an equivalent record view.
- Mobile uses the same primitives and data order, recomposed for the available
  width rather than squeezed into a desktop layout.

## Motion and accessibility

UI transitions last 120–180ms, animate opacity or transform, and respect
reduced motion. Focus is visible in normal and forced-color modes. Loading uses
Skeleton and errors use Alert.

## Absence

Most of this product is legitimately empty, and an absence that looks like
breakage is a false statement about the record.

A **section** that has nothing in it says so in one sentence in the reading
flow. It does not get `Empty`, whose dashed, centred, bordered box reads as a
failed region and stacks into a ladder when a page has several — which is why
`problem-state.test.tsx` forbids those classes on that surface. `Empty` is
reserved for a **whole surface** with nothing on it.

Name the fact that is missing, not the product. "No Assertion in this release
names this Problem as its subject" is checkable; "Vela does not synthesize a
narrative without a rooted read projection" explains the architecture to
someone who did not ask.

Distinguish what the protocol distinguishes. *Nothing yet* is not *nothing
matching a filter*, is not *not applicable to this Repository*, and none of
them is **explicitly unavailable** — the state a Verification, replay, or
comparison reaches when the fact was sought and could not be established. That
one is a finding and never renders as a failure or as `fail`.

Present tense means the absence can still change; past tense means it is
closed. A count chip reading zero says the section failed, so a heading with
nothing behind it carries no chip.

## What a Problem paints

A Problem Record opens with what the Problem *is*, because for the great
majority of them that is all there is. Reading order:

1. **Current State** — Source status and Local Standing as separate axes, then
   the Repository's Assertions or a sentence naming what is absent.
2. **Source-declared facts** — status, formalization, prize, subjects, OEIS,
   bound sources, upstream statement, and the source's own commentary.
3. **Source coverage** and the **retained statement text**, in the flow. These
   are the record. They are not progressive detail and must not sit behind a
   `Collapsible` — Base UI keeps closed content out of the DOM, so a closed
   disclosure is not disclosure, it is deletion.
4. **Source review**, where a source publishes one. It keeps its own heading and
   never sits under one named "Checks": a source audit's own
   `does_not_establish` denies being a Vela Verification, and merging the two
   collapses two state axes.
5. **Latest contribution and reviews** — produced by, checked by, not
   established by those checks, decided by. One block, in the protocol's
   order, rather than the separate `Checks` and `Decisions` sections this
   replaced: reading it as a sequence is what shows a producer, a verifier and
   a Decision performer to be three different actors, which is the thing a
   disclaimer sentence about verification not being acceptance can only
   assert. The contribution shown is the one supporting current Standing, not
   the newest — a withdrawn or pending Proposal keeps its own status word
   instead of taking the heading, and where nothing supports the current Claim
   the block says so rather than promoting an unrelated Proposal into it.
6. **What remains** and **Next contribution**. Limits render in the record's
   own words and never as a badge or a colour; where nothing is retained the
   section is absent, because "nothing is uncertain" is a claim this product
   must not make.
7. **Exact provenance** — roots, record types, and raw exports. This is the
   layer progressive disclosure is for.

No heading repeats the record's type word, and none carries an eyebrow naming
the category it already names.

## The state harness

`bun run --filter @vela/problems harness:states` renders the Problem surface
in every lifecycle state as static HTML, outside Next, into a gitignored
directory. It exists because most of the lifecycle has no live instance — no
correction, no current contribution, no pending Proposal — and a designer cannot inspect
a state the data has never reached. Every scenario declares one of three tiers
in its own heading: **Retained** (as the release holds it), **Composed** (real
records recombined), **Constructed** (illustrative; no live instance). Nothing
it emits is scientific record, and nothing it emits enters a build, a bundle, a
manifest, or the route contract.

Because it renders outside Next it carries none of the application's styling.
It is a harness for structure, reading order, state coverage and copy. Visual
review belongs in the running app, at the documented widths.

See [`../../docs/design-system.md`](../../docs/design-system.md) for the
canonical component, Tailwind, internal-registry, and licensed-source
workflow.
