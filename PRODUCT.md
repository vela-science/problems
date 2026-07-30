---
register: product
---

# Vela Web product contract

Vela Web helps people understand and reuse exact scientific state. It is a
reader, not an authority.

## Product story

Vela follows one path:

```text
produce → preserve → check → decide → reuse
```

A research tool produces candidate work. A canonical frontier Git repository
preserves it. Vela checks and replays it. Repository authority records a human
Decision. Vela Web supports reuse by making the resulting state searchable,
inspectable, and reproducible.

Every feature in this repository serves explanation, inspection, comparison,
or reproduction. Nothing here becomes a producer, canonical store, verifier,
signer, or decision-maker.

## Surfaces

### `www.vela.space`

The editorial gateway explains why Vela exists and publishes the current
authored work. It is a statically exported Next.js application.

The primary public path is:

```text
Home → Constellations → Observatory
```

Product documentation lives on `www` and is generated from the exact released
Vela documentation. Durable historical routes may remain, but they do not
compete with the primary path.

### `app.vela.space`

The Observatory is the read-only workbench for frontiers, sources, Claims,
Submissions, Verification Records, Decisions, work, runs, graph relationships,
search, and reproduction. It is a Next.js application over an exact,
release-bound projection.

The Observatory exposes scientific state; it does not control it. Accepted,
pending, rejected, withdrawn, replayed, verified, recorded, and strict-blocked
remain distinct in language and presentation.

## Shared system

The two applications are independently deployed surfaces of one product:

- `@vela/brand` supplies framework-neutral identity, tokens, fonts, and marks;
- `@vela/ui` supplies shared React primitives and stable Vela presentation
  semantics;
- `@vela/frontier-data` supplies exact generated facts and projections.

Applications share foundations, not whole page implementations. Editorial
compositions remain in `apps/www`; product shells, domain tables, and graph
controllers remain in `apps/observatory`.

The Vela design system is private and product-bound. Its internal registry
coordinates source for this workspace and future private Vela applications; it
is not a public component service or separate release.

## Audience and tone

Primary users are technically literate researchers, producers, reviewers, and
readers who need dense state without needless ceremony.

The product is:

- restrained;
- lucid;
- trustworthy;
- concrete before abstract;
- exact without being overwhelming.

One page should answer one primary question and expose one obvious next
inspection. Exact roots stay close, usually one disclosure away, without
dominating orientation.

## Non-negotiable boundaries

- Canonical frontier Git repositories remain the scientific source of truth.
- Neon is a disposable, rebuildable, SELECT-only read projection for the
  public application.
- The web has no signer, authority key path, Server Action, public mutation
  API, or private coordination payload.
- Verification, replay, proposal standing, and scientific acceptance are
  different facts.
- Search order, graph position, model output, and verifier success never imply
  authority.
- No second frontier parser, bundle generator, search index, source registry,
  or deployment-manifest implementation may appear outside
  `@vela/frontier-data`.
- Release identity and visible counts derive from checked artifacts rather
  than copied strings.

## Product rules

- The Vela sail is the Home affordance on `www` and the product identity in the
  Observatory.
- Editorial navigation stays small. Application navigation contains workbench
  tasks, not essays or marketing.
- Use progressive disclosure for exact metadata; do not remove it.
- Use open editorial sections, tables, and item groups before generic card
  grids.
- Preserve durable URLs and URL-backed product state.
- Navigation and loading preserve the application shell rather than replacing
  the document.
- Product guidance links normative details to the exact Vela release rather
  than maintaining a second protocol.

## Anti-patterns

- Marketing chrome inside the Observatory
- Dashboard framing for reading or record inspection
- Over-explained UI and repeated authority disclaimers
- Duplicated navigation, route framing, metadata, or release facts
- Decorative science, space, or constellation imagery without information
- A public design-system product or component catalogue
- A writable web service presented as Vela
