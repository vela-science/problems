# Vela design system architecture

Status: current private-workspace contract.

Vela has one design system with two application profiles. The system exists to
make evidence and direction legible; it is not a separately published product.

## Package boundaries

| Layer | Canonical source | Consumers |
| --- | --- | --- |
| Brand | `packages/brand` | All Vela surfaces and exported assets |
| React primitives and semantics | `packages/ui` | Observatory, eligible www interactions, future private React applications |
| Editorial profile | `apps/www` | Home, publications, and exact release documentation |
| Product profile | `packages/ui/src/styles/product.css` | Observatory and future private product surfaces |
| Exact data | `packages/frontier-data` | Both applications |

`@vela/brand` is framework-neutral. It owns the DTCG-shaped token source,
delivered fonts, canonical sail, mark exports, licenses, and integrity checks.

`@vela/ui` is React source, not a runtime service. It owns official
shadcn/Base UI primitives and the small set of stable Vela presentation
semantics. Application shells and route compositions remain app-local.

Both public applications currently use Next.js 16 and React 19. That shared
runtime makes a common primitive source useful; it does not justify merging the
editorial and workbench composition systems.

## shadcn and Base UI

`packages/ui/components.json` is the only upstream primitive-generation
configuration. It fixes:

- shadcn `base-nova`;
- Base UI;
- Tailwind CSS v4 semantic variables;
- Hugeicons;
- package-local aliases;
- React Server Component-compatible source.

Run the shadcn CLI from `packages/ui`, never from an application:

```bash
cd packages/ui
bunx shadcn@4.13.1 add <component>
bunx shadcn@4.13.1 diff
```

Review generated source before accepting it. A registry update may change
markup, state attributes, dependencies, or focus behavior. Keep the source
close to upstream; put Vela semantics in composition rather than forking a
generic primitive.

`apps/observatory/components.json` is a consumer map. It points UI and utility
aliases at `@vela/ui`; it is not a second installation destination. `apps/www`
adopts shared primitives when a generic interaction is migrated, while
authored editorial elements remain local.

Base UI supplies primitive mechanics. Vela still owns names, descriptions,
contrast, focus visibility, touch targets, route behavior, and end-to-end
accessibility.

## Internal registry

`packages/ui/registry.json` is a private, product-bound source inventory for
this monorepo and future private Vela applications. It indexes the same files
exported by `@vela/ui`; it has no installer or distribution endpoint.

It is:

- versioned with `vela-web`;
- checked for schema, source, and dependency drift;
- used to reproduce a consistent Vela application foundation;
- available only to the licensed Vela workspace/team.

It is not:

- a public registry endpoint;
- a separately published package or UI library;
- a second implementation;
- a catalogue of speculative components;
- an invitation for external consumers to depend on private source.

The current shared Vela semantics are status, exact value and copy feedback,
and bounded mathematical text. Add another item only when it:

1. already serves a real Vela product;
2. expresses a stable cross-application semantic or composition;
3. composes official primitives instead of replacing them;
4. carries tests, accessibility states, and source provenance;
5. can be maintained on the workspace release path.

Route-specific tables, filters, shells, graph controls, and publication
layouts remain app-local until reuse is demonstrated.

## Tailwind Plus

The owner has a Tailwind Plus license and the repository is private. Licensed
components may be copied and modified to build Vela end products, including
private app-local source and private product-bound registry coordination.

The license does not turn Tailwind Plus derivatives into a separately
redistributable UI library. Therefore:

- source access stays within the licensed person or team;
- a licensed derivative is never exposed through a public registry or
  published separately from the Vela end product;
- every adaptation records its source template and the changes made;
- app-local use is the default;
- promotion to the internal registry requires real reuse and remains tied to
  this private Vela product;
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

- Zodiak for display
- Gambetta for reading
- Switzer for navigation and metadata
- IBM Plex Mono for exact values
- paper and midnight surfaces
- spacious, asymmetric composition
- figures as arguments

Tailwind Plus editorial and documentation compositions may remain local to
`apps/www` with provenance. Generic controls should converge on `@vela/ui`
when doing so reduces code and preserves the editorial register.

### Observatory

- Geist for interface text
- IBM Plex Mono for identifiers and exact values
- neutral light-first surfaces with equivalent dark mode
- tables, Item groups, Sheets, and disclosures before card grids
- stable inset workbench shell
- exact status expressed through label, shape or icon, and color

The Sigma graph is an application-owned instrument because its rendering and
data contracts are domain-specific. It must include an equivalent record view.

## Icons, marks, and imagery

- The canonical sail comes from `@vela/brand`; do not redraw it in component
  code.
- Hugeicons is the shared interface icon system. Add a Vela-owned icon only
  when no generic icon can express a scientific state without ambiguity.
- A sail or route line communicates direction.
- A constellation line connects real records.
- A star or node represents a real object.
- Decorative stars, random orbital lines, generic planets, and atmospheric
  space backgrounds are not part of the system.

## Verification

```bash
bun run check:brand
bun run check:registry
bun run check:design-system
bun run check:tokens
bun run typecheck
bun run test
git diff --check
```

The design-system check must fail on primitive registry drift, app-local
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
