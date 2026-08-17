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

- **Home:** one newcomer-facing headline, a prominent Problem search, primary
  Browse Problems and secondary Add a Contribution actions, and one honest
  availability line in the first viewport. A connected three-step action row,
  one collection ledger row, reviewed-evidence starting points, and a compact
  human-readable update timeline follow. It never opens with protocol nouns,
  aggregate KPI cards, or speculative collections.
- **Collections:** heading, filter toolbar, an Item ledger on hairlines,
  pagination, and a record route per row. A row is a thing a reader sends to a
  colleague, so its destination is a URL and not a selection query. Nothing in
  the Problems uses TanStack, and no collection opens a record in a pane: the
  release. Contribution routes group Problems by Repository and link each row
  into that Repository's own page; the product does not synthesize a global
  ranked work inventory.
- **Problem index:** the global entry presents published collections and a few
  current starting points; it never silently renders one collection's full
  directory. Collection pages own filtering and pagination. Global result rows
  name the collection before the local number. One published collection gets
  an explicit coverage statement, not a decorative comparison chart.
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
- The Problem breadcrumb retains all three identities on detail routes:
  Problems, the collection, and its local Problem number. On narrow screens the
  last label may shorten to `#N`; the collection is not discarded.

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

## Dense information and visualisation

The collection directory is a compact filter toolbar over an exact row ledger;
it is not a grid of summary cards. Search uses the shared Command composition,
plain-language filters, Skeleton while resolving, and one whole-surface empty
state when no result matches. Contextual side panels are reserved for actions
or inspection that can close without changing the route's reading order.

Updates and Problem History use a left-aligned timeline when chronology is the
relationship the reader needs to see. Every event still has an ordinary text
row with its date, actor, action, target, and resulting state. Corrections use
before/after presentation and supersession or dependency paths only when those
edges exist in exact data. Evidence may summarize verification strength and
provenance, but it keeps performer/provider/model/method/environment and
limitations legible and never treats human or agent identity as a quality
score.

The global and collection surfaces may add a shadcn Chart/Recharts figure only
when it reveals a real comparison among rooted collection, status, or evidence
dimensions. Every figure ships with a table or text equivalent, truthful axis
labels, keyboard-readable values, responsive recomposition, and print,
forced-colors, and reduced-motion behavior. A single collection or a handful
of headline counts does not justify a chart.

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

A Problem is one record with four sibling surfaces, each a complete HTML page
at its own URL — **Overview** (the bare address), **Evidence**
(`?view=evidence`), **Work** (`?view=work`), and **History**
(`?view=history`) — behind one link-addressed tab bar. The sections are the
reader's model: the two public nouns are Problem and Contribution, and
review, decision, source, repository, provenance, and protocol records
appear in context rather than as peer destinations. A sibling surface is
not progressive disclosure: nothing is DOM-hidden behind a closed control, so
the rule that a closed disclosure is deletion is satisfied by address.
`Collapsible` remains forbidden for record content — Base UI keeps closed
content out of the DOM.

The hero carries a compact strip on every public surface, readable before
learning the protocol: **Problem state** (Open, Partial, Resolved, or
Contested, with its derivation basis beside it), **What is known**
(one plain line), **Evidence strength** (a verification summary), **What remains
open**, and the next Problem actions. Repository-local Standing never appears in this strip — it
governs exact Contributions and renders on them, under Evidence.

**Overview** answers the reader's questions, in the reader's order: the
**Question** (retained prose, or the formalizers' own docstring attributed
as their wording, or the honest absence sentence with the upstream locator;
formal notation renders as a file panel, never as the opening paragraph),
**What was checked** (one line, full record one link away), and the three
actions **Read what is known**, **Check prior work**, and **Add a contribution**.
Record-tier material — roots,
record ids, verification record detail, occurrence tables, audit bodies,
correction relations — never renders on Overview; Overview may summarize it
in one line with a link. That sentence is what keeps the provenance wall
from regrowing.

**Evidence** is everything that supports what the Problem currently holds:

- **Contributions** — each with its own Standing badge and the scope
  sentence that stops a reference-scoped acceptance from reading as a
  solved conjecture.
- **Latest contribution and reviews** — produced by, checked by, not
  established by those checks, decided by. One block, in the protocol's
  order: reading it as a sequence is what shows a producer, a verifier and
  a Decision performer to be three different actors. The contribution shown
  is the one supporting current Standing, not the newest; where nothing
  supports the current Claim the block says so rather than promoting an
  unrelated Proposal into it. Human, agent, model, and tool performers
  render as peers; weight comes from method and independence, not actor
  class.
- **Source-declared facts**, **source coverage**, the **retained
  statements** as file panels grouped by the module their library declares,
  and the **source's own review**, which keeps its own heading and never
  sits under one named "Checks".

**Work** is the account-aware coordination surface (the Workspace), reached
as a section of the Problem rather than as a separate product concept.

**History** is how the record changed, in the flow with nothing collapsed:
every proposed change under its own status word, **correction history**
with predecessors retained, and **exact provenance** — roots, record types,
and raw exports.

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
