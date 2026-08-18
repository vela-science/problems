---
register: product
extends: ../../PRODUCT.md
product: problems.science application
---

# Problems application contract

## Route jobs

| Route | Job | First action |
| --- | --- | --- |
| `/` | Understand the product and start | Search or Browse problems |
| `/problems` | See the collections actually published | Open Erdős Problems |
| `/problems/erdos-problems` | Search and filter 1,217 source-owned questions | Open a Problem |
| `/problems/erdos-problems/{number}` | Understand one Problem | Read Overview |
| `?view=work` | Continue mutable work | Open Canvas or start a workspace |
| `?view=results` | Inspect durable outputs and checks | Open a Result |
| `?view=sources` | Inspect exact retained source material | Select a file or excerpt |
| `?view=history` | Understand semantic change | Open an event or correction diff |
| `/graph` | Explore exact scientific relationships | Choose a Problem or Result |
| `/activity` | Follow meaningful published changes | Open the affected context |
| `/search` | Find Problems, Results, and sources | Open the exact result |
| `/contribute` | Start a contribution | Choose a Problem |
| `/import` | Connect an exact GitHub revision | Inspect public code or connect GitHub |
| `/my-work` | Resume private workspaces | Open saved work |
| `/account` | Manage identity, connections, and session | Continue work or manage a connection |

Trust pages remain compact institutional surfaces. Repository and exact-record
routes remain durable contextual destinations, not the primary product IA.

## Home and discovery

Home is the activation screen. Its first viewport contains the product promise,
problem search, Browse problems, Add a contribution, and the honest statement
that one collection with 1,217 Erdős Problems is available today.

Global Problems never silently aliases the Erdős catalog. The collection
directory leads rows with retained question text, uses bounded pagination, and
keeps source status separate from reviewed Result state. Numeric identity is
always collection-qualified outside the directory.

## Problem contract

The canonical tab row is **Overview · Work · Results · Sources · History**.

Overview is substantive. For Problem 321 it shows the exact question, formal
target, source-attributed collection status, Repository decision on the current
contribution, evidence/check coverage, current Result and its unresolved limit,
formal landmarks, open targets, latest Result, representations, and related
Problem state. Other Problems use the same data rules and honest empty states.

Work owns mutable shared coordination. Results owns durable outputs. Sources
owns file/declaration/excerpt browsing. History owns semantic chronology.

Old `view=workspace`, `files`, `contributions`, `evidence`, `timeline`, `record`,
and `map` values resolve to the appropriate current tab. New internal links emit
only `work`, `sources`, `results`, and `history`.

## Data and wording rules

- Visible durable outputs are Results; underlying Claim/Contribution records remain unchanged.
- Collection status is always source-attributed.
- Repository acceptance is labelled as a decision on a contribution.
- Formal target, checks, and publication state remain separate.
- Exact roots and IDs live in disclosures or exact-record routes.
- Every map edge, related Problem, count, and scientific sentence comes from retained data.
- Empty states do not speculate or repeat policy.

## Work and account boundary

Hosted Work may create account-scoped workspaces, approaches, attempts, notes,
Research Blocks, follows, artifact references, and unsigned Submission v3
drafts through `@vela/activity-data`. It cannot access local files, execute
research code, control agent sessions, sign, issue a Decision, or change
scientific state.

Account remains private unless durable public contributor data supports a
separate public route. WorkOS identity, GitHub access, scientific attribution,
and Repository authority are distinct.

## Acceptance matrix

Verify Home, Problems, collection, Problems 4/94/321/887 across all five tabs,
Research map, Updates, Search, Contribute, Import, My work, Account, 404, loading,
empty, error, and degraded states. Use the real local production build in the
in-app Browser at desktop, 390px, 320px, 200% zoom, keyboard, touch, forced
colours, reduced motion, and print.
