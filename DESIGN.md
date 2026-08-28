---
version: beta-brand-03
name: Vela Two-Application Design System
description: A familiar scientific product at problems.science and a separate living editorial folio at vela.space, joined by one brand.
colors:
  background: "oklch(0.9884 0.0016 260)"
  surface: "oklch(0.9973 0.0013 260)"
  surface-subtle: "oklch(0.9543 0.0074 261)"
  foreground: "oklch(0.19 0.027 261)"
  muted-foreground: "oklch(0.52 0.031 260)"
  navigation: "oklch(0.9729 0.0029 264)"
  primary: "oklch(0.554 0.2 260)"
  primary-subtle: "oklch(0.9586 0.0183 258)"
  border: "oklch(0.905 0.013 260)"
  success: "oklch(0.57 0.14 152)"
  warning: "oklch(0.70 0.14 78)"
  error: "oklch(0.58 0.20 28)"
  evidence: "oklch(0.59 0.15 214)"
  editorial-paper: "oklch(0.968 0.018 84)"
  water: "oklch(0.53 0.075 244)"
  horizon: "oklch(0.86 0.075 86)"
  borrowed-light: "oklch(0.72 0.10 78)"
  cinnabar: "oklch(0.53 0.15 35)"
typography:
  display:
    fontFamily: Geist
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.75rem
    letterSpacing: -0.02em
  title:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.55
  compact:
    fontFamily: Geist
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
  exact:
    fontFamily: Geist Mono
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
    fontVariantNumeric: tabular-nums
  editorial-display:
    fontFamily: Zodiak
    fontSize: 3.5rem
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: -0.035em
  editorial-body:
    fontFamily: Gambetta
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.72
rounded:
  control: "0.4375rem"
  panel: "0.625rem"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "3rem"
  sidebar: "12.5rem"
  reading-measure: "48rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "2.5rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "2.5rem"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
  selected-row:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.foreground}"
  exact-detail:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.foreground}"
    typography: "{typography.exact}"
    rounded: "{rounded.control}"
  navigation:
    backgroundColor: "{colors.navigation}"
    textColor: "{colors.surface}"
  metadata:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.compact}"
  status-success:
    textColor: "{colors.success}"
    typography: "{typography.compact}"
  status-warning:
    textColor: "{colors.warning}"
    typography: "{typography.compact}"
  status-error:
    textColor: "{colors.error}"
    typography: "{typography.compact}"
  evidence-label:
    textColor: "{colors.evidence}"
    typography: "{typography.compact}"
  divider:
    backgroundColor: "{colors.border}"
    height: "1px"
  editorial-plate:
    backgroundColor: "{colors.editorial-paper}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
  water-orientation:
    backgroundColor: "{colors.water}"
    textColor: "{colors.surface}"
  horizon-rule:
    backgroundColor: "{colors.horizon}"
    height: "1px"
  borrowed-light-rule:
    backgroundColor: "{colors.borrowed-light}"
    height: "1px"
  correction-mark:
    textColor: "{colors.cinnabar}"
    typography: "{typography.compact}"
---

# problems.science design system

## Overview

The visual system is one brand with two applications and two registers. Its workspaces play a
modern research product straight: one cool blue-black neutral family, a rail
that follows the theme, starlight interaction, semantic state colors, sans
typography, and recognizable instruments. Its editorial moments are unmistakably Vela: retained watercolor,
open horizon, the canonical sail, paper light, and the long handoff from one
researcher to the next.

Physical scene: a researcher works in a bright reading room, moving between a
precise digital workspace and a field notebook opened beside it. Product
controls feel immediate and quiet. Home and the essay feel like the moment of
looking up from the instrument to reorient at the horizon.

Entire is the primary product reference: dominant-object hierarchy, compact
attributed human and agent activity, selected checkpoint/change rows, readable
tool output, and progressive technical context. GitHub and Hugging Face are
secondary references for files, diffs, checks, history, collection discovery,
filters, tags, and approachable technical identity pages. Base UI supplies
accessible behavior. None supplies Vela's ontology or visual brand.

The registers are coordinated, not blended. `apps/problems` workspaces use Entire-like
dominant objects, GitHub-like files and diffs, and Hugging Face-like discovery.
The separate `vela.space` surface owns the full editorial register.
Problems Home, collection cover moments, meaningful empty states, graph
orientation, and profile accents may inherit restrained first-party materials.
Use the canonical sail and retained artwork; do not redraw the mark or generate
substitutes.

There is no Problems essay route and no third register. `/about` and
`/about/endless-frontiers` were removed, and the *Endless Frontiers* folio was
withdrawn from `vela.space` on 2026-08-21; neither address resolves. Product
surfaces link to `https://vela.space` itself.

### Functional motif grammar

- **Horizon:** entry, progress boundary, or a handoff to the next action.
- **Sail or vessel:** current position, orientation, and continue-locally or
  source handoff.
- **Borrowed light and gold line:** evidence or continuity inherited from
  named prior work. Gold is never a quality score.
- **Cinnabar:** correction or supersession in editorial explanation. Product
  error states continue to use the semantic error token.
- **Constellation:** exact retained relationships or lineage only. Atmospheric
  marks inside a painting stay outside the data layer and accessibility tree.
- **Paper and watercolor:** authored story, covers, and selected transitions,
  never a background texture behind dense tables, code, or forms.

## Visual identity

### Canvas and color

One neutral family, cool and blue-black, carries page, rail and card in both
themes. Light mode is a near-white canvas with raised working surfaces a shade
above it; the sidebar is a step below the page rather than a dark slab, because
a rail that stayed deep marine in light mode made the light product a light
page bolted to a dark chrome — the one place the two themes disagreed about
what the application is made of.

The mark keeps the brand's gold. Stardust is on the sail, in the exported
marks, and in the identity approval, and for a while problems.science was the
only Vela surface not using it. The sail's waterline takes it through
`--vela-mark-accent`, which resolves to the brand's light-context gold on paper
and to stardust on dark, so the mark reads as a gold-and-starlight object
wherever it appears while the interface around it stays one accent.

Gold is deliberately confined to that glyph. `--status-caution` is already a
gold, and on paper the two are inseparable: a gold legible as text needs
`L <= 0.56` and light caution sits at `L 0.496`, so they compete for one narrow
band. At sixteen pixels on a mark, gold can be neither a control nor a badge,
which is the one place the collision cannot happen. A palette pass on
2026-08-28 mocked stardust as the interface accent and rejected it for exactly
this reason: the direction only worked under a rule that the accent may never
be a word, and a rule like that is a defect rather than a constraint.

Starlight means interaction, selection, and focus. It is Gamma Velorum's
blue-white, `oklch(0.796 0.105 254)` on dark and `oklch(0.554 0.2 260)` on
paper, and it replaced a stock cobalt. The light value is darkened from the
drawn `#1F6FEB`, which measured 4.51:1 against the card and passed the 4.5
floor only by rounding. Success, warning, error, and evidence colors encode
real state only, and no warm hue is used for anything else: the containment
figure's outer region was gold, which read as a caution state that "not
established here" is not.

Dark mode derives the same hierarchy: deeper canvas, slightly raised neutral
surfaces, brighter starlight, and the same semantic meanings. It is not a
space theme. Product workspaces avoid atmospheric effects and decoration that
competes with data. Brand surfaces use retained watercolor and open-sky imagery
with deliberate contrast, responsive crops, stable layout, and useful
fallbacks. Paintings are removed in forced colors and print when they are
atmospheric.

Use color in three ways:

1. establish navigation and the selected location;
2. distinguish an actual state or relationship;
3. focus attention on the primary action.

Everything else relies on typography, spacing, alignment, and fine rules.

### Typography

Use Geist for the product and Geist Mono for hashes, paths, revisions, code,
and exact values, with tabular figures wherever mono appears: every mono run
here is a value a reader compares down a column. IBM Plex Mono stays the
editorial mono, which is what keeps the two registers distinct rather than
blurred.

Geist Mono costs about 70 KB over the wire on every product route, and the two
faces together about 138 KB. It adds no file to `public/assets/fonts`, because
it arrives through Next's package integration rather than the governed
editorial profile — but "no delivered file" is not "no cost", and the audit of
2026-08-28 corrected that claim. Subsetting it would mean vendoring the file
into the delivery profile the budget check governs, which is a larger change
than the saving justifies; the cost is accepted and recorded here instead. Use Zodiak for earned brand display and Gambetta for
authored long-form reading. Typography is sentence case. Avoid repeated
uppercase micro-labels, wide tracking, ornamental type on task controls, and
display type used as a substitute for hierarchy.

`packages/brand/vela.tokens.json` is the contract for these values (AGENTS.md);
the frontmatter above restates it and the ramp below describes it. When they
disagree, the token file is right and the other two are stale.

- Page title or Problem question: 1.5rem, controlled measure, weight 600. This
  is the `display` token, which 24 route headings use.
- Home's heading is the single exception, at `clamp(2rem, 3.4vw, 3.25rem)`. It
  is the front door and carries the product's one large claim. It stays under
  editorial display size and takes no painting or brand fill. No other route
  may take this size; a larger heading anywhere is an editorial register the
  product routes do not carry.
- Section title: 1.125rem, weight 600.
- Body: 0.875rem at 1.5–1.6 line height.
- Dense rows and metadata: 0.75–0.8125rem.
- Exact material: mono 0.75–0.8125rem with horizontal scrolling where needed.

Labels should normally be ordinary sentence case text. Use a small badge only
when the enclosed value varies and helps scanning.

### Shape, borders, and elevation

Controls use a 7px radius; contained working surfaces use 10px — a card's
corner a little softer than the controls inside it, so the two read as one
family. The earlier pair, 6px and 10px, read as two systems. Pills are for
tags, statuses, and avatars, not general layout. Prefer a border, inset neutral
background, or whitespace over a shadow. Menus and floating inspectors may use
one restrained shadow. Do not nest framed panels unless the inner boundary is a
real interactive object such as a code viewer or diff.

### Layout and density

The desktop shell uses a 200px sidebar and a wide content canvas. Standard pages
use a maximum working width around 88rem. Reading measures stay between 44rem
and 52rem. Dense directories and file browsers may use the full canvas.

Page rhythm:

- 20–32px from shell header to page identity;
- 20–24px between identity and primary instrument;
- 32–48px between major sections;
- 12–16px row padding for readable density;
- 8px within compact metadata groups.

A page may contain panels, but the page itself is not a grid of equal cards.
Every route has one visually dominant object.

## Shell and navigation

The sidebar owns Home, Problems, signed-in Workspaces, Updates, and one visually
separate Add contribution action. Show the small set of published collections
as compact children of Problems only where that branch is relevant. Search belongs
to the header command control; maps, exact records, and release details stay
contextual. Use the mark, familiar icons, clear selected state, and the
minimum necessary account controls. The
main header owns collection-aware breadcrumbs, command search, notifications,
theme, and account entry. Do not repeat the breadcrumb identity inside a large
route banner.

On mobile, global navigation collapses predictably. Problem tabs remain one
flat row. If the row scrolls, show a visible continuation cue and preserve arrow
key, focus, and active-tab visibility. Do not hide later modes with no cue.

## Page grammar

### One dominant object

- Home: search, and the state this Repository has admitted.
- Global Problems: published collections.
- Collection: filterable Problem directory.
- Problem: the question and current Result or state.
- Work: canvas, files, and research objects.
- Results: a durable output with checks and evidence.
- Sources: file browser and exact preview.
- History: semantic chronology and diffs.
- Graph: exact relationship canvas with synchronized list fallback.
- Account: person, connections, work continuity, and security actions.
- Vela landing: authored argument, orientation, and a direct route into
  Problems. It is the only editorial surface; Problems has no About route.

Supporting content should not compete with that object. If a section merely
restates a tab, badge, or status row, remove it.

### Page identity

Use a normal product header: concise collection-qualified identity, one title or
question, optional one-sentence context, and up to two actions. Do not use a
dark hero slab on application routes. Do not lead with a marketing eyebrow.

### Page width

`PageShell` owns the maximum, and a route must not set its own page-level
measure. The frame is `96rem` for a standard route and `84rem` for a reading
one, centred; prose inside still sets its own measure per `typeset.css`.

`layout="canvas"` removes the maximum and belongs only to a pan-and-zoom
instrument — the graph, and the Problem workspace. A ledger, a directory, a
search result list and a profile are documents, not canvases: uncapped, their
rows ran the full width of whatever display they opened on.

Both failure modes were live at once. `/account` pinned its sections to
`max-w-3xl` while its own header ran full width, so one page had two widths and
sat in the left 45% of a 1920px window; nine ledger routes were declared
canvases and stretched without limit. A route that looks unfinished on a wide
display is usually one of these two, not a spacing problem.

### Say it once

Product surfaces state facts. They do not explain themselves.

The failure mode this replaced was consistent enough to name: every element
stated what it was, then stated what it was not. A Problem page said "the source
records a disproof" in three places and "no Repository has ruled" in two, and a
handoff button carried "does not clone, switch, upload, or execute anything"
three times on one screen. The negations read as anxiety, and the repetition
made the page feel written rather than built.

Three rules, in order:

- **A fact appears once, in the place with the most context.** If a track's
  stage already reads `Decision · None here`, no caption below it says so in a
  sentence. Structure is the statement; prose is the fallback.
- **Do not describe what something is not.** The absence of a control already
  says the capability is absent. The exception is a real side effect a reader is
  about to trigger and cannot see — a handoff to an external tool keeps
  "Nothing is cloned, uploaded, or executed", once.
- **Never explain a design decision in the product.** A notice that added "this
  notice never reports one" was telling the reader about its own author.

Policy pages — privacy, terms, accessibility, contact — are prose, and are
exempt. Everything else is a product surface.

### The empty Problem

1,215 of the 1,217 Problems in this release hold identity and a source locator
and nothing else, so the screen a reader is most likely to open is the one with
the least on it. Overview's no-record composition therefore carries three things
past the reach track, all of them read off the record rather than invented:

- **The headline is the source's finding where it has one**, attributed by
  name, with the Vela boundary as the next clause rather than a denial of it.
  The badge names its actor too — `Source: disproved (Lean)`, never a bare
  `Disproved`, which would read as this site's ruling.
- **Reach carries a Resolution stage**, between Formal and Work: a source files
  a finding, Vela work checks it, a Repository decides. Two actors on one axis,
  kept apart by the Source stage naming the collection directly above.
- **What this record is missing** — the first reach stage the record has not
  got to, and what acquiring it takes. Its last stage is deliberately one this
  site cannot perform: a Decision is a Repository act with a signature behind
  it, and a page offering a button for it would be lying about where authority
  lives. This describes one record. It never compares two, because
  `PRODUCT.md` scores Vela absent on discovery and allocation deliberately.
- **Where the source files it** — the Topic keys the source wrote onto this
  Problem, with the size of each, and the questions under those Topics that
  carry a Repository Standing. An exact relation, never a similarity score.
  Listing the neighbours in the source's own identifier order instead put six
  consecutive problem numbers on the page, each reading "No record"; where a
  topic has no Standing at all, saying so is the most useful sentence
  available, because it means the frontier there is empty.
- **Reported activity**, in the rail — who a source says has touched the
  question. The section tab already counts these records; a bare count is not
  the fact a reader wants on an empty page, and a name is.

### Watching

A watch speaks the reach axis and no other language. `Reach advanced to
Decision` reuses the vocabulary the reader has already seen on Overview, on Work
and in the rail; a watch that summarised, scored or digested would be a second
ontology for the same fact. It may never render reaching Decision as a question
being answered — that is a Repository accepting a Claim, which is a different
sentence and never becomes this one.

### Problem sections

The five Problem sections — Overview, Work, Results, Sources, History — live in
the Problem's own header, with a count on each saying what it holds. Each is
its own path segment, so every section is a real page a reader can link to.
Icons may support recognition but must not dominate or replace labels.

They lived in the sidebar for a while, on the reading that the rail should
become the object a reader is inside. In practice the page then named the same
Problem three times over and offered no way to another destination without
first leaving the object; GitHub and Hugging Face both settle it the other way.
The rail moves between objects, the header between sections. `AGENTS.md`
carries the full reasoning.

The row scrolls on a narrow viewport, so it must keep the open section scrolled
into view and show a visible continuation cue at whichever edge still has tabs
behind it. Hiding a section with no cue is how this was got wrong once already.

### Rows and lists

Rows are the default comparison structure for Problems, Results, activity,
files, checks, and connections. Lead with the differentiating object, then one
compact metadata line. Use dividers sparingly and consistent row heights. Avoid
duplicating a collection badge on every row inside one collection.

## Component recipes

### Search and command navigation

Adapt the shadcn.io command-menu behavior already inspected: breadcrumb-aware
groups, immediate filtering, keyboard selection, and human labels before exact
identifiers. Home uses a prominent search field; other routes use compact search
and filters. Search results always qualify numeric Problem identity by
collection. The Add contribution route reuses this behavior as a real Problem
chooser and sends a selection directly to Work; it does not lead with a step
diagram or repeat the workflow in prose.

### Editorial site and product brand opening

Problems Home is a split entry card: the promise, the search, and the actions
on one side, and the Repository's admitted state — accepted Results on a lane,
each with the scope it does not settle, over the exact release root — on the
other. Both halves are real; the second is the working instrument, never a
screenshot or a mock of one.

Home carries what a catalogue cannot. `/problems` owns browsing, filters and
the collection directory, and never renders a Result, so Home must not restate
its headings or its question list — Home once did, and was a weaker copy of the
page directly beneath it in the sidebar.

It carries no editorial plate. Retained paintings belong to `vela.space` and
other explicit editorial moments rather than beside the product search. The one permitted ground is a masked geometric texture that no reader
could mistake for data: a line here encodes nothing.

The full long-form composition lives at `vela.space`, outside this repository
and the Problems shell.
It preserves the historical continuous folio, margin notes, authored figures,
deep links, and time-of-day atmosphere. Product pages may reuse a painting or
quiet accent, but they do not import the essay layout.

### Problem header and Overview

The complete question is the title, unclamped on Overview. A compact identity
label qualifies the collection and number above it, on a line that also carries
the reading badge, copy link, Start work, and the exits — Continue locally and
Open source — that take the Problem into the reader's own tools.

There is no status strip below the question. The axes it once held — the
source's own reported status, the Repository's Decision on a contribution, and
check coverage — live in Overview's rail, where each is labelled with whose fact
it is. A strip repeating them under the question would state the same four
things twice on one screen, and would put the source's word and this site's
state side by side with nothing distinguishing them.

Overview is not navigation. Its dominant object is the current Result or honest
current-state absence, including scope and limitations. Supporting content may
show two or three exact landmarks and a compact side rail for topics,
representations, source update, and exact-map entry. Technical roots stay in a
disclosure.

### Collection directory

The directory header contains collection identity, one-sentence scope, exact
count, and a compact truthful distribution. Filters sit directly above rows.
Each row leads with number and question, followed by source status, exact formal
availability, reviewed Result count, and source. This follows Hugging Face's
approachable density and GitHub's list conventions without copying either
visual skin.

### Results and checks

Use a Result identity header, readable assertion, performer and time, outcome-
specific check rows, evidence and source links, and progressive provenance.
Passing, failing, error, and inconclusive checks use distinct glyphs and labels,
not color alone. Repository decision and check outcome remain separate.

### Sources and files

Adapt the inspected shadcn file-tree behavior with existing Base UI: expandable
hierarchy, selected-row state, compact file metadata, keyboard operation, and a
synchronized preview. Wide screens use tree/list plus preview; narrow screens
stack preview after selection. If file bytes are unavailable, label the retained
declaration or excerpt honestly and offer Open exact source. Never present a
declaration as a whole file.

### History, activity, and diffs

Adapt the inspected compact timeline behavior: date or semantic grouping,
actor/avatar, event verb, affected object, time, and expandable detail. Entire's
checkpoint/change density is the reference. Corrections show semantic before
and after first; exact roots and commits are disclosed. Do not publish a long
ungrouped feed or a row dominated by an opaque ID.

### Work and canvas

Work uses recognizable Files, Canvas, Research Blocks, Notes, and attempts.
Signed-out users see a truthful read-only structure and a concise sign-in or
Continue locally action. Signed-in users get object tree, canvas/selected object,
and inspector. Continue locally is an ordinary secondary action that opens the
exact provider-neutral Workbench v1 handoff; it is rendered only when every
required public Problem, Repository, and full Git-ref field is available. The
canvas shows only explicit retained relationships and always has a list fallback.

Workspaces uses linked object rows with selected state and an adjacent workspace
detail. Exact Problem anchors lead back to Work; missing anchors use a compact
recovery state. Unsigned drafts use a four-stage handoff rail from local tool to
Repository review to public Result, not a private shell command.

### Empty, loading, error, and degraded states

Name the missing or unavailable object, preserve the surrounding page context,
and offer one useful next action. Loading skeletons match the final row or split
pane geometry. Private and unavailable are different. An incompatible
projection fails closed with a concise configuration message, not a raw overlay.

## Interaction states

- Hover: subtle neutral or primary-subtle background; never layout movement.
- Focus: 2px high-contrast focus ring with offset.
- Active: pressed control contrast, not scale animation.
- Selected: primary-subtle background, starlight edge or indicator, and
  `aria-current` or selected semantics.
- Loading: stable skeleton geometry and retained page title.
- Empty: concise cause plus one next action.
- Error: plain-language failure, retained user input, retry or recovery.
- Disabled: lower contrast plus disabled semantics; never color alone.

Motion is limited to menu appearance, disclosure, selection, and synchronized
pane feedback. Default duration is 120–180ms. Respect reduced motion and remove
nonessential transforms.

## Accessibility and rendering

Meet WCAG 2.2 AA. Preserve landmarks, heading order, visible focus, touch
targets, scrollable code, 320px layouts, 200% zoom, forced colors, reduced
motion, and meaningful print. Charts and maps require a text or table equivalent.
Status uses label and shape as well as color. Long questions, paths, hashes, and
formal statements must wrap or scroll within their own instrument, never the
document.

## Do

- Make the Problem or working object immediately obvious.
- Prefer familiar rows, tabs, files, diffs, checks, timelines, and side rails.
- Use compact attributed activity like Entire.
- Use GitHub-like task clarity for source and contribution work.
- Use Hugging Face-like discovery density for collections and resources.
- Keep exact scientific data reachable without making it the headline.
- Let empty space support hierarchy, not compensate for missing structure.
- Use the canonical sail, retained paintings, horizon, and borrowed-light
  language at earned Home, collection-cover, graph-orientation, and
  meaningful transition moments.
- Let constellation lines represent exact retained relationships only; let
  authored paintings remain clearly atmospheric.

## Do not

- Do not pull dense product workspaces into the editorial register.
- Reject motif misuse: galaxy wallpaper behind tools, purple-neon sci-fi,
  glass, faux-nautical controls, or decorative lines presented as data.
- Do not create card soup, KPI slabs, bento dashboards, nested panels, or a
  repeated banner on every route.
- Do not repeat uppercase micro-labels or use tracking as decoration.
- Do not invent relationships, summaries, scores, or collection availability.
- Do not copy Entire sessions, GitHub repositories, or Hugging Face resource
  ontologies into Vela's public model.
