---
register: product
---

# Vela Problems

## Purpose

Vela Problems joins a read-only scientific State surface with a writable,
non-authoritative Workspace. It helps researchers inspect published
repositories, find direct contribution paths, coordinate attempts, retain rooted Research
Blocks, and prepare unsigned handoffs without confusing activity for authority.

Its canonical closed loop is `Problem -> native work -> Submission -> Proposal
-> Verification -> Decision -> Event -> Replay -> Standing`. A Problem-scoped
Workspace may retain an Approach and Attempt as bounded coordination, but that
activity is not a protocol object and never becomes evidence or Standing by
itself. Historical protocol objects retain their exact bytes and names; retired
hosted work inventories are not part of the current product.

## Users

- Researchers locating a Problem, its exact sources, or a direct contribution path.
- Producers inspecting exact packets and verifier requirements.
- Reviewers separating proposal, verification, and terminal decisions.
- Readers tracing a result to its evidence and reproduction path.

## Product principles

- Lead with the scientific object or workflow, not explanation about the interface.
- Use familiar repository and data-table behavior.
- Keep exact roots one interaction away without making them the primary reading layer.
- Preserve accepted, pending, rejected, withdrawn, replayed, verified, recorded, and strict-blocked as distinct states.
- Workspaces may change hosted activity, but never sign, mutate a Repository,
  or imply that verification is acceptance.
- Human accounts personalize product workflow only. A signed-in account is not
  a Vela actor identity and carries no repository authority.
- Center each claim record on “Why this stands”: retained evidence, scoped
  verification, Decisions, Events, corrections, and the resulting Standing.

## Product model

The public product has two prominent nouns:

- **Problem** — the canonical scientific question and current understanding.
- **Contribution** — a proof, computation, dataset, review, negative result,
  correction, or other bounded evidence.

Everything else is contextual to those two: a Review or Check evaluates a
Contribution; a Decision changes whether a Contribution is included in
current state; a Source supports a statement or Contribution; a Repository
contains relevant code or formal material; human, agent, model, tool,
method, and environment are provenance; exact records, hashes, signatures,
and protocol objects are technical details. All of these remain real and
linkable, but they do not compete for global navigation.

Global navigation is Problems, Updates, My work (signed in), and Search.
The logo is Home. "Add contribution" is a contextual action, not a
permanent information category. Repositories, Sources, Records, Decisions,
Proposals, Hubs, and Graph keep their durable routes, reached through
contextual links, search, the footer map, and technical-detail disclosures.

The Problems navigation is three levels, not one flattened catalog:

- `/problems` lists the Problem collections explicitly published in this
  release and states the present coverage honestly;
- `/problems/erdos-problems` is the current 1,217-row **Erdős Problems**
  directory;
- `/problems/erdos-problems/{number}` is the canonical Problem page.

Home is the fast front door to that hierarchy. Its first viewport explains the
product in plain language, offers Problem search and the two primary actions,
and states the current one-collection, 1,217-Problem coverage without presenting
evidence sources as collections. Activity and reviewed starting points follow
orientation; exact record context stays progressive.

Problem numbers are collection-local. Breadcrumbs, search results, recent-item
surfaces, metadata, and structured data therefore retain **Erdős Problems** as
part of the identity. Evidence sources do not become new collections by
inference; future collections require source-owned stable identities and an
explicit resolver/profile.

A Problem page has four sections: **Overview** (the question, its state,
plain-language current understanding, what remains unknown, the primary
next action), **Evidence** (contributions, verification strength,
human/agent/tool attribution as peers, sources and artifacts, inclusion in
current state), **Work** (open next steps, approaches, negative results,
start or continue work, submit a contribution), and **History**
(corrections, reviews, included and rejected contributions, supersession,
exact technical provenance on expansion).

Data displays follow the question the reader is answering. Collection and
search pages use exact filterable ledgers; History uses chronology;
corrections use before/after or supersession paths; provenance summaries keep
their underlying facets readable. Charts appear only for real comparisons and
always retain a text or table equivalent. The current single-collection release
therefore states its coverage directly instead of presenting a decorative
dashboard.

Repository-local Standing appears on the exact Contribution it governs; it
never reads as the status of the whole Problem. The Problem's own state is
the four-word public axis: Open, Partial, Resolved, or Contested, each
derived from declared source status and accepted Contributions, with its
basis stated beside it.

## Anti-references

- Generic admin dashboards dominated by metric cards.
- Bespoke ledgers, page frames, filter bars, and disclosure widgets.
- Dark-neon AI tooling, decorative graphs, or marketing chrome.
- Repeated authority explanations and dense introductory prose.
- Navigation that mirrors the internal data model instead of the two
  public nouns.
