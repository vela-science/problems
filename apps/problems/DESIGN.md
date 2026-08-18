---
register: design
extends: ../../DESIGN.md
application: problems
---

# Problems composition guide

## Route-to-composition map

| Surface | Dominant composition | Real supporting data |
| --- | --- | --- |
| Home | ink search hero + question rows | one-collection truth, coverage, recent changes |
| Global Problems | ink collection entry | published collection and current starting points |
| Erdős collection | collection hero + filterable directory | source distribution, formal/review coverage, exact questions |
| Problem Overview | question folio + synthesis/rail | current Result, limits, landmarks, targets, representations |
| Work | workspace instrument | object tree, Canvas, Research Blocks, Notes, attempts |
| Results | reviewed-change surface | assertion, producer, checks, sources, decision, revision |
| Sources | file explorer | retained paths, declarations, excerpts, revision, source links |
| History | chronology + correction diff | semantic events, actors, before/after, technical disclosure |
| Research map | chooser/list + exact canvas + detail sheet | retained nodes and edges only |
| Updates | grouped timeline | source or state event, actor, time, context |
| Search | command surface + labelled filters | question-led rows and collection identity |
| Contribute | warm task lead + stepper | selected Problem, scope, evidence, handoff |
| Import | warm lead + public/private split | exact GitHub revision and access state |
| My work | warm continuity lead + workspace rows | real private workspace data |
| Account | avatar identity field + grouped rows | WorkOS, GitHub, codebases, workspaces, session |

## Approved Problem example

`ProblemReferenceHeader` and `ProblemOverviewReference` on Erdős Problem 321
define the visual calibration:

- complete question wraps within 44rem;
- the collection-qualified identity is quiet;
- Start work is primary and exact source secondary;
- Formal target is prominent;
- Erdős source status is explicitly attributed;
- Repository decision says it governs a contribution;
- evidence/check coverage is separate;
- current state shows the exact Result and the part it does not establish;
- formal landmarks use a compact comparison figure;
- the reading rail contains representations and related-Problem truth;
- roots remain behind Technical identity.

This is a reusable composition, not Problem-321-specific markup.

## Responsive recipes

- Desktop: 200px sidebar; Problem header main/rail split; Overview about 2:1.
- 1024px: fact and detail rails may stack; canvas controls remain visible.
- 768px: Results and Sources split views stack without changing reading order.
- 390px and 320px: all five Problem tabs remain discoverable in one row;
  question, formal target, and primary action precede secondary metadata.
- 200% zoom: no document overflow; internal code/formal panes may scroll.
- Print: remove shell, expand details, use list versions of graphs and canvases.

## Component recipes

### Question rows

Use collection-local number in a fixed mono column, question text as the link,
then compact source status, formal declaration count, reviewed Result count, and
source label. Do not repeat the collection badge on every row inside one
collection.

### Results

Use a Result header, assertion, performer/time, check rows with distinct glyphs,
linked source rows, and a fact rail. `Open result`, `Review and decision`, and
`Browse sources` are contextual actions. Exact Contribution IDs appear only in
Technical details.

### Sources

Use a tree/list on wide screens and preview-first stacking on narrow screens.
Selected paths use cobalt-soft selection plus `aria-current`. Proof facts use
shape and label as well as colour. Rights or retention gaps render Preview
unavailable with Open exact source.

### Work

Signed out: recognizable Files, Canvas, Research Blocks, and Notes preview plus
sign-in and source actions. Signed in: resizable object tree, Canvas or selected
object, and inspector. The canvas contains only explicit Problem, source, Work,
and Result relationships.

### History and map

History uses one spine and expandable correction comparisons. Map defaults to
an item chooser when no node is selected, then loads the exact neighbourhood.
The List view is the accessible and narrow fallback.

### Empty and degraded states

An empty state names the absent object and provides one next action. A degraded
state distinguishes unavailable private activity from intact public Problems.
Foreign projection configuration fails closed with a concise repair message,
not a runtime overlay or silently reinterpreted data.

## Reference pattern use

Use shadcn.io MCP metadata and previews while shaping. Fetch source only for a
pattern selected for implementation. Adapt behavior through existing
`@vela/ui` Base UI/Hugeicons primitives; do not paste a block or add Framer
Motion/Lucide.

Relevant pattern families:

- `search-global` for command/search geometry;
- `timeline-condensed` and activity feeds for chronology;
- `tables-file-tree` for source browsing;
- `ai-code-diff-viewer` for correction comparison;
- architecture/network graph patterns for synchronized map geometry;
- horizontal stepper patterns for contribution flow;
- profile author/settings patterns for Account hierarchy.

Entire informs attributed activity and progressive provenance; GitHub informs
files, diffs, checks, and durable collaboration; Hugging Face informs collection
and resource discovery; Linear informs hierarchy and keyboard speed; Epoch
informs compact problem/status discovery. None supplies Vela's ontology or
brand.

## Verification

Visual review checks comprehension, not only overflow. A reviewer should be
able to identify the object, its current readable state, the primary action,
and the exact-data instrument within five seconds. Capture desktop and 390px
screenshots of the main route families and Problem 321; exercise Problem 4, 94,
and 887 for data diversity.
