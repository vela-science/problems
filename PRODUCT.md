---
register: product
---

# Vela Web product contract

Vela Web helps people inspect exact scientific state and coordinate work on it.
Hosted Vela is non-authoritative.

## Product story

The protocol's own loop is `map → target → work → submit → verify → decide →
remap`. Vela's shorter compression of it is:

```text
MAP → ADVANCE → REMAP
```

A reader maps exact state, dependencies, disagreement, and gaps. Problems users
then coordinate approaches, attempts, reproduction, and candidate results in a
separate activity plane. A user can export a valid unsigned Submission payload
and sign it with a local key. The receiving Repository, Vela verification, and
an authorized human Decision remain the only route to new Standing.

The ecosystem has three surfaces:

1. `www.vela.space` publishes editorial and protocol documentation.
2. The Vela product application, served at `app.vela.space` and
   `problems.science`, reads exact scientific State and writes hosted research
   activity.
3. The local Vela and Repository surface signs, verifies, decides, publishes,
   and replays canonical scientific state outside the hosted service.

The hosted product spans two planes. The scientific-state plane contains exact
Repository, Claim, Submission, Verification, Decision, and Standing records.
The activity plane contains hosted accounts, workspaces, follows, approaches,
attempts, discussion, assignments, artifact metadata, external session references, and
unsigned drafts. Activity may refer to exact scientific roots. It cannot change
them.

## The visible product model

The product has one conceptual center: **Problems**. A reader chooses a Problem,
then chooses **Current State** or **Workspace** on that same page. Seven public
concepts cover the complete reader and contributor journey:

- **Problem** is the scientific question.
- **Current State** is the evidence-supported view, with source status and Local
  Standing shown as separate axes.
- **Research Brief** explains what matters, what changed, the evidence and
  limits, and what should move next.
- **Target** is a bounded next step.
- **Research Block** is a durable contribution such as an experiment, proof
  attempt, dataset, argument, or negative result with rooted artifacts.
- **Workspace** is private or team-local coordination. Its approaches, attempts,
  notes, requests, and drafts remain outside public scientific truth.
- **Decision** is an explicit human or Repository-authority action. Evidence and
  discussion never substitute for it.

The global application has four user-intent destinations:

- **Home** answers what changed, what matters, and what needs attention.
- **Problems** is the cross-domain scientific-question directory.
- **Work** leads from open Targets into Workspaces and Research Blocks.
- **Activity** opens State history. Workspace activity appears only in a
  separate lane when retained global activity data can support it.

Repositories and Sources form a quieter provenance **Library**. Hubs are a
Problems discovery facet and secondary destination, not a global peer. Contributors,
Following, and Your work join that navigation only when their retained product
records are populated enough to make the pages useful.

- **Current State** answers what is currently known, what remains open, and which exact
  records support that view.
- **Workspace** answers what people and agents are trying now, and provides the
  bounded actions needed to contribute.

Repository is source context, not a prerequisite destination. Assertions,
Targets, Proposed changes, Checks, Decisions, Research Briefs, Sources, roots,
and graphs remain inspectable inside Current State or through an advanced
records view. Exact protocol types remain visible in provenance. They do not compete with
Problems in primary navigation.

The domains and the two storage planes are architecture. They must not become
parallel products or conceptual models that users have to learn. Editorial
explains Vela, Home orients the live network, Problems is the conceptual
center, Records is the advanced inspector, and local Vela is the authority
handoff.

## The protocol record model

The protocol objects remain the exact vocabulary of scientific records. Public
labels orient a reader; advanced provenance names the exact type and durable
URL. This is a presentation mapping, not a new protocol ontology.

| Protocol object | Product word | Lives at |
| --- | --- | --- |
| Repository `vfr_` | **Repository** | global list, and the container for everything below |
| Claim Record `vcl_` | **Assertion** | inside a Repository |
| source-native problem | **Problem** | inside a Repository, where the source has them |
| Target, and the Offer that ranks it | **Target** | inside a Repository; a release roll-up exists |
| Submission `vsb_` | **Published contribution** | inside a Proposed change and in an Assertion's lineage |
| Proposal `vpr_` | **Proposed change** | inside a Repository; a release roll-up exists |
| Verification Record `vvr_` | **Check** | inside a Proposed change |
| Decision, admitted as Event `vev_` | **Decision** | release-wide |
| — (exact rooted Result Dossier) | **Research Brief** | inside a Repository; a release roll-up exists |
| — (release-scoped registry) | **Source** | release-wide |

Two entries have no protocol object behind them, and the product says so. A
Result Dossier is the exact rooted read projection behind a Research Brief and
has no authority effect. Sources is a
release-scoped registry, sanctioned as a navigation grouping and nothing more. A
grouping never implies authority.

### Vocabulary

Public scientific-state vocabulary: Problem, Current State, Research Brief,
Target, Decision, Repository, Source. Public contribution vocabulary: Workspace
and Research Block. Exact provenance vocabulary: Claim, Submission, Proposal,
Verification Record, Event, Result Dossier, root, and format.

The Observatory does not use Work, Activity, Run, or Attempt as scientific
objects. Problems may use Work, Activity, and Attempt for hosted records in the
non-authoritative plane. Finding remains a retained protocol value and a
view-only upstream term; the interface calls the record a Claim. Bundle is a
protocol root and appears only as a labelled exact value. The release-level
`/runs` path remains a permanent redirect to `/decisions` for the retired
Observatory route.

The protocol's own banned wording holds here: never "landed finding", "verified
truth", "accepted by verifier", "AI approved", or an unqualified "verified",
"valid", "approved", or "complete".

### Activity vocabulary

Problems uses product records that carry no Vela authority: Account, Workspace,
Membership, Follow, Approach, Attempt, Comment, Note, Assignment, Reproduction
Request, Artifact, and Submission Draft. The product may present a rooted
Artifact contribution as a Research Block while preserving Artifact as the
exact activity record type. An Attempt may carry a provider-neutral
external session reference. Each activity record
binds the exact Repository, Problem, Claim where present, and projection roots
the user saw. The interface marks the record stale after those canonical roots
advance.

An Account is a WorkOS-hosted identity. A Vela actor identity belongs to a
signed protocol object and remains separate. A Submission Draft must contain an
explicit public Vela signer identity before export; the hosted account does not
supply one.

## Surfaces

### `www.vela.space`

The editorial gateway explains why Vela exists and publishes the current
authored work. It is a statically exported Next.js application with four
content routes — the landing page, the `Endless Repositories` essay at
`/constellations`, and the documentation at `/docs` and `/docs/[section]` — plus
a not-found page and a sitemap.

Documentation is not written here. It is the upstream Vela markdown vendored at
an exact pinned release and rendered without paraphrase; only the duplicate
title heading is dropped, because the route already sets it. A reader compares
the product's explanation against the protocol's own words.

### `app.vela.space` and `problems.science`

These domains serve one Vela product application. Home is its front door and
Problems is its conceptual center.
The same application preserves durable record routes, search, graph,
reproduction, and release-wide ledgers as an advanced Records layer. Protocol
collections do not compete with Problems in primary navigation.

The four release-wide roll-ups sit under a heading naming their scope. They were
left out of the rail for a while after the Repository tab bar was removed, on the
reasoning that the three shared names had been the ambiguity; but the routes
stayed, so a reader on one of them saw no rail entry for the page they were
reading. The ambiguity was the two scopes being on screen together, which the
contextual rail already prevents.

Alongside the human surfaces it serves declared read endpoints: the deployment
manifest, the source registry, the search and graph read contracts, and one JSON
export per published Dossier. They are the read contract, not an API. Beside
them sit three isolated product-identity handlers, for sign-in, the provider
callback, and the same-origin account session, each named in the scientific-authority
boundary gate. No other route handler may be added.

The Observatory exposes scientific state; it does not control it. Accepted,
pending, rejected, withdrawn, replayed, verified, recorded, and strict-blocked
remain distinct in language and presentation.

Each Problem page has two explicit modes:

- **State** reads the same exact Repository and projection facts as the
  Observatory.
- **Work** requires a hosted account and writes activity through
  `@vela/activity-data`.

Work mode supports workspace membership, follows, approaches and forks,
attempt lifecycle, comments and notes, assignments and reproduction requests,
rooted external artifact metadata, provider-neutral external session references on Attempts, and
portable Submission drafts. Idempotency keys make retries safe. Version fields
make concurrent edits fail with an explicit conflict.

Problems stores no artifact bytes, Vela Event, Verification Record, Decision,
or Standing. It has no repository authority credential. Draft export validates
the full `vela.submission.v2` payload against the pinned public schema, then
hands the canonical unsigned bytes to a local signer. Hosted code never imports
that signing helper.

### Local Vela and Repository authority

The authority crossing occurs on a user's machine or another explicit
institutional signing boundary. A signed Submission may enter a Repository as a
Proposal. Verification records scoped evidence. An authorized human Decision
changes Standing, and replay derives the successor state. Deleting the hosted
activity database cannot remove or change that state.

### Navigation

The global sidebar follows user intent: Home, Problems, Work, and Activity,
with Repositories and Sources visually subordinated as Library. Hubs live in
Problems discovery. A Problem page replaces that global list with contextual
Current State and Workspace navigation plus links
to its exact records. Account controls and search are tools, not destinations.
Advanced record collections do not become global peers of Problems.

Records keeps one contextual record-navigation system for expert use.
Outside a Repository it may expose release-wide ledgers; inside one it becomes
that Repository's records. Those routes remain durable, but the public product
does not ask a reader to traverse them before understanding or working on a
Problem.

## Shared system

The two applications are independently deployable surfaces of one product:

- `@vela/brand` supplies framework-neutral identity, tokens, type roles, fonts,
  and marks;
- `@vela/ui` supplies shared React primitives and stable Vela presentation
  semantics;
- `@vela/observatory-data` supplies exact generated facts and projections;
- `@vela/activity-data` owns hosted mutable product records, activity
  migrations, tenant authorization, and unsigned Submission drafts.

Applications share foundations, not whole page implementations. Editorial
compositions remain in `apps/www`; Problem State, Work, record inspection,
search, and graph compositions live together in `apps/observatory`.

The Vela design system is private and product-bound. `packages/ui` is source
shared by this workspace and future private Vela applications, consumed through
package exports. There is no registry to publish and no separate release.

## Audience and tone

Primary users are technically literate researchers, producers, reviewers, and
readers who need dense state without needless ceremony.

The product is restrained, lucid, trustworthy, concrete before abstract, and
exact without being overwhelming.

One page answers one primary question and exposes one obvious next inspection.
Exact roots stay close, usually one disclosure away, without dominating
orientation. A sentence that explains what an object is belongs in the
documentation, not above every page that lists them.

## Non-negotiable boundaries

- Canonical repository Git repositories remain the scientific source of truth.
- `vela_observatory` is a disposable, rebuildable, SELECT-only Neon projection.
  The Observatory reader role cannot write it.
- `vela_activity` is a separate mutable database. `@vela/activity-data` owns
  its schema and application writes. Its roles cannot write the Observatory or
  read authority credentials.
- Hosted code has no repository authority key or server signer. The local-only
  signer reads a user-named key file and never enters an application bundle.
- A signed-in account may own hosted activity. It is not a Vela actor identity,
  carries no repository authority, and cannot issue a Decision or write
  Standing.
- The profile boundary is executable: www stays static; the Vela application
  reads exact scientific State; Work mutations cross `@vela/activity-data`.
- Verification, replay, proposal standing, and scientific acceptance are
  different facts, and no surface may collapse two of them.
- Search order, graph position, model output, and verifier success never imply
  authority.
- No second repository parser, projection builder, search index, source registry,
  or deployment-manifest implementation may appear outside `@vela/observatory-data`.
- No second mutable store or product mutation implementation may appear outside
  `@vela/activity-data`.
- Removing activity leaves Standing intact. Rebuilding the Observatory leaves
  activity intact.
- Release identity and visible counts derive from checked artefacts rather than
  copied strings.

## Product rules

- The Vela sail is the Home affordance on both surfaces. In the Observatory it
  is the mark alone, sized to the sidebar's icon column, with no wordmark.
- Editorial navigation stays small. The application leads with Problems and
  keeps advanced record navigation secondary. Current State and Workspace remain explicit
  modes of the same Problem.
- A page picks one archetype: a collection gets to its rows, a record opens with
  the record, a Repository opens as a repository whose most prominent action is
  getting the record, an instrument opens with its toolbar and canvas.
- Use progressive disclosure for exact metadata; do not remove it.
- Use open sections, tables, and item groups before card grids. The Observatory
  imports no Card primitive; the Dossier collections are the one hand-authored
  grid, because a Dossier is a document a reader picks rather than a row they
  scan.
- Preserve durable URLs and URL-backed product state. A retired path keeps a
  permanent redirect, and the route contract pins where it points. Three
  editorial redirects name essays that have not yet returned; the contract holds
  the destination so those URLs resolve the moment they do.
- Navigation and loading preserve the application shell rather than replacing
  the document.
- Product guidance links normative details to the exact Vela release rather than
  maintaining a second protocol.

## Release and budgets

There is one version, in the root manifest, pre-1.0. No package carries its own,
and no package is publishable. Deployment identity is the exact commit and
deployment id the platform supplies, never a hand-set variable and never a tag
inferred from a version string. Pushing to `main` ships; a tag is worth cutting
when a release means something, and is not a precondition for one.

Sizes are measured and reported, never enforced as a ceiling, with one
exception: authored Observatory global and theme CSS is capped at 180 lines,
because unbounded route CSS in a global stylesheet is the regression that gate
exists to catch. What else fails a build is a category error: a heavy runtime
entering an initial chunk, a browser file embedding the projection, per-record
routes going static, a surface losing its prerender, a font profile gaining a
face.

## Anti-patterns

- Marketing chrome inside the Observatory
- Dashboard framing for reading or record inspection
- Over-explained UI and repeated authority disclaimers
- Duplicated navigation, route framing, metadata, or release facts
- A heading that repeats what the header trail just said
- Decorative science, space, or constellation imagery anywhere a reader could
  mistake it for evidence
- A public design-system product or component catalogue
- Hosted activity presented as Verification, Decision, Standing, or repository
  authority

## Related contracts

[`DESIGN.md`](DESIGN.md) defines the shared visual and interaction system.
[`docs/design-system.md`](docs/design-system.md) records the package and
primitive workflow; [`docs/WEB.md`](docs/WEB.md) records operations.
