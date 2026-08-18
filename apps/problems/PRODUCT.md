---
register: product
extends: ../../PRODUCT.md
---

# Problems product contract

Problems is the unified application at `problems.science`. It turns an exact,
read-only scientific projection into a useful public reading experience and
connects that experience to non-authoritative hosted work.

## Release truth

The current release contains one published collection: 1,217 Erdős Problems.
The global architecture supports future source-owned collections without
pretending that evidence providers or formal libraries are collections.

## Route jobs

| Route | User job | First useful action |
| --- | --- | --- |
| `/` | Understand Vela and resume meaningful work | Search or browse Problems |
| `/problems` | See what collections actually exist | Open Erdős Problems |
| `/problems/erdos-problems` | Scan and filter the collection | Open a Problem |
| `/problems/erdos-problems/{number}` | Read the question and current evidence | Read what is known |
| `/activity` | Review meaningful recent changes | Open the affected Problem |
| `/search` | Find Problems, Contributions, and public artifacts | Open an exact result |
| `/my-work` | Resume followed Problems, drafts, imports, and workspaces | Continue work |
| `/contribute` | Add a scoped Contribution | Choose a Problem |
| `/import` | Connect repository work | Select and inspect a repository |
| `/codebases` | Browse connected code context | Open files or continue locally |
| `/account` | Manage private identity, connections, security, and activity | Continue work or manage a connection |
| `/about` | Understand the product and its scientific-state boundaries | Browse Problems |
| `/privacy`, `/terms`, `/accessibility`, `/contact` | Understand current policies and get help | Use the relevant account, contribution, or private-support path |

Repository, source, record, and graph routes remain durable contextual
destinations. They do not become primary navigation sections.

## Home

Home is the fast front door. The first viewport states what the product does,
what exists today, and where to begin. Signed-out readers get search, Browse
problems, and Add a contribution. Signed-in readers also get work to resume,
followed Problems, and meaningful changes. Exact roots stay below progressive
disclosure.

## Global Problems and collection discovery

`/problems` is a true global collection entry, not an alias for the Erdős
catalog. It names the single current collection and may show useful recent or
reviewed Problems without implying a multi-domain inventory.

The Erdős directory provides search, filters, bounded pagination, exact counts,
source-state distribution, evidence coverage, last-check information, and
honest unknowns. Parameter-family views appear only when exact source relations
support them. They group navigation and comparison without merging distinct
Problem identities or changing Standing.

## Problem contract

Every Problem has one question title, a compact inline state summary, and four
flat tabs: **Contributions**, **Files**, **Workspace**, **History**.
Contributions is the canonical landing view and reads like a familiar reviewed
change: result, performer, checks, sources, Decision, and exact detail. The
relationship map is a secondary action. There is no
Overview summary tab, Map tab, or nested Research tab.

Legacy `view=evidence`, `view=history`, and `view=work` links map to the matching
flat tool without rendering duplicate content. Contributions, files, exact
relationships, and corrections must be reachable from the Problem itself.

The inline summary and Contribution surface keep Problem state, source status, current Repository-local
Contribution state, and checks as distinct axes. The interface does not repeat
those facts in adjacent prose. Exact roots and record vocabulary remain in
technical details or exact record routes.

## Contributions and prior work

Contributions are typed as proof, computation, dataset, review, negative result,
correction, or other evidence. Rows show contributor, kind, target, assessment,
publication state, and expandable provenance. Human and AI performers use the
same presentation hierarchy.

Prior-work matching is advisory. Results distinguish possible duplicate,
intentional replication, no confident match, and stale index. Partial and
negative results show target, approach, assumptions, environment, outcome, and
retry boundary.

## Contribution and import reliability

The contribution flow derives scope from the selected Problem and target. It
uses constrained choices, a plain-language preview, and fail-closed validation.
Titles are presentation metadata, not prompts or immutable evidence identity.

Hosted metadata handoffs are idempotent and show pending, saved, failed,
rate-limited, stale, and retry states. Large bytes stay in repositories or
external stores. A failed handoff keeps the user's input and gives recovery
instructions. No interface reports success before durable references exist.

Every public object exposed through search or agent context has a durable UI
route or an explicit unavailable or private state. Route-contract tests enforce
that parity.

The Workspace view is shared coordination, not a local development environment. It
does not claim repository checkout, filesystem access, terminals, native
method execution, secret management, agent orchestration, generic session
storage, artifact harvesting, or signing. “Continue locally” passes exact
public references and user-selected artifacts to a tool the user controls.

## Account and authority

Account is a private profile hub unless durable public contributor data justifies
a separate public route. WorkOS identity, scientific attribution, and Vela
authority remain distinct. Hosted code creates unsigned Submission v3 drafts
only; local repositories retain signing and scientific authority.

## Acceptance

Representative empty, partial, resolved, contested, stale, failed, and degraded
states must work across diverse Problems. Verify desktop, 390px, 320px, 200%
zoom, keyboard, touch, forced colours, reduced motion, print, signed-out and
signed-in paths against a local production build in the in-app Browser.
