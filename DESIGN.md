# Vela design system

Vela turns retained scientific state into legible direction. The design system
does the same: it makes evidence, standing, relationships, and next actions
clear without decorating uncertainty away.

The governing idea is **direction through evidence**.

- The sail represents movement from recorded state toward a bounded next
  direction.
- In a figure, a constellation represents real relationships among records.
  Every mark in a figure decodes to something a reader can check.
- Atmosphere is not a figure and is not held to that rule. An editorial surface
  may carry a drawn sky whose job is the register of the page. It stays behind
  the type at hairline weights, carries no labels, claims no quantities, and
  does not print. A reader must never have to ask whether it is data. When in
  doubt, it is not atmosphere, it is a figure, and it decodes. The Observatory
  has no atmosphere at all.
- Space is expressed through scale, quiet, contrast, and orientation, not neon,
  particles, glow, or generic science-fiction styling.
- Gold marks direction and provenance. It is not a general highlight colour.

This document defines the shared system. It does not prescribe every page
composition.

## Architecture

| Layer | Source | Responsibility |
| --- | --- | --- |
| Brand | `packages/brand` | DTCG-shaped tokens, type roles, fonts, sail geometry, state colours, licences, deterministic exports |
| React UI | `packages/ui` | Official shadcn `base-nova` primitives on Base UI and stable Vela presentation semantics |
| Editorial composition | `apps/www` | Authored publications, figures, product narrative, and documentation layouts |
| Product composition | `apps/observatory` | Read-only workbench shell, domain surfaces, URL state, and the Sigma graph |
| Exact data | `packages/frontier-data` | Rooted projections consumed by both applications |

`@vela/brand` is framework-neutral. `@vela/ui` is the shared React source for
both Next.js applications and future private Vela applications. Applications
share primitives and stable semantics; they do not share whole route layouts.

`packages/ui/components.json` is the only shadcn source configuration. Vela
maintains no second component catalogue and publishes no registry; `packages/ui`
is consumed through package exports.

## Two registers

### Editorial

`www.vela.space` is the authored register: paper and midnight grounds, Zodiak
display, Gambetta body, Switzer metadata, and IBM Plex Mono for exact values.
Its rhythm is spacious and asymmetric. Figures carry arguments.

The landing page is numbered bands, one per screen, in the essay's register. Its
tagline, lead, install line, and command tours are quoted from the protocol
repository; its counts, version, and observation date come from the committed
projection. Nothing on it is written about the product.

### Product

`app.vela.space` is the instrument register: a cool-tinted light ground and an
equivalent midnight one, both drawn from a single hue family so a small
luminance step still reads as a step; Geist for interface text, IBM Plex Mono
for identifiers and exact values, compact controls, and dense but readable
ledgers. Dark mode is equivalent, not a separate aesthetic.

The registers share the sail, state semantics, token source, accessible
interaction, and exact data. They do not make the editorial site look like a
dashboard or the Observatory look like an essay.

## Vocabulary

The words on screen are the product's first design decision. A reader who
cannot name what they are looking at cannot check it.

**Current.** Frontier, Claim, Problem, Target, Submission, Proposal,
Verification Record, Decision, Dossier, Source.

**Retired.** Finding is the predecessor era's name for a Claim; it survives as a
protocol event-kind stem (`finding.asserted`, `finding.noted`,
`finding.retracted`, `finding.superseded`) and inside retained `vf_`
identifiers, both of which appear as exact values and never as product words,
and as vela's own view-only editorial label for a Claim with positive standing.
The graph node kind `finding` is written by this repository's projection
builder rather than received from the protocol, and the reader relabels it to
Claim in `apps/observatory/src/lib/product-language.ts`. Work, Review, and
Activity name no destination: they are activities, and a reader cannot link to
an activity, only to the record it acts on. Run and Attempt both named an
execution occurrence the protocol does not govern, and both are gone: the
surface that displayed them was deleted with the table behind it, which held
zero rows in every release. The word survives only as
`provenance.source_attempt` on a Submission, an exact value the producer
supplies. The release-level `/runs` path still redirects to `/decisions`; the
frontier-scoped route published no record, so no durable URL was broken. Bundle is a protocol root
and may appear only as a labelled exact value.

Two of the product's words have no protocol object behind them, and the product
says so rather than implying authority a grouping cannot confer. A Dossier is an
exact rooted case record and no Vela object; Sources is a release-scoped
registry and a navigation grouping.

A destination is named after a retained record. Where the protocol's word and
the reader's word differ, the reader's wins in interface text and the protocol's
appears beside it as the exact value.

## Type

The product register has nine roles, generated from `packages/brand/vela.tokens.json`
into `@vela/brand/type-product.css` and imported by the Observatory's
`globals.css`:

`display`, `title`, `subtitle`, `body`, `compact`, `label`, `meta`, `micro`,
`eyebrow`.

Each role fixes size, leading, weight, and tracking together, because that is
what makes a hierarchy legible at a glance. Reach for a role, not for a size
utility plus `text-muted-foreground`. The role names avoid Tailwind's default
size names on purpose, so `text-meta` cannot be confused with `text-xs`.

The generated file is a `@theme` block. It is generated rather than authored so
a scale derived from tokens does not consume the authored-CSS allowance.

## Colour

- Edit core values in `packages/brand/vela.tokens.json`, then regenerate. Never
  copy brand values into prose documentation or route CSS.
- `packages/ui/src/styles/product.css` owns the shadcn semantic bridge and the
  product theme. Each application `globals.css` is an integration layer:
  imports, Tailwind theme mapping, base typography, accessibility, print, and
  true cross-route rules. Route presentation belongs beside its component.
- Grounds and ink in the product register share one cool hue family. A ground
  with no chroma makes every neighbouring surface read as the same surface;
  a little shared chroma lets a small luminance step do the separating instead
  of an outline. The page-to-panel step is 0.012 on paper, 0.026 on midnight.
- Gold (`--direction`) has no foreground pair, and must not be given one. It can
  be a stroke, a glyph, or a rule; it can never be a fill with text on it. Under
  forced colours it maps to the system link keyword. The one wash of gold in
  the product is the text-selection tint, which both registers share.
- `--command` is the one plate that ships its own foreground. In dark mode it
  lifts above the ground rather than sinking below it, because on midnight there
  is no darker value left that carries contrast.
- The grounds the contrast test reads out of the stylesheet — background, card,
  and muted — are literal `oklch()` values in both themes, so the test can
  measure them. An alias such as `--popover: var(--card)` is fine.
- Use semantic variables and utilities. Raw colours are reserved for token
  definitions and derived data visualisations with an explicit legend.
- IBM Plex Mono is limited to roots, identifiers, commands, and exact tabular
  values.

## State

Four state axes are independent, and collapsing any two of them is the
protocol's named failure mode:

| Axis | What it records | Values |
| --- | --- | --- |
| Claim standing | what an authorised human Decision established | unassessed, accepted, accepted with conditions, retracted, superseded, corrected |
| Verification outcome | what a scoped machine check reported | pass, fail, inconclusive, error, not attempted |
| Proposal status | where a candidate transition sits in review | pending review, accepted, rejected, and withdrawn as a separate appended record |
| Repository integrity | whether the repository replays | replay verified or not initialised; strict pass or blocked, with blocker counts |

The CLI emits four of those six: `accepted` after an accepted Decision on an
addition or a revision, `retracted` after one on a withdrawal, `superseded`
after a `finding.superseded` Event, and `unassessed` over every Claim no ruling
stands over. `accepted with conditions` and `corrected` stay declared and
underived, because a Decision records no conditions and `corrects` is a Claim
relation no Decision reads.

Through `0.966.3` the CLI answered this axis in the Proposal's words, returning
pending review, rejected and withdrawn as a Claim's standing, and the product
translated them back on read. Both halves are gone: the protocol took the
decision upstream, and the projection now stores the declared word, so these
surfaces render the column rather than a correction of it. Nothing is promoted
onto the axis either — producer-side flags and Submission-authored conditions
are shown as what they are, because reading them as `corrected` or `accepted
with conditions` would say an authority had ruled where none has.

A badge names exactly one axis and says which. Standing and verification never
share a glyph, and neither appears without the word for its axis; the tone
palette is shared across all four, so the glyph and the wording do the
separating. Status always combines text with shape or icon and
colour, never colour alone. A passing verifier is not an acceptance, a Git merge
is not a Decision, and rank, search order, and graph position confer nothing.

The state glyph encodes two axes in one mark so a ledger row can carry both
without two badges: the ring is standing, the core is verification, and an inner
ring marks a transitive cone. A half core is acceptance with conditions.

## Navigation

There is one navigation system, and one scope on screen at a time.

- The **sidebar** is contextual. Outside a Frontier it lists release-wide
  destinations. Inside a Frontier it becomes that Frontier's own sections,
  grouped under State, Direction, and Integrity, which are the protocol's axes
  rather than invented headings, so a group heading can never be mistaken for a
  page that is missing. No label ever means two scopes on one screen.
- The **header** carries one trail, and beside it only tools that are not
  places: the navigation toggle, search-and-jump, notifications, theme, and
  account. The trail's last element is the current page as text marked
  `aria-current="page"`. Inside a Frontier its first element is the Frontier
  switcher, a control rather than a link, which preserves the current section
  across a switch; outside one, the page name stands alone.
- A view of a collection is entered from the collection, not listed beside it.
  The graph is the Claim ledger drawn as a graph, so it is reached from the
  ledger's toolbar and from the palette rather than from the sidebar. It renders
  on its own route, because it is an instrument carrying its own state.
- Every route body owns exactly one descriptive `h1`. On a collection the trail
  already names the page, so that heading is visually hidden and carries its
  scope; a screen reader then gets the orientation a sighted reader gets from
  the trail. On a record or a Frontier the heading is the record's own content
  and stays visible.
- Every glyph in a navigation surface is distinct. A repeated mark reads as a
  repeated destination. Hugeicons is the interface icon family; a Vela-drawn
  icon is added only where no generic glyph can express a scientific state
  without ambiguity.
- A published URL never stops resolving. Retired paths keep permanent
  redirects, and product state that a reader would bookmark or send to a
  colleague lives in the URL.

## Page archetypes

A page picks one archetype and does not blend two. Three pages that look alike
teach a reader nothing about what is on them.

- **Collection.** Opens quiet and horizontal and gets to its rows. The count and
  the controls sit in the content's own toolbar, beside the thing they count or
  control, not in a band above it. A paragraph explaining what a Claim is
  belongs in the glossary, not above every page that lists them.
- **Record.** Opens with the record. Its kind is a small eyebrow above, its own
  content is the largest text on the screen, and provenance is one line of small
  facts beneath. The largest text is never the word for the record's type.
- **Repository.** A Frontier's own page: name, integrity, and the clone
  affordance in the primary-action position, because the product's claim is that
  nothing sits between a reader and the record. Content left, exact facts right.
  This is the one archetype whose heading is visible. A Frontier is the record,
  not a page about one, so its name is the largest text on the screen for the
  same reason a Claim's assertion is on a Claim page.
- **Instrument.** A compact toolbar, the canvas, and a ledger equivalent for
  everything the canvas shows.

A four-cell signal grid belongs on a directory page, if anywhere. It is not the
opening of a record, and it is not a substitute for hierarchy.

## Separators

Three separators, three jobs, never mixed.

- A dimmed `/` joins the header trail, and is `aria-hidden`.
- A spaced middot joins inline facts of the same kind on one line.
- A hairline (`border-b`, `divide-y`) divides structure. One horizontal rule per
  block: a component does not draw a boundary the page will draw again.

Vertical dividers stay, because they separate peers. Stacked horizontal rules
separate nothing that whitespace had not already separated.

## Scientific visual language

Use one small vocabulary across diagrams:

- ring — the Claim's standing, always drawn; its colour and style say which
  standing, never its presence;
- filled core — a scoped Verification that passed; a half core, acceptance with
  conditions;
- dashed ring with no core — open work, or a Claim not yet judged;
- faded ring with a forward chevron — standing moved on to a successor;
- gold stroke — the route carrying standing or direction forward;
- plain stroke — a recorded relationship;
- dashed stroke — a relationship not yet realised;
- seam or cross — correction, retraction, or conflict, never communicated by
  colour alone.

Every mark must decode to a real record or relationship. Derive geometry and
counts from rooted data. Graph location, visual weight, and search rank never
imply authority.

Figures maximise data-ink, annotate directly, and carry a caption below the
visual. A complex visual must have a text or ledger equivalent.

## Components and compositions

Generic interaction comes from official shadcn/Base UI source in `@vela/ui`:
buttons, fields, dialogs, sheets, sidebar, command, selection, table,
disclosure, tooltip, focus, and keyboard behaviour.

Vela-owned shared components are limited to stable scientific presentation
semantics: status badges, the state glyph, exact values, copy feedback, and
bounded mathematical text. Shells, domain columns, source filters, graph
controllers, reading rails, and authored figures stay with the application that
owns them.

The Observatory ships no Card. A record row is an article or an Item on
hairlines; a boxed surface is reserved for genuinely detachable overlays, and is
never nested.

Tailwind Plus is licensed for use in this private repository. Its patterns may
be adapted where they improve a real surface. Adaptations retain provenance in a
comment, use the shared token system, and converge on shadcn/Base UI behaviour
instead of introducing Headless UI, Heroicons, Motion, or a second component
suite by accident. One-off adaptations remain app-local; stable cross-app
compositions may enter `@vela/ui`. Raw template source is never committed.

## Layout, motion, and accessibility

- Editorial prose stays within a readable measure; wide figures break out from
  the reading axis, not blindly from the viewport.
- Editorial motion has five tiers in `apps/www/src/styles/tokens.css`: 160ms
  feedback, 240ms standard, 420ms deliberate settle, 900ms for an evidence path
  drawing itself, and 1100ms for the one arrival a plate is allowed. The
  Observatory authors none of them. It takes the primitives' transitions
  unmodified and owns only the reduced-motion clamp.
- Animate opacity or transform for controls. Prose never animates into
  readability.
- Honour `prefers-reduced-motion`, forced colours, keyboard navigation, and 200%
  zoom.
- Text clears WCAG contrast. Focus is visible immediately and uses its own
  token rather than borrowing a state colour; in the product register that token
  is never gold. No core content depends on hover, JavaScript
  arrival, or horizontal scrolling.
- At narrow widths, recompose diagrams and ledgers instead of shrinking a
  desktop canvas into texture.

## Budgets

Sizes are measured and reported, never enforced as a ceiling. A threshold picked
once cannot tell a regression from a surface that grew because it now says more.

What fails the build is a category error rather than a number: a heavy runtime
entering an initial chunk, a browser file embedding the projection, per-record
routes going static, the search surface losing its prerender, a font profile
gaining a face. The one size that does fail a build is authored global and
theme CSS, capped at 180 lines, and that cap is structural too: it exists so
route presentation cannot accumulate in a global stylesheet.

## Avoid

- Generic admin-dashboard metrics as the primary hierarchy
- Stars, orbital lines, or space imagery inside a figure without data meaning,
  or anywhere a reader could mistake them for evidence
- Dark-neon AI styling, glass, glow, gradient text, or fake depth
- Parallel primitive libraries, token palettes, icon systems, or global CSS
  vocabularies
- Repeated authority explanations and manually copied release facts
- A band above a page that repeats what the header already said
- Hiding exact state instead of progressively disclosing it

When a surface feels flat, reach for evidence, hierarchy, and composition first.
They are what usually fix it. Atmosphere is allowed to be the answer on an
editorial opening, where the register of the page is part of what it is saying,
but it is the answer least often, and never in place of an argument.

## Related contracts

This file governs the shared system. [`PRODUCT.md`](PRODUCT.md) defines what the
product is and what it may never become; [`docs/design-system.md`](docs/design-system.md)
records the package, shadcn/Base UI, Tailwind, and licensed-source workflow;
[`docs/WEB.md`](docs/WEB.md) records operations. A rule in those files that
contradicts this one is a defect in that file.
