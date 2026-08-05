---
register: product
---

# Vela Web product contract

Vela Web helps people understand and reuse exact scientific state. It is a
reader, not an authority.

## Product story

The protocol's own loop is `map → target → work → submit → verify → decide →
remap`. Vela's shorter compression of it is:

```text
MAP → ADVANCE → REMAP
```

A reader maps the territory: exact state, dependencies, disagreement, and gaps.
Advancing it is the span this product does not perform. A research tool produces
candidate work, a canonical frontier Git repository preserves it, Vela verifies
and replays it, and repository authority records a human Decision. The resulting
root remaps the territory, and Vela Web is what makes that new map searchable,
inspectable, and reproducible.

Every feature in this repository serves explanation, inspection, comparison, or
reproduction. Nothing here becomes a producer, canonical store, verifier,
signer, or decision-maker.

## The object model

The product's nouns are the protocol's objects. This table is the spine:
navigation, headings, and URLs all follow it.

| Protocol object | Product word | Lives at |
| --- | --- | --- |
| Frontier `vfr_` | **Frontier** | global list, and the container for everything below |
| Claim Record `vcl_` | **Claim** | inside a Frontier |
| source-native problem | **Problem** | inside a Frontier, where the source has them |
| Target, and the Offer that ranks it | **Target** | inside a Frontier; a release roll-up exists |
| Submission `vsb_` | **Submission** | inside a Proposal, and in a Claim's lineage |
| Proposal `vpr_` | **Proposal** | inside a Frontier; a release roll-up exists |
| Verification Record `vvr_` | **Verification Record** | inside a Proposal |
| Decision, admitted as Event `vev_` | **Decision** | release-wide |
| workbench Attempt | **Attempt** | inside Targets |
| — (exact rooted case record) | **Dossier** | inside a Frontier; a release roll-up exists |
| — (release-scoped registry) | **Source** | release-wide |

Two entries have no protocol object behind them, and the product says so. A
Dossier is an exact rooted read projection with no authority. Sources is a
release-scoped registry, sanctioned as a navigation grouping and nothing more. A
grouping never implies authority.

An Attempt is an execution occurrence the protocol does not create or govern.
The product records the workbench's own handle for it and no more.

### Vocabulary

Current: Frontier, Claim, Problem, Target, Attempt, Submission, Proposal,
Verification Record, Decision, Dossier, Source.

Retired: Finding, Work, Review, Activity, Run, Bundle. Finding survives only as
a protocol graph kind mapped to Claim on read, and inside retained `vf_`
identifiers, which appear as exact values and never as a product word. Run is
gone from interface text; the `/runs/` URL segment stays, because a published
URL never stops resolving. Work, Review, and Activity are
activities, and a reader cannot link to an activity, only to the record it acts
on. Bundle is a protocol root and appears only as a labelled
exact value.

The protocol's own banned wording holds here: never "landed finding", "verified
truth", "accepted by verifier", "AI approved", or an unqualified "verified",
"valid", "approved", or "complete".

## Surfaces

### `www.vela.space`

The editorial gateway explains why Vela exists and publishes the current
authored work. It is a statically exported Next.js application with four
content routes — the landing page, the `Endless Frontiers` essay at
`/constellations`, and the documentation at `/docs` and `/docs/[section]` — plus
a not-found page and a sitemap.

Documentation is not written here. It is the upstream Vela markdown vendored at
an exact pinned release and rendered without paraphrase; only the duplicate
title heading is dropped, because the route already sets it. A reader compares
the product's explanation against the protocol's own words.

### `app.vela.space`

The Observatory is the read-only workbench over an exact, release-bound
projection. Its destinations are Frontiers, Decisions, and Sources; inside a
Frontier it opens Overview, Claims, Problems where the source has them, Targets,
Proposals, Dossiers, and Reproduce, with search and the evidence graph reachable
as tools rather than as places.

Alongside the human surfaces it serves declared read endpoints: the deployment
manifest, the source registry, the search and graph read contracts, and one JSON
export per published Dossier. They are the read contract, not an API. Beside
them sit three isolated product-identity handlers, for sign-in, the provider
callback, and the same-origin account session, each named in the read-only
boundary gate. No other route handler may be added.

The Observatory exposes scientific state; it does not control it. Accepted,
pending, rejected, withdrawn, replayed, verified, recorded, and strict-blocked
remain distinct in language and presentation.

### Navigation

One navigation system, one scope on screen. The sidebar is contextual: outside a
Frontier it lists what is genuinely release-wide, and inside one it becomes that
Frontier's own sections, grouped under the protocol's axes. The header carries
one trail whose last element is the current page; inside a Frontier its first
element is the Frontier switcher, a control rather than a link. No label means
two scopes at once.

A noun appears at both release and Frontier level only when a reader with no
Frontier in mind can act on it. When it does, the release view is a roll-up with
its own component and its own default set, as Proposals is: an accordion across
the release, a table inside a Frontier. Targets and Dossiers still render the
Frontier's component at both scopes, which is a defect rather than a precedent.

## Shared system

The two applications are independently deployed surfaces of one product:

- `@vela/brand` supplies framework-neutral identity, tokens, type roles, fonts,
  and marks;
- `@vela/ui` supplies shared React primitives and stable Vela presentation
  semantics;
- `@vela/frontier-data` supplies exact generated facts and projections.

Applications share foundations, not whole page implementations. Editorial
compositions remain in `apps/www`; product shells, domain surfaces, and graph
controllers remain in `apps/observatory`.

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

- Canonical frontier Git repositories remain the scientific source of truth.
- Neon is a disposable, rebuildable, SELECT-only read projection for the public
  application. The reader role's lack of write privilege is asserted against the
  live database, not assumed.
- The web has no signer, authority key path, public mutation API, or private
  coordination payload. The read-only boundary is executable and scans both
  applications' source.
- A signed-in account personalises the product only. It is not a Vela actor
  identity, carries no repository authority, and cannot sign a Submission, issue
  a Decision, or reach an authority key. Every route that shows scientific
  state, every JSON twin, and every read endpoint is available without signing
  in; only the account page itself requires a session.
- Verification, replay, proposal standing, and scientific acceptance are
  different facts, and no surface may collapse two of them.
- Search order, graph position, model output, and verifier success never imply
  authority.
- No second frontier parser, projection builder, search index, source registry,
  or deployment-manifest implementation may appear outside `@vela/frontier-data`.
- Release identity and visible counts derive from checked artefacts rather than
  copied strings.

## Product rules

- The Vela sail is the Home affordance on both surfaces. In the Observatory it
  is the mark alone, sized to the sidebar's icon column, with no wordmark.
- Editorial navigation stays small. Application navigation names records, never
  activities.
- A page picks one archetype: a collection gets to its rows, a record opens with
  the record, a Frontier opens as a repository whose most prominent action is
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
- A writable web service presented as Vela

## Related contracts

[`DESIGN.md`](DESIGN.md) defines the shared visual and interaction system.
[`docs/design-system.md`](docs/design-system.md) records the package and
primitive workflow; [`docs/WEB.md`](docs/WEB.md) records operations.
