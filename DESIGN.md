# Design

This describes the system. It does not decide the work.

Read it to find out what the type roles are, which motion durations exist,
what a filled disc means, and which floors a page has to clear. Do not read
it to find out whether a particular figure should be dark, or how a section
should open, or what belongs in a hero. Those are judgments, and they are
made by building the thing and looking at it.

A document that answers design questions in advance produces work that all
looks the same and cannot be argued with. This one has been rewritten twice
for exactly that reason. If it starts accumulating rulings again — "the one
dark plate", a roster naming what each figure must be, a list of what a
section may contain — delete those parts. Rules that describe are useful;
rules that adjudicate are not.

## Where the truth actually lives

Colour, fonts, and delivery assets are governed in `packages/brand`, and
`bun run check:brand` fails the build if they drift. The three-tier token
architecture is `packages/brand/generated/tokens.css` → `apps/www/src/styles/
tokens.css` → `apps/www/src/app/globals.css`, which bridges into Tailwind.

No values are copied into this file. A second list of hex codes in a document
nobody validates is a list that goes quietly wrong.

## Two rooms

`www.vela.space` is editorial: paper ground, near-black type, serif display
and body, one gold accent. `app.vela.space` is the Observatory: sans and mono
only, denser, closer to a repository interface.

They share the mechanism — Tailwind v4, shadcn primitives, the token bridge —
and keep separate `components/ui` copies and separate type systems. Neither
is a skin of the other.

## Type

Four roles, each with one job.

- **Zodiak** — display. High-contrast serif; sits at weight 400 because it
  thickens fast, and sets wider than most faces, so check line counts after
  any size change.
- **Gambetta** — body and captions. Old-style numerals in prose, so dates sit
  inside the line instead of shouting.
- **Switzer** — metadata: wordmark, nav, eyebrows, diagram labels.
- **IBM Plex Mono** — identifiers, roots, commands, exact numbers. Lining
  numerals.

Newsreader and Inter may not return; two CI gates fail if either name appears
in a generated stylesheet or a delivered font profile.

## Layout

The editorial reading surface is one column, with a section rail added when
there is genuinely room for both. Prose stays between roughly 45 and 78
characters a line — measure it with the real font rather than estimating, and
be suspicious of any width where the column gets *narrower* as the window
gets wider.

Figures have four width tiers: `column` (the prose measure), `wide` (48rem),
`page` (64rem), `screen` (88rem, inset). Anything above `column` breaks out
centred on the reading axis, which is not the viewport axis when a rail is
present — a viewport-width guard alone will let a figure overhang.

Captions read `Fig. NN. Title. Explanation.` below the visual, never inside
it. Depth is atmospheric: hairlines, paper, small opacity shifts. Sharp
corners, no cards, no glass, no heavy shadows.

## The figure kit

One vocabulary across every drawing, so a mark means the same thing wherever
it appears:

- filled disc — a state something has reached
- ring — a claim, not yet judged
- dashed ring — open; nothing is there yet
- gold stroke — the route that carries standing forward
- plain stroke — a leg into a decision nobody has made
- dashed stroke — a leg that has not happened
- seam or cross — a conflict, never colour alone

Three stroke weights: 1px structure, 2px trajectory, 3.5px for the single
gold hero stroke.

The rule that matters more than any of these: **every mark must decode to
something real.** If a star, a line, or a field stands for nothing in the
data, cut it. Derive geometry from the record where you can, so the drawing
cannot disagree with the numbers beneath it.

Follow the Cajal standard otherwise — maximise data-ink, annotate directly on
the drawing, name real studies and communities, give every quantity a
yardstick. There is no label ceiling; captions carry argument, not decoding
instructions the drawing could have carried itself.

## Motion

Four durations — 160ms feedback, 240ms state change, 420ms draws, 900ms
arrivals — and two curves, `--ease` and `--ease-arrive`. Painted plates may
take 1100ms.

Stagger belongs at the feedback tier. Offsets compound: a stagger underneath
a delay underneath a duration is how a two-second wait happens by accident.
Time the result and read the number.

Prose never animates in. Honour `prefers-reduced-motion` everywhere: drop the
stagger, never the state.

## Floors

These are not preferences, and each is measurable:

- Text clears 4.5:1, or 3:1 at 24px and above. Composite alpha against the
  *resolved* ground — a gradient surface leaves `backgroundColor`
  transparent and will read as white-on-white if you let it.
- SVG labels render at 12px or larger at every viewport. Below 680px switch
  to an authored phone canvas; redraw the geometry rather than shrinking a
  desktop drawing into texture.
- Every figure reads complete at rest. Nothing important may depend on
  JavaScript, an observer, or a hover.
- No horizontal scroll at any width from 320px up.
- One visible focus indicator wherever a keyboard can land. A custom
  indicator is fine; no indicator is not.

## Avoid

Generic SaaS framing on reading pages. Dark-neon AI aesthetics, gradient
text, glassmorphism, icon-card grids. Decorative star fields standing in for
relationships. Captions inside SVGs. Essay typography leaking into figure
labels. Em-dash-heavy or grandiose copy.

When something feels flat, add real content or better composition. Not
decoration.
