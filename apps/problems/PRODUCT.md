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
| `/problems/formal-conjectures` | Rights-reviewed formalization subset | Open a formalization |
| `/problems/formal-conjectures/{occurrence}` | Exact declaration occurrence | Read Overview or Sources |
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
| `/people/{handle-or-id}` | Public contributor attribution | Open exact activity context |
| `/about` | Current product explanation and vision | Understand the boundary or open the essay |
| `/about/endless-frontiers` | Permanent compatibility redirect | Continue to the canonical essay at vela.space |

About is the living bridge between product and editorial registers. The full
vision essay lives at `https://vela.space/constellations`. Privacy, Terms,
Accessibility, and Contact remain compact institutional surfaces. Exact-record
and Repository routes are durable contextual destinations, not primary
navigation.

## Home

Home is the product activation screen, not a marketing site. Search is the
dominant object. Its focused single-column opening provides Browse problems,
Add contribution, and one compact list stating the exact two-collection truth.
Editorial artwork and the full vision live at `vela.space`, not beside the
product search.
Below it, use three or four real question rows and the two durable reviewed
Results. Link once to all Updates. Do not repeat collection analytics, raw
source activity, availability, or contribution onboarding on Home.

The global sidebar is Home, Problems, signed-in My work, Updates, and a
separate Add contribution action. Header command search owns Search. Research
map, exact records, and release details remain reachable contextually rather
than competing in the global spine.

## Collection

Each collection route uses a concise identity, exact count, truthful scope,
search and useful source-owned filters, then its directory. Erdős rows lead
with the collection-local number and retained question. Formal Conjectures rows
lead with the human question and keep declaration identity progressive. Source
status, formal material, reviewed Results, and Vela state stay distinct.

Formal Conjectures is a bounded read-only adapter over exact upstream Git
bytes. Its initial seven occurrences retain exact declaration, file, category,
docstring, rights basis, revision, and roots. Upstream GitHub PRs and automated
checks remain advisory/source workflow; they do not become Vela Results,
Decisions, or Standing.

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

Account stays private. A contributor may separately publish or unlist a small
presentation profile at `/people/{handle}`; the safe default is private. Exact
retained performers also have stable `/people/p-{id}` attribution routes, and
only a separately verified link may redirect one to an account profile. WorkOS
identity, GitHub access, scientific attribution, performer kind, and Repository
authority are distinct. Removing an account link never rewrites historical
scientific attribution.

## Acceptance matrix

Verify Home, Problems, collection, Problems 4/94/321/887 across all five modes,
Research map, Updates, Search, Contribute, Import, My work, Account, 404,
loading, empty, error, and degraded states. Use the real local production build
in the in-app Browser at desktop, 390px, 320px, 200% zoom, keyboard, touch,
forced colors, reduced motion, and print.
