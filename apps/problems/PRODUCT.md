---
register: product
extends: ../../PRODUCT.md
product: problems.science application
---

# Problems application contract

## Route jobs

| Route | Dominant object | First action |
| --- | --- | --- |
| `/` | Problem search and discovery | Search or browse |
| `/problems` | Published collections | Open a collection |
| `/problems/erdos-problems` | Filterable Problem directory | Open a Problem |
| `/problems/erdos-problems/{number}` | Question and current state | Read Overview |
| `?view=work` | Canvas, files, and research objects | Continue work |
| `?view=results` | Durable outputs and checks | Open a Result |
| `?view=sources` | File browser and exact preview | Select a source |
| `?view=history` | Chronology and correction diffs | Open an event |
| `/graph` | Exact relationship canvas | Choose a Problem or Result |
| `/activity` | Meaningful published changes | Open affected context |
| `/search` | Cross-product results | Open the named object |
| `/contribute` | Contribution workflow | Choose a Problem |
| `/import` | Exact GitHub revision | Inspect or connect code |
| `/my-work` | Private work continuity | Open saved work |
| `/account` | Identity, connections, and session | Manage or continue |

Trust pages remain compact institutional surfaces. Exact-record and Repository
routes are durable contextual destinations, not primary navigation.

## Home

Home is the product activation screen, not a marketing hero. Search is the
dominant object. The first viewport also provides Browse problems, Add a
contribution, and the exact one-collection truth. Below it, use real question
rows, one compact collection row, and meaningful recent activity. Do not repeat
the same availability or coverage facts in several sections.

## Collection

The collection route uses a concise collection identity, exact count, truthful
source-status distribution, search and filters, then the Problem directory.
Rows lead with the collection-local number and retained question. Source status,
formal material, reviewed Results, and source stay distinct.

## Problem

The canonical tabs are **Overview · Work · Results · Sources · History**.

Overview is substantive: complete question, compact orthogonal state, current
Result or honest absence, unresolved scope, exact landmarks, and a small fact
rail. It must not repeat navigation or every fact from the header.

Work owns mutable shared coordination. Results owns durable outputs. Sources
owns files, declarations, and excerpts. History owns semantic chronology.
Legacy query values resolve to the relevant current tab; internal links emit
current names only.

## Data and wording

- Visible durable outputs are Results; protocol types remain unchanged.
- Collection status is always source-attributed.
- Repository acceptance is labelled as a decision on a contribution.
- Formal target, checks, source status, and publication remain separate.
- Exact roots and identifiers live in disclosures or exact routes.
- Every relationship, count, scientific sentence, and activity item comes from
  retained data.
- Missing data gets a compact missing state, not speculative prose.

## Work and account boundary

Hosted Work may manage account-scoped workspaces, approaches, attempts, notes,
Research Blocks, follows, artifact references, and unsigned Submission v3
drafts through `@vela/activity-data`. It cannot access local files, execute
research code, control agent sessions, sign, issue a Decision, or change
scientific state.

Account is private unless durable public contributor data supports a separate
route. WorkOS identity, GitHub access, scientific attribution, and Repository
authority are distinct.

## Acceptance matrix

Verify Home, Problems, collection, Problems 4/94/321/887 across all five modes,
Research map, Updates, Search, Contribute, Import, My work, Account, 404,
loading, empty, error, and degraded states. Use the real local production build
in the in-app Browser at desktop, 390px, 320px, 200% zoom, keyboard, touch,
forced colors, reduced motion, and print.
