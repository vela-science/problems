---
version: alpha
name: Vela Direction Through Evidence
description: A calm scientific workspace that makes questions, evidence, provenance, and next actions legible.
colors:
  background: "oklch(0.973 0.006 245)"
  foreground: "oklch(0.21 0.032 265)"
  surface: "oklch(0.985 0.005 245)"
  surface-subtle: "oklch(0.945 0.01 245)"
  border: "oklch(0.891 0.006 264)"
  primary: "oklch(0.184 0.04 261)"
  primary-foreground: "oklch(0.973 0.006 245)"
  focus: "oklch(0.235 0.082 258)"
  direction: "#846315"
  evidence: "#2F6F6B"
  progress: "#3F744B"
  caution: "#805A16"
  conflict: "#9C3F4A"
  link: "#4E7499"
  data-blue: "#4E7499"
  data-teal: "#4F8F8B"
  data-green: "#6E9F77"
  data-amber: "#B7832F"
typography:
  display:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: 600
    lineHeight: 28px
  statement:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: 500
    lineHeight: 32px
  title:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
  subtitle:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 500
    lineHeight: 22px
  body:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 22px
  compact:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
  label:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
  exact:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 18px
rounded:
  dense: "5px"
  control: "6px"
  panel: "8px"
  feature: "11px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "72px"
  touch: "44px"
  reading-measure: "72ch"
  shell-max: "1600px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "{spacing.md}"
    height: "{spacing.touch}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "{spacing.md}"
    height: "{spacing.touch}"
  search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.panel}"
    padding: "{spacing.base}"
    height: "{spacing.2xl}"
  panel:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.panel}"
    padding: "{spacing.lg}"
  feature-tile:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.title}"
    rounded: "{rounded.feature}"
    padding: "{spacing.xl}"
  data-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.compact}"
    rounded: "{rounded.dense}"
    padding: "{spacing.sm}"
  status-evidence:
    backgroundColor: "{colors.evidence}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  status-progress:
    backgroundColor: "{colors.progress}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  status-caution:
    backgroundColor: "{colors.caution}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  status-conflict:
    backgroundColor: "{colors.conflict}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  code-panel:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.exact}"
    rounded: "{rounded.panel}"
    padding: "{spacing.base}"
  timeline-node:
    backgroundColor: "{colors.direction}"
    textColor: "{colors.background}"
    typography: "{typography.subtitle}"
    rounded: "{rounded.full}"
    size: "{spacing.base}"
  focus-indicator:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.background}"
    rounded: "{rounded.dense}"
    size: "{spacing.xs}"
  link:
    backgroundColor: "{colors.background}"
    textColor: "{colors.link}"
    typography: "{typography.body}"
  chart-blue:
    backgroundColor: "{colors.data-blue}"
    textColor: "{colors.background}"
  chart-teal:
    backgroundColor: "{colors.data-teal}"
    textColor: "{colors.foreground}"
  chart-green:
    backgroundColor: "{colors.data-green}"
    textColor: "{colors.foreground}"
  chart-amber:
    backgroundColor: "{colors.data-amber}"
    textColor: "{colors.foreground}"
  hairline:
    backgroundColor: "{colors.border}"
    textColor: "{colors.foreground}"
    height: "1px"
  reading-measure:
    width: "{spacing.reading-measure}"
  application-shell:
    width: "{spacing.shell-max}"
    padding: "{spacing.3xl}"
---

# Vela Web design system

## Overview

Vela's visual thesis is **direction through evidence**. The interface should
feel like a modern scientific working environment: calm enough for close
reading, vivid enough to explain state and relationships, and familiar enough
that search, files, diffs, timelines, and settings need no tutorial.

The physical scene is a bright editorial workspace by day and a dim instrument
panel by night. Paper-like reading surfaces sit inside a navy product shell.
Warm gold marks direction, while teal, green, amber, red, and blue carry
evidence, progress, caution, conflict, and links. Sails suggest movement from a
known state toward useful work. Constellation lines appear only when they encode
real relationships.

The product synthesizes task patterns from GitHub, Entire, Hugging Face,
Linear, Ramp, and scientific working-document interfaces. These references do
not set Vela's brand or ontology. Shadcn and Base UI supply accessible behavior.
Vela tokens, data, compositions, and editorial judgement supply the identity.

Cards, panels, tiles, rows, canvases, tables, and charts are all valid. Choose
the form that makes the user's comparison or action easiest. Avoid making every
section a card or turning every count into a dashboard tile.

## Colors

The default light theme uses a cool off-white workspace, near-navy text, and
white raised reading surfaces. The dark theme inverts the same hierarchy: a
deep navy workspace, slightly lighter panels, warm white text, and semantic
colours adjusted to retain contrast. Theme changes must not change meaning.

Use colour by role:

- **direction** marks the recommended path, active collection cue, or next step;
- **evidence** marks sources, artifacts, and corroborating material;
- **progress** marks completed or supported outcomes;
- **caution** marks uncertainty, staleness, pending work, and partial results;
- **conflict** marks contradictions, failed checks, and destructive actions;
- **link** marks navigation and relationships.

Every semantic colour appears with text, a glyph, pattern, position, or shape.
Do not use colour as the sole state signal. Forced-colour mode uses system
colours and preserves borders, focus, selection, and graph edges.

Data visualizations use blue, teal, green, amber, and conflict red in that
order. Use one hue with intensity for ordered values. Use multiple hues only
for distinct categories. Legends include exact totals and a text or table
equivalent. “Unknown” is a named category, never transparent missing colour.

## Typography

Geist is the product face. IBM Plex Mono is reserved for hashes, identifiers,
paths, commands, code, and other exact values. Scientific statements use Geist
with mathematical notation rendered by the existing scientific-text pipeline.

Use the token scale in frontmatter. Display type introduces a page; statement
type carries the scientific question; title and subtitle establish sections;
body supports reading; compact and label support dense metadata. Do not shrink
critical metadata below 12px. At narrow widths and 200% zoom, allow lines to
wrap rather than compressing type.

Headings use sentence case. Labels are short and concrete. Long-form reading
stays within 72 characters per line where practical. Numbers in comparable
columns use tabular figures. Exact values may truncate visually only when copy
and full-value disclosure remain available.

## Layout

The app shell has a maximum width of 1600px and uses a 12-column mental grid.
Content does not need to draw all twelve columns. Standard page gutters are
32px on wide screens, 24px on compact desktop, 16px on mobile, and 12px only
for dense data that needs the width. Touch targets remain at least 44px.

Primary compositions:

- **reading**: a 72ch main column with a 280 to 320px contextual rail;
- **directory**: toolbar, optional distribution summary, then dense rows or
  varied editorial tiles;
- **timeline**: one chronological spine with grouped events and inline previews;
- **compare**: aligned before and after panes that stack on narrow screens;
- **workspace**: resizable file or context rail, main canvas, and task panel;
- **canvas**: diagram or graph with a synchronized list fallback.

At 1024px, rails may become inline summaries or drawers. At 768px, split panes
stack and toolbars wrap into grouped controls. At 390px and 320px, preserve the
question, state, and primary action first; secondary metadata moves into
disclosure. Horizontal scrolling is limited to code, tables, and diagrams with
an explicit scroll region and an alternative view.

Density follows the task. Reading pages use generous rhythm. Search results,
files, activity, and evidence lists use compact aligned rows. Controls can be
compact without reducing target size.

## Elevation & Depth

Depth comes from a restrained surface ladder:

1. **workspace**: page background;
2. **reading surface**: white or dark-panel content plane;
3. **contained panel**: subtle tonal shift plus border;
4. **floating control**: popover, dialog, command menu, or sticky rail with a
   small shadow;
5. **modal focus**: overlay plus the strongest supported shadow.

Use borders and tonal contrast before shadows. Shadows indicate overlap, not
importance. Nested panels should normally differ by tone or spacing rather
than accumulating borders and shadows.

## Shapes

Controls use the current Tailwind radius ladder: about 5px for dense elements,
6px for standard controls, 8px for panels, and 11px for feature tiles. Pills
are reserved for tags, filters, compact statuses, and people, not containers.

Sail angles can shape selected markers, progress rails, or editorial crops.
Constellation lines connect real source, evidence, review, and state nodes.
Arrows encode direction or dependency, not decoration. Avatars and source
marks retain their native shape inside consistent frames.

## Components

### Navigation and search

The header keeps Home on the sail and exposes Problems, Updates, My work when
signed in, and Search. Breadcrumbs preserve collection and Problem identity.
Global search follows a command-menu model with scoped results, keyboard
movement, recent queries, and explicit empty and unavailable states.

Segmented controls switch views of the same dataset. Tabs switch stable page
areas. Filters use URL-backed values and show active selections. Mobile
navigation retains the same labels and reading order.

### Discovery and scientific records

Collection tiles combine editorial identity, exact Problem count, source and
last-check information, and one action. Collection distributions show
source-declared open, solved, formalized, reviewed, and unknown coverage with
exact totals and a table equivalent.

Problem rows identify collection, question, source state, current Vela state,
evidence strength, last check, and contribution readiness as separate axes.
Related or parameter-family views are derived only from exact source
relationships. They preserve each Problem identity and label unknown or
expensive cells honestly.

The Problem header uses statement typography followed by a compact inline state
summary and four flat tabs: Contributions, Files, Workspace, and History. The state display separates
Problem state, source status, current Repository-local Contribution state, and
checks without explanatory paragraphs or a dashboard slab.

Contributions is the landing surface. It uses a familiar reviewed-change
composition: a bounded result preview, status header, checks, linked sources,
compact fact rail, and progressive technical detail. Its exact relationship map
is a secondary action, not another tab or a custom flow standing between the
reader and the Contribution. Do not insert an
Overview tab that repeats state or links to the tools, and do not nest research
tools under a second tab row.

### Evidence and provenance

The Problem tools share one stable header. Evidence maps show source to
artifact to check or review to current state.
Nodes use typed glyphs, short labels, and semantic colour. Edges use direction,
relation labels, and a synchronized list. Exact roots and provider details live
in progressive disclosure.

Provenance flows name performer, provider, model or method, environment,
independence, limitations, and time. Human and AI performers use the same
hierarchy. Actor kind never substitutes for quality.

Evidence lists support papers, proofs, computations, datasets, code, negative
results, and corrections. Every public search or agent-visible object has a
durable route or an explicit unavailable or private state.

### Chronology, corrections, and comparison

Activity and History use a true timeline. Each node shows what changed, who or
what acted, the before and after state when relevant, and expandable technical
detail. Group repetitive low-signal events without hiding meaningful changes.

Diffs label added, removed, and changed content semantically. Formal statements
and code use line-level comparison when source is available. Corrections show
supersession and retain immutable identity. Mutable presentation metadata can
be corrected with visible history.

### Work and account

Contribution uses a stepper: choose Problem, attach work or evidence, review
scope and provenance, submit. File trees, code previews, artifact summaries,
upload state, retry state, and local-agent handoff sit beside the step that
needs them. Do not show success until metadata and references are durable.

My work and Account use grouped rows, activity, connections, repositories, and
next actions. Profiles use avatars and real contribution or review summaries.
Do not invent streaks, reputation, quotas, authority badges, or activity heatmaps
when data is absent.

### Charts and relationship views

Use charts to answer a named question about distribution, chronology,
comparison, verification strength, provenance, dependency, or change. Prefer
server-rendered SVG or HTML for small views and lazy-load heavier interactive
graphs below the fold. Every chart has a visible title, explanation, legend,
exact values, keyboard path, and text or table alternative.

Relationship canvases provide search, zoom controls, reset, selection detail,
and a synchronized list. Reduced-motion mode removes animated traversal.
Print renders the alternative view and the selected relationship summary.

### Interaction states

- **hover** increases local contrast without moving layout;
- **focus** uses the focus token with a visible two-pixel outline or ring;
- **active** acknowledges the press through colour or one-pixel depth;
- **selected** persists with colour, glyph, and `aria-current` or state;
- **loading** preserves layout with skeletons and names long-running work;
- **empty** explains why the area is empty and offers the next valid action;
- **error** states what failed, what was preserved, and how to retry;
- **degraded** distinguishes stale, rate-limited, and unavailable reads;
- **disabled** remains legible and explains the requirement when useful.

Motion uses 140ms for control feedback, 240ms for layout transitions, and
420ms only for meaningful diagrams or progress. Respect reduced motion and
never delay a task for animation.

## Do's and Don'ts

### Do

- Put the scientific question, current understanding, and next action first.
- Use diagrams, timelines, charts, files, diffs, and previews when they shorten
  the path to understanding.
- Pair compact density with alignment, grouping, and generous section rhythm.
- Show provenance where it changes interpretation, then disclose exact detail.
- Design loading, empty, error, stale, retry, offline, and narrow states with
  the primary composition.
- Use panels and cards when containment or comparison improves the task.
- Make every major Problem surface operable: selectable nodes, browseable
  files, linked Contribution rows, expandable timeline events, and a real
  canvas. Text may annotate an instrument; it may not impersonate one.
- Test at 1280px, 390px, 320px, 200% zoom, forced colours, reduced motion,
  keyboard, touch, and print.

### Don't

- Do not make protocol terms, hashes, roots, or authority prose the first task.
- Do not collapse source status, Vela state, evidence strength, and publication
  state into one badge.
- Do not use generic KPI grids, identical card walls, decorative charts,
  star fields, gradients, glass, or force-directed hairballs.
- Do not encode meaning only in colour, animation, hover, or pointer position.
- Do not use tiny dense type, ambiguous counts, orphan routes, or false success.
- Do not copy a reference product's ontology, branding, reputation system, or
  centralized review semantics.
- Do not organize a screen as a sequence of questions, explanatory headings,
  disclaimer paragraphs, or numbered prose when the same information can be
  shown as state, relationship, chronology, comparison, or an action.
