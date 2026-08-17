---
register: design
extends: ../../DESIGN.md
---

# Problems composition guide

This file maps the shared Vela design system to Problems routes. It owns page
composition, responsive priority, data-state presentation, and app-local visual
instruments. Shared controls and semantics stay in `@vela/ui`.

## Route to composition map

| Surface | Primary composition | Supporting visual system |
| --- | --- | --- |
| Home | focused search hero plus task-oriented workspace | connected three-step start, one collection row, grouped recent activity |
| Global Problems | collection entry and useful starting points | editorial collection tile, exact availability note, compact state cues |
| Erdős collection | toolbar plus dense directory | source-status distribution, evidence coverage, URL-backed filters |
| Problem | scientific reading column plus fact rail | visual state summary and source-to-state provenance flow |
| What is known | current packet plus unresolved gaps | competing-result summary, dependency or family view when supported |
| Evidence | evidence groups and selected detail | provenance map with synchronized list |
| Contributions | typed attributed rows | contributor identity, assessment, expandable artifact preview |
| Work | prior approaches plus workspace entry | contribution stepper, files, code, agent handoff |
| History | chronological scientific changes | event spine, correction and supersession paths, before/after diff |
| Updates | grouped activity stream | avatar or source glyph, event preview, contextual action |
| Search | command results plus filter summary | collection cues, state glyphs, unavailable and stale states |
| My work | resume groups | active drafts, imports, workspaces, next step |
| Contribute and import | staged form and preview | stepper, scope preview, upload and retry feedback |
| Account | identity header plus grouped settings | connections, real activity, security, next actions |
| About and policies | calm reading surface in the product shell | source-to-published-view-to-Repository-state explanation, concise local navigation |
| Repository and source | browse and inspect | file tree, code preview, releases, import status |
| Relationship graph | searchable synchronized canvas and list | selected-node detail, reset, filter, accessible summary |

## Home

Keep the first viewport direct: product sentence, useful search, current
availability, Browse problems, and Add a contribution. The three-step path is a
connected sequence or action list, not three marketing cards. Below it, use one
Erdős collection row, recently updated work, Problems with reviewed evidence,
and a contribution handoff. Do not turn counts into generic KPI tiles.

## Discovery

Collection discovery leaves room for future source-owned collections while
showing only the one that exists. The current collection tile can use a
data-derived editorial figure, but its text states the source and exact count.

The Erdős directory pairs a compact segmented distribution with a dense result
list. The distribution answers how the corpus is described by its source and
how much reviewed evidence is available. It includes exact totals and a table
fallback. Filters show collection, source status, evidence state, and last
check as separate controls.

Problem rows lead with a concise question or collection-qualified number. Keep
state glyphs, evidence summary, last update, and the primary action aligned.
Loading rows preserve those columns; empty states explain active filters;
degraded states distinguish stale projection, rate limit, and reader failure.

## Problem reading composition

On wide screens, use a reading column and a 280 to 320px fact rail. The rail can
stick within the viewport after the question but cannot obscure the footer or
become a wall of badges. It carries identity, collection, field, source and last
check, source status, current state, evidence strength, contributors, and one
handoff action.

The Question section uses statement typography. A visual state summary below it
keeps source status, current Repository-local state, review strength,
publication state, and uncertainty distinct. The provenance flow shows source,
scientific record, checks or reviews, and current state. Exact roots open in a
technical-details disclosure.

What is known separates curated current evidence from newer Contributions. If
exact relations describe a parameter family, render a labelled matrix of
known, open, unknown, and computation-readiness cells with a linear-list
fallback. Never infer family membership from similar titles alone.

## Evidence, work, and history

Evidence uses a structured map on wide screens and grouped flow rows on narrow
screens. Selecting a node updates the detail panel and synchronized list.
Source, artifact, reviewer or method, outcome, and current relevance remain
visible without exposing every hash.

Work shows prior approaches and unresolved gaps before the browser workspace.
The contribution stepper is Choose Problem, Attach work, Review, Submit. File,
code, and artifact previews sit beside the relevant step. Import states keep
user input and expose retry or local recovery.

The browser Workspace is visibly shared coordination. Local handoff controls
are disclosures or explicit actions labelled “Continue locally” or “Open
source”; they do not resemble an embedded terminal, filesystem, IDE, agent
runtime, or signing surface. A handoff preview names the exact public references
and selected artifacts that will leave the browser.

History uses one chronological spine. Corrections and supersession show the
old and new presentation or scientific object, actor, reason, and retained
identity. Expandable diffs use added, removed, and changed labels. Compact
technical provenance follows the event instead of becoming a peer route.

## Updates, search, account, and work

Updates groups repeated low-signal events and expands material changes.
Avatars and source glyphs identify actors or systems without ranking them.

Search uses the shared command pattern and a full-page result mode. Results
always name the collection for Problems and distinguish exact identity from
advisory similarity. An agent-visible object that lacks public access renders a
clear unavailable or private result rather than a broken link.

My work and Account use grouped rows and split sections, not metric slabs.
Account leads with avatar, display name, private email treatment, connected
providers, and a meaningful next action. Activity visualization appears only
when real contributions or reviews support it.

## Responsive and interaction behavior

At 1024px, the Problem fact rail can move below the state summary or into a
sheet. At 768px, split views stack, timelines retain their spine, and directory
toolbars wrap. At 390px and 320px, the question, state, strongest evidence, and
primary action stay before secondary metadata. Code and diagrams get explicit
scroll regions plus a list or summary fallback.

Keyboard order follows the visual task order. Tabs, segmented controls,
diagrams, timelines, command results, and disclosures expose visible focus and
screen-reader labels. Charts and maps provide exact text equivalents. Forced
colours preserve nodes and edges; reduced motion removes traversal and layout
animation; print selects the linear fallback.

## Component ownership and reference use

Use existing `@vela/ui` primitives before adding a shared primitive. App-local
code owns page compositions, route controllers, editorial collection figures,
and the relationship instrument. Adapt interaction patterns from shadcn.io and
licensed Tailwind Plus examples only when they simplify a real task. Record any
licensed source. Move a composition into `@vela/ui` only after two maintained
consumers share a stable need.
