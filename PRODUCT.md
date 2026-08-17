---
register: product
---

# Vela Web product brief

Vela Web helps researchers find scientific problems, understand the evidence,
and contribute work that others can inspect and reuse. `problems.science` is
the public product. Local repositories and tools hold the machine context and
authority needed to change scientific state.

## Users and jobs

Vela serves researchers, reviewers, tool builders, and technical readers. Human
and AI performers are peer provenance kinds. Method, evidence, independence,
environment, and limitations determine how a contribution reads.

Users come to Vela to:

- find a question worth reading or working on;
- learn what is known, what supports it, and what remains uncertain;
- check whether an approach has already been tried;
- inspect proofs, computations, datasets, files, checks, and corrections;
- contribute, connect repository work, or continue in a local agent;
- trace who or what produced, checked, changed, or superseded a result.

## First-run outcome

A new reader should understand the product in five seconds:

1. This is a place to find scientific problems, read current evidence, and
   contribute work.
2. Today Vela publishes one collection: 1,217 Erdős Problems.
3. The next action is search, browse, read what is known, or add a contribution.

Activation happens when a reader opens a Problem and uses one of three actions:
**Read what is known**, **Check prior work**, or **Add a contribution**.

Signed-in Home shifts from orientation to continuity. It shows work to resume,
followed Problems, meaningful recent changes, and useful starting points backed
by current data. Signed-out Home remains the fast front door.

## Visible information architecture

The Problem is the canonical frame. A Contribution is the public unit of work:
a proof, computation, dataset, review, negative result, correction, or other
scoped evidence.

Primary navigation is:

- **Problems** for discovery;
- **Updates** for meaningful changes;
- **My work** when signed in;
- **Search** for keyboard-first find and jump;
- the Vela sail for Home.

Add a contribution appears in Problem and work contexts. Repository, Source,
Check, Decision, exact record type, hash, performer, model, tool, and environment
appear where they explain a Contribution. They do not compete with Problems in
primary navigation.

About, Privacy, Terms, Accessibility, and Contact are concise trust surfaces in
the product shell. They explain current behavior and user choices; they are not
a marketing site, protocol manual, or substitute for source-owned reference
documentation.

The Problems hierarchy is durable:

- `/problems` is the global collection entry;
- `/problems/erdos-problems` is the current collection directory;
- `/problems/erdos-problems/{number}` is the canonical detail route.

Problem numbers are collection-local. Breadcrumbs, search, activity, metadata,
and shared links preserve the collection name. Evidence sources such as Formal
Conjectures, Lean libraries, VibeMathed, and TheoremDB do not become Problem
collections. A collection needs source-owned stable identities and an explicit
resolver/profile.

## Core workflows

### Discover

Search accepts number, wording, field, collection, status, and evidence cues.
Results name the collection and show compact state and evidence signals. Global
Problems presents published collections honestly. Collection pages provide
real filters, status and evidence distribution, and a scannable directory.

### Read a Problem

A Problem feels like a scientific working document. The question comes first,
followed by a compact fact rail and six reading areas:

1. **Question**: statement, collection, source, and useful visual explanation.
2. **What is known**: current understanding, uncertainty, competing results,
   dependencies, and unresolved gaps.
3. **Evidence**: papers, proofs, computations, datasets, checks, and
   reproduction status.
4. **Contributions**: attributed human and agent work with typed provenance.
5. **Work**: prior approaches, open gaps, workspace entry, and local handoff.
6. **History**: corrections, supersession, decisions, and exact provenance.

The route can group these areas into stable tabs or sections without losing
their order. The fact rail keeps identity, field, collection, source, current
state, contributors, and one useful handoff action in view.

Current or curated evidence stays distinct from newer Contributions. A recent
Contribution row names contributor, kind, scope, evidence or assessment,
publication status, and expandable detail. Repository-local Standing appears
on the exact Contribution or Claim it governs, never as a verdict on the whole
Problem.

### Check prior work

Exact identity is authoritative. Similarity is advisory. Overlap results state
possible duplicate, intentional replication, no confident match, or stale
index. A partial or negative result names its target, approach, assumptions,
environment, evidence, outcome, and retry boundary.

### Contribute

The browser path stays short:

1. choose a Problem;
2. attach work or evidence;
3. review scope and provenance;
4. submit an unsigned contribution draft.

The browser owns public discovery and shared, authority-free coordination. It
may save workspaces, notes, Research Blocks, comments, selected artifact
references, and unsigned drafts. Repository checkout, filesystem and terminal
access, proof or experiment execution, environment secrets, generic agent
sessions, artifact harvesting, signing, and key custody stay in user-selected
local tools. Handoffs pass explicit HTTPS references and user-selected
artifacts; they never imply local access or upload local state automatically.

Users can import a GitHub repository, attach rooted artifacts, or continue in
Codex, Claude, Entire, or another local tool. Vela links exact external session
or checkpoint references when available. It does not recreate raw Git or agent
session history.

Scope derives from the selected Problem and Contribution target. Forms use
constrained choices, plain-language previews, and fail-closed validation.
Display metadata can be corrected without changing immutable evidence identity.

### Continue work

My work groups followed Problems, workspaces, approaches, imports, drafts, and
recent activity. A user can resume in the browser or hand off to a repository
and local agent with the Problem, task, and exact references intact.

### Profile and account

Account is a private profile hub backed by current data. It shows identity,
connections, repositories, workspaces, contributions, reviews, imports,
security, and next actions. WorkOS account identity, public scientific
attribution, and Vela authority remain separate. Vela does not invent public
reputation, authority badges, quotas, or leaderboards.

## Product principles

- Put the question and the next action before system vocabulary.
- Explain state, chronology, comparison, and relationships with visuals when a
  visual is faster to read than prose.
- Use familiar repository, search, diff, file, timeline, and settings patterns.
- Keep dense information readable through hierarchy, grouping, and progressive
  disclosure.
- Keep exact roots, source versions, queries, and records reachable without
  turning them into onboarding copy.
- Treat human and AI work as peer contributions with explicit provenance.
- Use real data for counts, diagrams, charts, previews, and empty states.
- Preserve durable URLs and URL-backed filters or section state.
- Make loading, empty, error, disconnected, stale, and expired-session states
  part of the product.
- Separate interactive reads from bulk acquisition. Bound pagination, expose
  rate or backpressure states, and never turn degraded service into false data.

## Scientific and data boundary

Canonical Repository Git history owns scientific state. The hosted projection
is read-only and rebuildable. Hosted activity can hold accounts, workspaces,
follows, approaches, attempts, discussion, artifact metadata, and unsigned
Submission v3 drafts. It cannot sign, issue a Decision, or change Standing.

A Check records scoped evidence. A Decision accepts or rejects a proposed
change under Repository authority. A signature proves attribution, not truth.
Current state is Repository-local. Discovery and overlap help users choose what
to inspect or do next.

## Success criteria

- New readers can state what Vela is, what exists today, and where to begin.
- Readers can find a Problem and its strongest evidence without knowing a URL.
- Contribution, review, correction, and provenance paths are discoverable from
  the Problem.
- Collection, Problem, and search identities remain unambiguous at 320px and
  200% zoom.
- Keyboard, touch, forced colours, reduced motion, print, loading, and error
  paths preserve the same task order.
- Server-first routes stay fast; heavy visualizations load below the fold and
  retain a text or table equivalent.
- No hosted action crosses the scientific authority boundary.

## Copy principles

Use concrete verbs: find, read, check, compare, add, import, continue. Name the
object and the axis: “Contribution accepted locally,” “Check passed,” “Source
lists this as open.” Avoid protocol shorthand, vague network language,
unqualified “verified,” and repeated boundary prose.

## Product failures

- A protocol explorer as the primary experience
- A metrics dashboard without user decisions attached
- Walls of prose or repeated disclaimer copy
- Numeric Problem identities without their collection
- Evidence sources presented as Problem collections
- Actor kind presented as a quality score
- Hidden prior work, deep-link-only Contributions, or orphan history
- Decorative charts, graphs, scientific imagery, or fake activity
- A browser clone of tool sessions or Git history, or a reputation leaderboard

## Related contracts

[`DESIGN.md`](DESIGN.md) defines the visual system. App-specific jobs and
compositions live in [`apps/problems/PRODUCT.md`](apps/problems/PRODUCT.md) and
[`apps/problems/DESIGN.md`](apps/problems/DESIGN.md). Implementation and release
details live in [`docs/WEB.md`](docs/WEB.md) and
[`docs/design-system.md`](docs/design-system.md).
