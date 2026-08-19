---
version: beta-brand-02
name: Vela Two-Application Design System
description: A familiar scientific product at problems.science and a separate living editorial folio at vela.space, joined by one brand.
colors:
  background: "oklch(0.985 0.003 255)"
  surface: "oklch(0.992 0.004 86)"
  surface-subtle: "oklch(0.965 0.006 255)"
  foreground: "oklch(0.205 0.025 255)"
  muted-foreground: "oklch(0.46 0.018 255)"
  navigation: "oklch(0.19 0.045 255)"
  primary: "oklch(0.53 0.20 258)"
  primary-subtle: "oklch(0.94 0.035 258)"
  border: "oklch(0.885 0.009 255)"
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
    fontSize: 2.25rem
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: -0.025em
  title:
    fontFamily: Geist
    fontSize: 1.25rem
    fontWeight: 650
    lineHeight: 1.35
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
    fontFamily: IBM Plex Mono
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
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
  control: "0.375rem"
  panel: "0.5rem"
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
modern research product straight: neutral canvas, deep marine navigation,
cobalt interaction, semantic state colors, sans typography, and recognizable
instruments. Its editorial moments are unmistakably Vela: retained watercolor,
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
The separate `apps/www` landing and living essay own the full editorial register.
Problems Home, collection cover moments, meaningful empty states, graph
orientation, and profile accents may inherit restrained first-party materials.
Use the canonical sail and retained artwork; do not redraw the mark or generate
substitutes.

The former Problems essay route is a compatibility redirect, not a third
register. Product surfaces link directly to the canonical folio at
`https://vela.space/constellations`.

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

Light mode is a cool near-white application canvas with warm-tinted working surfaces.
The sidebar is deep marine. Cobalt means interaction, selection, and focus.
Success, warning, error, and evidence colors encode real state only.

Dark mode derives the same hierarchy: deep neutral canvas, slightly raised
neutral surfaces, lighter cobalt, and the same semantic meanings. It is not a
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

Use Geist for the product and IBM Plex Mono for hashes, paths, revisions, code,
and tabular numerals. Use Zodiak for earned brand display and Gambetta for
authored long-form reading. Typography is sentence case. Avoid repeated
uppercase micro-labels, wide tracking, ornamental type on task controls, and
display type used as a substitute for hierarchy.

- Page title or Problem question: 1.75–2.25rem, controlled measure, weight 650.
- Section title: 1–1.25rem, weight 600–650.
- Body: 0.875rem at 1.5–1.6 line height.
- Dense rows and metadata: 0.75–0.8125rem.
- Exact material: mono 0.75–0.8125rem with horizontal scrolling where needed.

Labels should normally be ordinary sentence case text. Use a small badge only
when the enclosed value varies and helps scanning.

### Shape, borders, and elevation

Controls use a 6px radius; contained working surfaces use 8px. Pills are for
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

The sidebar owns Home, Problems, signed-in My work, Updates, and one visually
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

- Home: search and discovery.
- Global Problems: published collections.
- Collection: filterable Problem directory.
- Problem: the question and current Result or state.
- Work: canvas, files, and research objects.
- Results: a durable output with checks and evidence.
- Sources: file browser and exact preview.
- History: semantic chronology and diffs.
- Graph: exact relationship canvas with synchronized list fallback.
- Account: person, connections, work continuity, and security actions.
- Problems About: concise product explanation and a cross-domain route to Vela.
- Vela landing and essay: authored argument, orientation, and a direct route
  into Problems.

Supporting content should not compete with that object. If a section merely
restates a tab, badge, or status row, remove it.

### Page identity

Use a normal product header: concise collection-qualified identity, one title or
question, optional one-sentence context, and up to two actions. Do not use a
dark hero slab on application routes. Do not lead with a marketing eyebrow.

### Tabs

Use a familiar border-bottom tab row with a cobalt active indicator. Labels are
Overview, Work, Results, Sources, and History. Icons may support recognition but
must not dominate or replace labels. Tabs are not enclosed in a pill container
and do not become cards on mobile.

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

Problems Home is a direct, single-column activation surface: question-led
promise, search, actions, and the compact collection list. It does not carry an
editorial plate. Retained paintings belong to `vela.space`, About, and other
explicit editorial moments rather than beside the product search.

The full long-form composition lives in `apps/www`, outside the Problems shell.
It preserves the historical continuous folio, margin notes, authored figures,
deep links, and time-of-day atmosphere. Product pages may reuse a painting or
quiet accent, but they do not import the essay layout.

### Problem header and Overview

The complete question is the title. A compact metadata line qualifies the
collection, source, and number. Put Start work and Open source at the right when
space permits. Below the question, use a single readable status strip for
formal target, source-attributed status, Repository decision on a contribution,
and check coverage. Do not repeat these axes in Overview.

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

My work uses linked object rows with selected state and an adjacent workspace
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
- Selected: primary-subtle background, cobalt edge or indicator, and
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
  language at earned Home, About, collection-cover, graph-orientation, and
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
