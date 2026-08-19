---
register: design
extends: ../../DESIGN.md
application: problems
---

# Problems composition guide

This app follows the root two-register system. Task routes use the familiar
product grammar below. Home, collection identity, graph orientation, and
meaningful empty or degraded moments may use restrained first-party Vela art
and the canonical sail when that improves orientation without competing with
search, rows, files, results, or controls.

## Route map

| Surface | Dominant composition | Supporting data |
| --- | --- | --- |
| Home | search + discovery list | compact collection rows, questions, reviewed Results |
| Global Problems | collection directory | published collections only |
| Erdős collection | filters + Problem rows | exact count, source status, formal/review coverage |
| Formal Conjectures collection | filters + formalization rows | exact declaration, source family, category, revision |
| Formal Conjectures occurrence | question + declaration object | source code, rights, exact revision, honest missing Result |
| Problem Overview | question + current Result | scope, checks, landmarks, representations |
| Work | object tree + canvas + inspector | files, Research Blocks, notes, attempts |
| Results | Result reader + checks | assertion, performer, evidence, sources, decision |
| Sources | file tree + preview | paths, declarations, excerpts, revision, source link |
| History | compact timeline + diff | actors, semantic change, before/after |
| Research map | canvas + synchronized list | exact retained nodes and edges |
| Updates | grouped activity | actor, event, object, time, context |
| Search | command results + filters | human labels, collection identity, exact detail |
| Contribute | task form + stepper | Problem, scope, evidence, preview, handoff |
| Import | repository identity + status | GitHub access and exact revision |
| My work | workspace rows | real private work and state |
| Account | profile + grouped settings | WorkOS, GitHub, workspaces, session |
| Contributor profile | identity rail + attributed activity | exact role, Problem, Result/check context |
| About | watercolor opening + concise product boundary | vision essay, public loop, exact release detail |
| Endless Frontiers | continuous long-form folio | retained paintings, citations, route back to Problems |

## Calibration surfaces

Home, both collection directories, Erdős Problem 321, and an exact Formal
Conjectures occurrence are the initial system checkpoint. They establish the neutral canvas, marine navigation,
cobalt interaction, normal product headers, directory density, question-first
Problem identity, border-bottom tabs, current Result composition, and compact
metadata rail. They are not demo-specific implementations.

The same components must render Problems 4, 94, and 887, including mixed formal
targets, no current Result, partial sources, and corrected history.

## Responsive behavior

- Desktop: 200px sidebar; wide working canvas; Overview about 3:1 with a compact
  metadata rail.
- 1024px: split views may narrow or stack without changing task order.
- 768px: Results, Sources, Work, and History preserve their main instrument
  before supporting detail.
- 390px and 320px: all five tabs remain discoverable; rows wrap metadata; code
  and formal material scroll within their panes.
- 200% zoom: no document overflow; controls and tabs remain reachable.
- Print: remove shell, expand technical details, render list equivalents.

## Screen recipes

### Home

Use one concise heading, one sentence, a prominent search field, and two
actions. Use the retained opening watercolor as the only first-viewport image,
beside the task column on wide screens and after it on narrow screens. Place
one compact published-collections list close to search. Follow with three
or four question rows and the two durable reviewed Results. Keep one small link
to all Updates. Remove raw update feeds, Home collection charts, marketing
banners, repeated onboarding labels, and duplicated coverage explanations.

### About and essay

About may leave the standard policy-page composition. It uses one strong
watercolor opening, a concise explanation of Problem, Result, source, and
Repository-local state, and a visible route to *Endless Frontiers*. The essay
keeps the application shell but uses editorial display and body type, a 65–72ch
measure, authored paintings, inline citations, and calm section pacing. It does
not restore the retired site masthead or footer.

### Collection

Use a normal identity header. Put the compact source-status distribution beside
or below the identity, then place filters directly above rows. The directory is
the dominant object. More filters remain disclosed until needed.

### Problem

Use collection-qualified identity, the complete question, Start work, and Open
source in one header. A compact state strip separates formal targets,
source-attributed status, Repository decision on a contribution, and checks.
Tabs use a border-bottom row with no enclosing card.

Overview leads with the current Result or an honest absence. Show its unresolved
limit, check summary, evidence, and source binding without repeating the state
strip. Exact landmarks are compact rows. The side rail owns topics,
representations, last source update, exact map, and technical identity.

### Results

Use outcome-specific check glyphs and labels. Present performer, method, time,
evidence, sources, and decision in a compact hierarchy. Exact IDs and roots are
progressive detail.

### Sources

Use the selected source as a file-browser object. Wide screens use tree/list and
preview; narrow screens stack. Label excerpts and declarations truthfully when
full file bytes are unavailable. Preserve exact source, path, and revision.

### Work, History, and map

Work exposes Files, Canvas, Research Blocks, Notes, and attempts with familiar
names. History uses one grouped spine and expandable semantic diffs. The map
uses only exact relationships and always has a synchronized list or clear
choose-a-Problem state.

## Shared component use

Use `@vela/ui` Base UI primitives and Hugeicons. Adapt the already inspected
shadcn.io command-menu, file-tree, and compact-timeline behaviors; do not copy
their demo styling or dependencies. Route compositions remain app-local until
two maintained consumers justify promotion.

Every route implements hover, focus, selected, loading, empty, error, disabled,
forced-color, reduced-motion, dark, narrow, zoom, and print states according to
the root design system.
