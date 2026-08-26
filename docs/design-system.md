# Vela design system architecture

Status: current private-workspace contract.

Vela has one design system with three application profiles. The system exists to
make evidence and direction legible; it is not a separately published product.

## Package boundaries

| Layer | Canonical source | Consumers |
| --- | --- | --- |
| Brand | `packages/brand` | All Vela surfaces and exported assets |
| React primitives and semantics | `packages/ui` | Problems, and future Vela React applications |
| Product profile | `packages/ui/src/styles/product.css` | Problems and future Vela product surfaces |
| Exact data | `packages/projection-data` | Problems State mode and the machine read routes |
| Activity data | `packages/activity-data` | Problems Work mode; no visual primitives |

`@vela/brand` is framework-neutral. It owns the DTCG-shaped token source,
delivered fonts, canonical sail, mark exports, licenses, and integrity checks.

`@vela/ui` is React source, not a runtime service. It owns official
shadcn/Base UI primitives and the small set of stable Vela presentation
semantics. Application shells and route compositions remain app-local.

Problems uses Next.js 16 and React 19. Shared workspace packages make a common
primitive source useful; retained editorial source is not a runtime consumer.

## shadcn and Base UI

`packages/ui/components.json` is the only upstream primitive-generation and
installation configuration. The matching application maps are consumer
configuration for local AI/CLI context, not additional source destinations.
Together they fix:

- shadcn `base-nova`;
- Base UI;
- Tailwind CSS v4 semantic variables;
- Hugeicons;
- package-local aliases;
- React Server Component-compatible source.

Run the shadcn CLI from `packages/ui`, never from an application:

```bash
cd packages/ui
shadcn add <component>
shadcn diff
```

The workspace pins shadcn `4.16.1`; scripts always resolve that installed
binary. `bunx shadcn@…` is deliberately excluded because it fetched a second
version beside the reviewed one. `bun run check:design-system` runs `shadcn
info --json` in `packages/ui` and `apps/problems`, then requires
the same Base UI base, `base-nova`, Hugeicons, Tailwind v4, and shared UI target.

Review generated source before accepting it. A registry update may change
markup, state attributes, dependencies, or focus behavior. Keep the source
close to upstream; put Vela semantics in composition rather than forking a
generic primitive.

`apps/problems/components.json` is the application consumer map. It points UI
and utility aliases at `@vela/ui`; Problems consumes package exports and does
not create an app-local primitive directory.

### The private source catalog is not part of this repository

`packages/ui/registry.json` and `packages/ui/lab/` were a private source
catalog: per-item owner, stability, primitive base, upstream origin and
version, license, local modifications, accessibility and review status, plus
agent-readable scenarios across theme, viewport, motion, and direction. A
`check:registry` gate built the catalogue twice, required byte-stable output,
refused registry provenance markers in delivered bytes, and required every
local source import to appear in the registry build closure.

None of it is here. A catalogue *of components* is the one artefact both the
Tailwind Plus and shadcn.io Pro licenses name outright, so it stays in the
private repository rather than being published alongside the application that
uses the components. The cost is real and worth stating: this repository has no
automatic check that every local `@vela/ui` import is in a reviewed build
closure. `bun run check:design-system` still verifies the shadcn/Base UI
foundation, the shared token and typeset contracts, and the absence of a
parallel app-local primitive layer.

Licensed shadcn.io Pro and Tailwind Plus source may inform Vela end products.
Every place that studied one records the exact item, retrieval version,
license, semantic limits, and changes, in a source comment and in
`docs/editorial-references.md`. That record is what keeps the licence honest;
it is not an admission that markup was copied, and it stays in the public
source for the same reason. This does not grant redistribution rights. The
adaptations replace Lucide/framer-motion with Hugeicons and the existing
`motion/react` contract.

Base UI supplies primitive mechanics. Vela still owns names, descriptions,
contrast, focus visibility, touch targets, route behavior, and end-to-end
accessibility.

### shadcn.io Pro source review, 2026-08-11

The following decisions were made from the full registry source, not preview
metadata. “Adapt” means the useful composition was rewritten around real Vela
data, Base UI, Hugeicons, product tokens, and the 150–220ms/reduced-motion
contract. It does not mean the original block was installed.

| Source items reviewed | Decision | Vela use or reason |
| --- | --- | --- |
| `dashboard-activity-feed`, `timeline-filterable`, `timeline-commit-log` | Adapt locally | `ScientificChangeFeed` uses the rail, type filters, and commit identity while separating scientific transitions from ordinary commits. |
| `features-radial-hub-satellite-graph` | Adapt locally | `HubMembershipMap` binds every edge to projected membership, removes orbit choreography and fake integrations, and supplies a linear mobile list. |
| `search-global`, `command-menu-workspace` | Adapt existing search only | Keep the grouped keyboard vocabulary, `Kbd`, and empty-result state; reuse Vela’s FlexSearch/Command owner rather than add static results or a second command primitive. |
| `empty-state-getting-started` | Adapt selectively | Use its focused heading/body/action hierarchy for authentic empty Work states; reject progress theatre where no rooted completion model exists. |
| `hero-centered-crosshatch-bg`, `topography` | Crosshatch adapted; canvas rejected | A faint token-backed field may distinguish the product opening. The animated topography canvas adds decoration, CPU work, and false scientific texture without information. |
| `ai-message-with-artifacts`, `ai-code-editor` | Pattern reference only | Their artifact/editor split and bounded panes inform Work mode. Chat chrome, reasoning logs, code theatre, synthetic diagnostics, and invented agent status are excluded. |
| `gallery-data-visualization`, `changelog-dependency-graph` | Reject for current data | Placeholder charts, trend colours, dependency health, and generic metric cards would invent meaning. Vela keeps its exact repository graph and real tabular alternatives. |
| `navbar-documentation`, `sidebar-documentation-tree`, `changelog-documentation-updates` | Consolidate rather than copy | Shared Search, Sheet, navigation, Typeset, and exact upstream provenance cover the useful behavior without a second docs shell. |
| `profile-scientist-research`, `sidebar-data-science` | Reject | Generic scientist profiles and “ML Studio” navigation model people and tooling, not the Problem/State/Work/Hub structure Vela actually owns. |

A second full-source comparison covered the wider Pro catalog before this
tranche was frozen:

- `command-menu-global-search` and `search-global` confirmed the existing
  Problems palette architecture: it groups real Problems, State/Work,
  Hubs, Sources, repositories, exact projected records, and the canonical docs
  destination. The existing projection search remains the sole owner; no
  static result corpus or second command primitive was added.
- `features-magazine-editorial-layout` confirmed www's numbered editorial
  bands and argument-led figures; `hero-centered-crosshatch-bg` contributed
  only the restrained token-backed product field. Vela retained its authored
  paintings rather than copying template media.
- `features-book-chapter-toc`, `navbar-documentation`, and
  `sidebar-documentation-tree` confirmed the current exact contents tree,
  shared Search/Sheet controls, and Typeset reader. Copying a parallel docs
  shell was rejected.
- `features-indexed-sidebar-detail-view` informed the Problems directory's
  field/source/Standing/Work filter grammar and detail links. A static featured
  index was removed in favor of projection-backed discovery.
- `artifact`, `ai-message-with-artifacts`, and `ai-code-editor` contributed the
  bounded `RootedArtifactFrame`: exact roots and custody metadata only. There
  is no generated preview, diff theater, Apply action, or reasoning trace.
- timeline approval, agent task queue, branch/source theater, trend charts,
  Sankey, ink canvas, fake empty activity, and subscription patterns remain
  explicit rejects because current retained data cannot make them truthful.

The resulting page archetypes intentionally differ: Home is an orienting field
and live network read; Problems is a search/filter directory; Problem State is
an exact evidence document; Work is an activity workspace; Hubs are membership
maps; Activity is a typed timeline; www remains an editorial publication and
documentation reader. They share tokens and mechanics, not a dashboard mold.

## Shared source boundary

`@vela/ui` package exports are the shared API. The current shared Vela
semantics are status, exact value and copy feedback, and bounded mathematical
text. Add another export only when it:

1. already serves a real Vela product;
2. expresses a stable cross-application semantic or composition;
3. composes official primitives instead of replacing them;
4. carries tests, accessibility states, and source provenance;
5. can be maintained on the workspace release path.

Route-specific tables, filters, shells, graph controls, and publication
layouts remain app-local until reuse is demonstrated.

## Tailwind Plus and shadcn.io Pro

The owner holds Tailwind Plus and shadcn.io Pro licenses. Both permit building
an end product from licensed components, and both permit that end product to be
open source with public source, so long as redistributing the components is
clearly not what the product is for. Problems is a scientific workspace, so it
qualifies, and this repository is public on that basis.

Neither license turns a derivative into a separately redistributable UI
library. Therefore:

- a derivative is never exposed through a public registry, published to a
  package registry, or shipped separately from the Vela end product;
- every adaptation records its source template and the changes made;
- app-local use is the default;
- promotion to `@vela/ui` requires real reuse and remains tied to
  this Vela product; `@vela/ui` is application source, never a package;
- interaction should converge on shadcn/Base UI rather than retaining a
  parallel Headless UI, Heroicons, or Motion layer without a demonstrated need.

Tailwind Plus is a source of strong compositions, not a second design system.
Preserve useful information architecture, spacing, responsive behavior, and
states; replace template branding, palette, and generic SaaS content with Vela
tokens and real rooted data.

## Tailwind and global CSS

Tailwind v4 consumes generated variables rather than duplicating token values.

### Shared product profile

`packages/ui/src/styles/product.css` owns:

- the shadcn semantic color bridge;
- light and dark product variables;
- radius and type utility mappings;
- cross-application product status variables.

The product bridge and imported `theme.css` share one aggregate 180-line cap.
Route framing and the Work corridor live in their canonical component CSS
modules rather than accumulating in that global budget. High contrast is an
orthogonal `data-contrast="high"` reader preference across both light and dark
grounds; it never changes scientific meaning.

`packages/ui/src/styles/foundation.css` owns focus, selection, forced-colour,
and reduced-motion behavior. `packages/ui/src/styles/typeset.css` adapts the
official shadcn Typeset contract into reading/docs and compact-product presets.
Typeset owns size, leading, and forward-flow rhythm; route layout owns measure.
Use `.not-typeset` for controls and `.typeset-scroll` around real wide tables.
It does not apply backward `last-child` fixes, so streamed content remains
stable.

### Application globals

An application `globals.css` may contain:

- Tailwind and package imports;
- the application profile bridge;
- base typography and document ground;
- accessibility and reduced-motion rules;
- print rules;
- requirements that genuinely affect every route.

It may not contain:

- route-specific layouts;
- one-off component selectors;
- copied brand values;
- a second status palette;
- overrides that depend on generated shadcn internals when a primitive variant
  or composition would work;
- template shims for components no longer used.

Prefer token-backed utilities and component variants. Use CSS modules or
component-local styles for scientific typography, figures, and Sigma canvas
requirements. Remove a global selector when its last consumer is removed.

## Application profiles

### Editorial

- system Iowan Old Style with Baskerville and Times New Roman fallbacks for display and reading
- Switzer for navigation and metadata
- IBM Plex Mono for exact values
- paper and midnight surfaces
- spacious, asymmetric composition
- figures as arguments

The retained landing composition follows a scientific-atlas story: a midnight
opening, paper reading sections, one exact source instrument, and a quiet
horizon close. It may use existing Vela paintings as atmosphere, but atmospheric
marks never appear inside evidence-bearing figures. Homepage sections and
publication compositions stay app-local CSS modules. Shared controls, focus,
tokens, motion limits, and type sources still come from `@vela/ui` and
`@vela/brand`.

The front page source is `apps/www/src`, with painting provenance beside the
plates. The essay it once carried was removed on 2026-08-21.
Problems selectively consumes reviewed paintings and current passages in its
brand register; the source does not become a second design system or runtime.

### Problems

- Geist for interface text
- IBM Plex Mono for identifiers and exact values
- neutral light-first surfaces with equivalent dark mode
- tables, Item groups, Sheets, and disclosures before card grids
- stable inset workbench shell
- exact status expressed through label, shape or icon, and color

The Sigma graph is an application-owned instrument because its rendering and
data contracts are domain-specific. It must include an equivalent record view.

### Problems

- the same Geist and IBM Plex Mono product typography as the Problems
- one explicit State or Work mode on each Problem page
- exact scientific state rendered with the Problems's labels and roots
- editable activity presented as a separate workbench layer
- stale-anchor, idempotent-retry, and version-conflict states in plain language
- tables, Item groups, fields, and disclosures before dashboard cards

State mode cannot contain mutation controls. Work mode may edit hosted activity
through `@vela/activity-data`; its controls never use scientific Standing,
Verification, or Decision styling. Submission export ends with an unsigned
local-signing handoff rather than a hosted success state.

## Icons, marks, and imagery

- The canonical sail comes from `@vela/brand`; do not redraw it in component
  code.
- Hugeicons is the shared interface icon system. Add a Vela-owned icon only
  when no generic icon can express a scientific state without ambiguity.
- A sail or route line communicates direction.
- A constellation line connects real records.
- A star or node represents a real object.
- Atmospheric marks may live inside retained authored paintings. Outside those
  paintings, nodes and lines appear only when they encode exact retained data.

## Verification

```bash
bun run check:brand
bun run check:design-system
bun run check:tokens
bun run typecheck
bun run test
git diff --check
```

The design-system check must fail on primitive source drift, app-local
primitive copies, raw palette use outside token sources, internal navigation
through `window.location`, and unsupported parallel UI packages.

Manual QA uses the Codex in-app Browser at the recorded mobile, tablet, and
desktop widths. Verify light and dark, keyboard-only use, reduced motion,
forced colors, 200% zoom, long exact values, empty states, and integrity
failures.

## Standards basis

- [shadcn `components.json`](https://ui.shadcn.com/docs/components-json)
- [shadcn monorepo guidance](https://ui.shadcn.com/docs/monorepo)
- [shadcn registry guidance](https://ui.shadcn.com/docs/registry/getting-started)
- [Base UI accessibility](https://base-ui.com/react/overview/accessibility)
- [Tailwind CSS theme variables](https://tailwindcss.com/docs/theme)
- [Design Tokens Community Group format](https://www.designtokens.org/tr/drafts/format/)
- [Tailwind Plus license](https://tailwindcss.com/plus/license)
