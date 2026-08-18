---
register: product
product: problems.science
version: 2026-08-18
---

# problems.science product brief

## Product promise

problems.science helps people find scientific problems, understand the evidence
around them, see active work and durable results, and contribute their own work.

The Problem is the primary public object. The product should be understandable
without knowing Vela's protocol vocabulary.

## Standing product reference

The chosen direction is **Modern research workspace / Play it straight**. This
is a durable product preference, not a temporary mood board.

- **Entire** is the primary reference for dominant-object hierarchy, compact
  attributed activity, checkpoints and changes, readable code or tool output,
  and progressive technical detail.
- **GitHub** is the reference for breadcrumbs, tabs, files, diffs, checks,
  history, side metadata, durable links, and obvious contribution actions.
- **Hugging Face** is the reference for approachable collection and resource
  discovery, filters, tags, identity pages, and useful technical density.

Borrow interaction conventions, not branding or ontology. Vela must feel like
one coherent research product, not a collage of those products. Familiarity is
preferred over metaphor. The product does not use starscapes, nautical props,
instrument cosplay, parchment, glass, neon, or decorative scientific charts as
its interface concept.

## People and jobs

Researchers, reviewers, maintainers, and tool-using agents come here to:

- find a question by wording, number, field, status, or collection;
- understand what is known and what remains unresolved;
- inspect Results with their evidence, checks, sources, and limitations;
- distinguish active Work from durable Results;
- see how corrections and decisions changed Repository-local state;
- start a contribution, connect code, or continue in a local tool;
- resume private workspaces and manage account connections.

Human and AI performers are peer provenance kinds. Performer type is not a
quality score; method, evidence, environment, independence, and limitations
make work interpretable.

## First-use outcome

Within five seconds, Home answers:

1. This is a place to find scientific problems and evidence.
2. Search or browse is the fastest way to begin.
3. One published collection is available today: 1,217 Erdős Problems.

A Problem answers within ten seconds:

1. What is the problem?
2. What is currently known?
3. What is being tried?
4. What results exist?
5. How did the state get here?

When retained data cannot answer a question, show a compact missing state. Do
not substitute a policy explanation or fabricated scientific summary.

## Current release truth

Today there is one published Problem collection: **1,217 Erdős Problems**.
`/problems` is the global entry point and says this plainly.
`/problems/erdos-problems` is the collection directory. A number such as `321`
is meaningful only inside that collection.

Formal Conjectures, Lean libraries, VibeMathed, TheoremDB, papers, datasets,
and code repositories may appear as sources or evidence. They are not Problem
collections without accepted source-owned identities and a collection profile.

## Visible information architecture

Primary navigation:

- Problems
- Research map
- Updates
- My work when signed in
- Search
- the product mark for Home

The canonical Problem modes are:

- **Overview** — question, current Result or state, unresolved scope, and the
  strongest useful orientation;
- **Work** — mutable shared workspace, approaches, attempts, canvas, Research
  Blocks, notes, and local handoff;
- **Results** — durable outputs, checks, decisions, evidence, and limitations;
- **Sources** — retained files, declarations, excerpts, paths, revisions, and
  source links;
- **History** — semantic chronology, corrections, supersession, and diffs.

Files are an instrument inside Sources, Work, or a Result. A relationship map
is a contextual action and an Explore destination, not another Problem tab.
Durable old query values map into the five current modes; new links use current
language.

## Public language

The user-facing durable output is a **Result**. It may be a proof, computation,
dataset, review, negative result, correction, or other bounded evidence.
Underlying Vela types remain unchanged and are available in technical detail.

Use **contribution** for the act of adding work. Use **Work** for mutable
approaches and attempts. Use **Result** for a durable output a reader can open.

Always keep these axes separate:

- formal target, such as open or proved in retained formal material;
- source-reported status, attributed to its collection;
- Repository decision on an exact contribution;
- evidence and check outcomes;
- publication or workspace state.

An accepted contribution does not mean the Problem is solved. A passing check
does not accept a contribution. A signed object proves attribution, not truth.

## Core workflows

### Discover

Home is the activation front door. Search is the dominant object, followed by
real Problems worth opening, the one published collection, and meaningful
recent changes. It is not a manifesto, protocol guide, or KPI dashboard.

Collection pages are familiar directories: concise identity, truthful coverage,
useful filters, bounded pagination, and question-led rows. Numeric identity is
always collection-qualified outside its directory.

### Understand a Problem

The question leads. Overview synthesizes the best retained data without
repeating every tab. Results, Sources, Work, and History each expose the
recognizable instrument named by the tab. Exact roots and internal record kinds
stay one disclosure deeper.

### Contribute and continue

A user chooses a Problem, attaches work or evidence, reviews a plain-language
preview, and exports an unsigned Submission v3 draft or submits hosted metadata
where allowed. Code stays repository-native. Continue locally and Open source
are first-class handoffs; the browser does not pretend to be a local IDE.

### Resume work and manage identity

My work lists real account-scoped workspaces and attempts. Account is a private
hub for WorkOS identity, GitHub access, connected codebases, workspaces, and
session controls. Login identity, scientific attribution, and Repository
authority remain visibly distinct.

## Authority and data boundary

Hosted Problems may mutate account, shared workspace, follow, approach,
attempt, note, discussion, assignment, artifact metadata, provider-neutral
session reference, and unsigned draft data through `@vela/activity-data`.

Hosted Problems cannot sign for a user, issue a Vela Event or Decision, change
Standing, hold a Repository authority key, run local code, access a local file
system, manage secrets, or control Entire sessions. Scientific-state reads are
an exact SELECT-only projection and fail closed on incompatible manifests.

## Product principles

- One page, one dominant object.
- Familiar controls before invented interaction.
- Show the data with rows, files, diffs, timelines, and maps; explain only what
  the data cannot make clear.
- Progressive disclosure is for technical precision, not for hiding the main
  user task.
- A fact appears once unless a second presentation changes its interpretation
  or is the accessible fallback.
- Visualizations must answer a real relationship, chronology, comparison, or
  coverage question and include a text or table equivalent.
- Human and agent activity use the same visual hierarchy.
- Empty, loading, error, private, stale, and degraded states are complete
  product states, not afterthoughts.

## Copy principles

- Lead with the Problem, Result, file, person, or action.
- Use sentence case and concrete verbs.
- Prefer “Open source,” “View checks,” “Start work,” and “Add a result.”
- Attribute status at the point of display.
- Keep protocol nouns, hashes, roots, and boundary explanations in contextual
  technical details.
- Avoid slogans, repeated questions, numbered onboarding prose, abstract
  coordination language, and claims of priority, ranking, or universal truth.

## Success and quality gates

Success means a newcomer can find a relevant Problem, distinguish source status
from reviewed Result state, open the exact evidence, and identify the next
action without instruction.

Quality gates include WCAG 2.2 AA, keyboard operation, 320px and 390px widths,
200% zoom, forced colors, reduced motion, print, bounded server reads, stable
layout, no horizontal document overflow, and a local production-build Browser
check. Exact release, projection, and route contracts remain binding.

Protocol and schema reference belongs to Core. Web implementation boundaries
belong in `AGENTS.md`, `docs/WEB.md`, and focused security or data documents.
