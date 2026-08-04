# Vela design system

Vela turns retained scientific state into legible direction. The design system
does the same: it makes evidence, standing, relationships, and next actions
clear without decorating uncertainty away.

The governing idea is **direction through evidence**.

- The sail represents movement from recorded state toward a bounded next
  direction.
- In a figure, a constellation represents real relationships among
  records. Every mark in a figure decodes to something a reader can
  check.
- Atmosphere is not a figure and is not held to that rule. An editorial
  surface may carry a drawn sky whose job is the register of the page —
  the opening of `/constellations` is one. It stays behind the type at
  hairline weights, carries no labels, claims no quantities, and does not
  print. A reader must never have to ask whether it is data. When in
  doubt, it is not atmosphere, it is a figure, and it decodes.
- Space is expressed through scale, quiet, contrast, and orientation, not
  neon, particles, glow, or generic science-fiction styling.
- Gold marks direction and provenance. It is not a general highlight color.

This document defines the shared system. It does not prescribe every page
composition.

## Architecture

| Layer | Source | Responsibility |
| --- | --- | --- |
| Brand | `packages/brand` | DTCG-shaped tokens, type roles, fonts, sail geometry, state colors, licenses, deterministic exports |
| React UI | `packages/ui` | Official shadcn `base-nova` primitives on Base UI and stable Vela presentation semantics |
| Editorial composition | `apps/www` | Authored publications, figures, product narrative, and documentation layouts |
| Product composition | `apps/observatory` | Read-only workbench shell, domain tables, URL state, and the Sigma graph |
| Exact data | `packages/frontier-data` | Rooted projections consumed by both applications |

`@vela/brand` is framework-neutral. `@vela/ui` is the shared React source for
both Next.js applications and future private Vela applications. Applications
share primitives and stable semantics; they do not share whole route layouts.

`packages/ui/components.json` is the only shadcn source configuration. Package
exports are the shared API; Vela does not maintain a second component catalog
or installable registry.

## Two registers

### Editorial

`www.vela.space` is the authored register: paper and midnight grounds,
Zodiak display, Gambetta body, Switzer metadata, and IBM Plex Mono for exact
values. Its rhythm is spacious and asymmetric. Figures carry arguments.

### Product

`app.vela.space` is the instrument register: neutral light-first surfaces,
Geist for interface text, IBM Plex Mono for identifiers and exact values,
compact controls, and dense but readable ledgers. Dark mode is equivalent, not
a separate aesthetic.

The registers share the sail, state semantics, token source, accessible
interaction, and exact data. They do not make the editorial site look like a
dashboard or the Observatory look like an essay.

## Token and style rules

- Edit core values in `packages/brand/vela.tokens.json`, then regenerate.
  Never copy brand values into prose documentation or route CSS.
- `packages/ui/src/styles/product.css` owns the shadcn semantic bridge and
  product theme profile.
- Each application `globals.css` is an integration layer: imports, Tailwind
  theme mapping, base typography, accessibility, print, and cross-route rules.
  Route-specific presentation belongs beside its component.
- Use semantic variables and utilities. Raw colors are reserved for token
  definitions and derived data visualizations with an explicit legend.
- Status always combines text with shape or icon and color. Verification must
  never resemble scientific acceptance.
- IBM Plex Mono is limited to roots, identifiers, commands, and exact tabular
  values.

## Components and compositions

Generic interaction comes from official shadcn/Base UI source in `@vela/ui`:
buttons, fields, dialogs, sheets, sidebar, command, selection, table,
disclosure, tooltip, focus, and keyboard behavior.

Vela-owned shared components are limited to stable scientific presentation
semantics such as status, exact values, copy feedback, and bounded mathematical
text. Shells, domain columns, source filters, graph controllers, reading rails,
and authored figures stay with the application that owns them.

Tailwind Plus is licensed for use in this private repository. Its application
and editorial patterns may be adapted where they improve a real surface.
Adaptations must retain provenance, use the shared token system, and converge
on shadcn/Base UI behavior instead of introducing Headless UI, Heroicons,
Motion, or a second component suite by accident. One-off adaptations remain
app-local; stable cross-app compositions may enter `@vela/ui`.

## Scientific visual language

Use one small vocabulary across diagrams:

- filled disc — a state reached;
- ring — a claim not yet judged;
- dashed ring — an open or absent state;
- gold stroke — the route carrying standing or direction forward;
- plain stroke — a recorded relationship;
- dashed stroke — a relationship not yet realized;
- seam or cross — conflict, never communicated by color alone.

Every mark must decode to a real record or relationship. Derive geometry and
counts from rooted data where possible. Graph location, visual weight, and
search rank never imply authority.

Figures maximize data-ink, annotate directly, and include a caption below the
visual. A complex visual must have a text or ledger equivalent.

## Layout, motion, and accessibility

- Editorial prose stays within a readable measure; wide figures break out from
  the reading axis, not blindly from the viewport.
- Product pages use open tables and item groups before card grids. Cards are
  for independently selectable records or overlays and are never nested.
- Observatory breadcrumbs live only in the shared app header and contain
  ancestors, never the current page. Every route body owns exactly one
  descriptive `h1`; it does not repeat a breadcrumb or add a second back link.
- UI feedback lasts 120–180ms. Authored state transitions may use 240ms;
  evidence-path drawings 420ms; rare editorial arrivals 900ms.
- Animate opacity or transform for controls. Prose never animates into
  readability.
- Honor `prefers-reduced-motion`, forced colors, keyboard navigation, and 200%
  zoom.
- Text clears WCAG contrast. Focus is visible immediately. No core content
  depends on hover, JavaScript arrival, or horizontal scrolling.
- At narrow widths, recompose diagrams and ledgers instead of shrinking a
  desktop canvas into texture.

## Avoid

- Generic admin-dashboard metrics as the primary hierarchy
- Stars, orbital lines, or space imagery inside a figure without data
  meaning, or anywhere a reader could mistake them for evidence
- Dark-neon AI styling, glass, glow, gradient text, or fake depth
- Parallel primitive libraries, token palettes, icon systems, or global CSS
  vocabularies
- Repeated authority explanations and manually copied release facts
- Hiding exact state instead of progressively disclosing it

When a surface feels flat, reach for evidence, hierarchy, and composition
first. They are what usually fix it. Atmosphere is allowed to be the
answer on an editorial opening, where the register of the page is part of
what it is saying — but it is the answer least often, and never in place
of an argument.
