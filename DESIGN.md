---
version: alpha
name: problems.science Ink and Evidence
description: Question-first scientific product UI with ink, cobalt, warm paper, and exact data instruments.
colors:
  primary: "oklch(0.21 0.045 258)"
  ink: "oklch(0.21 0.045 258)"
  ink-soft: "oklch(0.31 0.035 258)"
  secondary: "oklch(0.50 0.20 260)"
  cobalt: "oklch(0.50 0.20 260)"
  cobalt-soft: "oklch(0.925 0.035 260)"
  neutral: "oklch(0.982 0.012 78)"
  paper: "oklch(0.982 0.012 78)"
  paper-strong: "oklch(0.996 0.006 78)"
  tertiary: "oklch(0.67 0.16 38)"
  coral: "oklch(0.67 0.16 38)"
  amber: "oklch(0.80 0.13 78)"
  mint: "oklch(0.72 0.12 155)"
  border: "oklch(0.858 0.025 78)"
  success: "oklch(0.57 0.13 155)"
  warning: "oklch(0.68 0.15 78)"
  error: "oklch(0.58 0.20 28)"
typography:
  display:
    fontFamily: Geist
    fontSize: 4.5rem
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: -0.035em
  problem-question:
    fontFamily: Geist
    fontSize: 2.25rem
    fontWeight: 560
    lineHeight: 1.14
    letterSpacing: -0.02em
  title:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 600
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
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  full: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "2rem"
  xl: "3rem"
  section: "4.5rem"
  sidebar: "12.5rem"
  reading-measure: "44rem"
components:
  product-hero:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper-strong}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  data-hero:
    backgroundColor: "{colors.cobalt-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  problem-question:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper-strong}"
    typography: "{typography.problem-question}"
    padding: "{spacing.xl}"
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.paper-strong}"
    typography: "{typography.compact}"
    rounded: "{rounded.sm}"
    height: "2.75rem"
  panel:
    backgroundColor: "{colors.paper-strong}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  exact-detail:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.exact}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
---

# problems.science design system

## Overview

The visual direction is **ink and evidence**: confident navy establishes the
scientific object, electric cobalt marks interaction, warm paper supports long
reading, and coral or amber adds authored emphasis. Standard success, warning,
and error colours are reserved for real state.

The product should feel like a modern collaborative research environment: the
recognizable files and diffs of GitHub, the attributed chronology of Entire,
the browsable resources of Hugging Face, the hierarchy and speed of Linear,
and the task clarity of strong scientific working-document products. Shadcn and
Base UI provide behavior, not visual identity.

The approved reference is Erdős Problem 321 at
`/problems/erdos-problems/321`. It is the calibration surface, not a demo-only
special case. The same components must render Problems 4, 94, 887, empty
Results, partial source coverage, and contested or corrected state truthfully.

### Physical scene

The shell is a compact 200px research navigation rail beside a wide warm-paper
workspace. A Problem opens as a dark ink folio: collection identity and actions
are quiet; the complete question is dominant but controlled to a 44rem reading
measure; four facts sit in a compact rail. Below it, five familiar modes occupy
one flat row. Content becomes a working instrument: synthesis, file explorer,
timeline, relationship map, or canvas.

Light mode uses warm paper and ink. Dark mode uses deep navy surfaces and warm
light text while retaining cobalt interaction. High contrast replaces authored
colour with system colours. Print removes shell chrome and renders linear
content, expanded disclosures, and list fallbacks.

## Colors

Ink is the dominant object and high-confidence reading colour. Cobalt is
interaction, selection, focus, and data navigation. Warm paper is the
application ground. Coral marks authored direction, open targets, or a semantic
transition when it does not imply success or failure. Amber provides restrained
emphasis for Work. Mint may identify evidence presence, never a truth verdict.

Success, caution, conflict, evidence, and progress tokens retain their exact
semantics. Do not use them to decorate a route hero. Source-reported status,
formal target, Repository decision, check outcome, and publication state always
have their own labels in addition to colour and shape.

Data visualizations use the smallest palette that preserves the comparison. A
collection distribution may use neutral open, progress resolved, caution other,
and border unknown because those are labelled source-status categories.
Relationship maps use node kind plus edge label; colour alone never names a
relation.

## Typography

Geist carries product and scientific reading. IBM Plex Mono is limited to
paths, revisions, code, exact identifiers, and compact numeric alignment.

Problem questions use the `problem-question` recipe and wrap naturally. Never
clip a question, force it onto one line, or allow a narrow fact rail to squeeze
it below a readable measure. Route display type is for Home, collection, Search,
Map, Updates, Account, and Work leads; it is not repeated in every section.

Use sentence case. Eyebrows name a stable axis or collection, not a paragraph's
topic. If a heading only asks “What can I do?” or repeats the tab label, delete
it and expose the actions or instrument directly.

## Layout

- Desktop sidebar: 200px expanded; icon rail when collapsed.
- Page gutter: `clamp(1rem, 2.5vw, 2rem)`.
- Page block padding: `clamp(1.75rem, 4vw, 3rem)`.
- Standard section rhythm: `clamp(2.5rem, 6vw, 4.5rem)`.
- Problem question measure: 44rem.
- Dense prose measure: 65–72ch.
- Canvas routes use all available content width.

The top app header remains compact. Breadcrumbs own route hierarchy; page
content does not print the same hierarchy again unless it is citable identity
inside the dominant Problem object.

At 1280px, the Problem header is a question field plus compact fact rail.
Overview is a 2:1 synthesis/reading rail. Results use a main result with a 19rem
fact panel. Sources use an 18rem tree and preview. Workspace uses resizable
object tree, canvas, and inspector. History uses one chronology spine and wide
correction comparisons.

At 768px, split views stack. At 390px and 320px, all five Problem tabs remain
visible in an equal-width row; labels may become compact, but no tab is hidden
without an explicit accessible overflow control. The question and primary
action precede metadata. Code and formal text get explicit horizontal scroll.

## Elevation & Depth

Depth comes from surface contrast and containment, not stacked shadows:

1. warm-paper workspace ground;
2. paper-strong reading surface;
3. ink or cobalt-soft dominant object;
4. popover, command menu, sheet, or dialog.

Use one border and at most a restrained shadow for a file explorer, map,
command menu, profile header, or selected Result. Avoid nested cards. Panels,
tiles, and cards are allowed when containment or comparison materially helps.
Cards, panels, tiles, rows, canvases, tables, and charts are all valid.

## Shapes

Controls use an 8px radius. Working instruments use 12px. Dominant authored
objects may use 16px. Pills are for short state or filter tokens only. Do not
turn paragraphs into pills or use excessive rounded containers to soften every
boundary.

## Components

### Route leads

- `vela-product-hero`: Home and global Problems. Ink, paper text, cobalt plane.
- `vela-collection-hero`: source-owned collection identity and real coverage.
- `vela-data-hero`: Search, Research map, and profile identity.
- `vela-work-hero`: Contribute, import, and My work.
- `vela-history-hero`: Updates and semantic chronology.

These are route families, not a requirement to make every route identical.

### Problem header and tabs

`ProblemReferenceHeader` renders collection-qualified identity, the complete
retained question, Start work and exact source actions, Formal target,
source-attributed collection status, Repository decision on the current
contribution, and evidence/check coverage.

`ProblemReferenceTabs` renders exactly Overview, Work, Results, Sources, and
History. The selected mode uses icon, label, contrast, and `aria-current`.
Legacy query names are accepted by the router but never emitted by current UI.

### Overview reference

`ProblemOverviewReference` is the reference screen. Its data-backed sequence is:

1. Current state synthesis and explicit unresolved limit;
2. retained formal landmarks as a compact comparison figure;
3. latest Result row with producer, evidence, checks, and source binding counts;
4. open formal targets and source-reported activity;
5. a compact fact and representation rail;
6. exact related-Problem state or an honest empty relation state;
7. technical identity disclosure.

Do not add navigation cards, a numbered action list, or repeated state prose.

### Results

Use a reviewed-change geometry: Result header, exact assertion, performer and
date, check rows with outcome-specific glyphs, linked source rows, and a compact
fact rail. A Repository decision badge must say it governs a contribution. It
must never read as the Problem's solution state.

### Sources and files

Use `ProblemFiles`: a recognizable tree or grouped retained-source list beside
one selected preview. Show exact path, revision, declaration/excerpt kind,
proof facts where retained, and Open exact source. Never present a single
declaration as if it were the whole file. If full bytes are unavailable, the
preview says so without inventing content.

### Work and workspace

The contribution stepper is Choose Problem → Attach work and evidence → Review
scope and checks → Submit handoff. The signed-out Work view previews Files,
Canvas, Research Blocks, Notes, and current exact public nodes. The signed-in
view uses an object tree, Canvas or selected-object surface, and inspector.
It never imitates a terminal, local filesystem, agent runtime, or signer.

### History and Updates

Use one chronological spine. Each event names its semantic change, actor or
producer, date, and contextual action. Corrections use Previous → transition →
Later/Current plus an expandable line-level comparison. Roots, commits, and
record IDs live in Technical details.

### Search and command menu

Adapt the shadcn.io `search-global` pattern through existing `@vela/ui`
Command primitives: one dominant query, labelled compact filters, human-first
rows, collection-qualified Problem identity, state glyph, and exact navigation.
Do not lead rows with hashes or internal kind names.

### Research map

The default map frame combines a labelled search/filter toolbar, a Problem- or
Result-led chooser, a canvas for exact relationships, a synchronized List
fallback, and a detail sheet. No similarity or inferred edge enters this map.
Use network-graph patterns only for behavior inspiration; Sigma remains the
existing maintained renderer.

### Collection distribution

`CollectionDistribution` answers two real questions: what status the source
declares across the corpus, and how much exact formal/reviewed material is
available. It includes a segmented rail, legend, exact totals, and labelled
coverage rails. It is not a KPI dashboard.

### Account and My work

Account leads with avatar, name, private email treatment, next actions, saved
work, connected codebases, provider status, session, and sign-out. Use grouped
rows and a split rail. Do not invent public reputation, streaks, quotas,
authority badges, or activity heatmaps.

### Interaction states

- Hover changes local contrast; it does not move layout except a subtle action arrow.
- Focus uses a visible 2px or 3px cobalt/system ring with offset.
- Active acknowledges press by colour or one-pixel depth.
- Selected persists through background, glyph, text, and ARIA state.
- Loading preserves the final geometry with labelled skeletons.
- Empty states name what is absent and offer one valid next action.
- Error states name what failed, what remains intact, and whether retry is safe.
- Degraded and stale states never display old data as current.
- Disabled controls remain legible and explain the unmet requirement when useful.

Motion is 140–240ms for controls and layout. Longer motion is allowed only when
it explains a real traversal or progress state. Reduced motion removes
transforms and animated map movement.

### Accessibility

Every visualization has a title, exact values, legend where needed, keyboard
path, and useful text/list/table equivalent. Forced colours add borders and
system colours. Touch targets are 44px on coarse pointers. At 200% zoom and
320px there is no document-level horizontal overflow. Print removes app chrome,
expands disclosures, and uses linear fallbacks.

Every chart has a visible title, exact values, and a useful non-visual fallback.

## Do's and Don'ts

### Do

- Lead with the Problem question and real data.
- Use files, canvases, timelines, diffs, maps, rows, and previews as working controls.
- Keep source status, formal target, Repository decision, and checks orthogonal.
- Use one dominant composition per route and progressive exact detail.
- Adapt interaction geometry from GitHub, Entire, Hugging Face, Linear, Epoch,
  shadcn.io, and Tailwind Plus only when it simplifies a Vela task.
- Verify Problems 4, 94, 321, and 887 plus empty and degraded states.

### Don't

- Do not use a wall of prose, question headings, disclaimer paragraphs, or numbered explanations.
- Do not use generic KPI grids, identical card walls, decorative charts, glass, or star fields.
- Do not hide Files, Canvas, Results, Sources, or History behind abstract nested navigation.
- Do not display raw hashes or protocol nouns as primary content.
- Do not infer a scientific summary, relationship, family, or status.
- Do not copy another product's branding, ontology, reputation, or centralized review model.
