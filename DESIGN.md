---
version: "0.3.0"
name: "Vela"
description: "One Web product with an editorial home and a read-only scientific-state Observatory."
colors:
  primary: "oklch(26.5% 0.035 262)"
  on-primary: "oklch(98.3% 0.017 88)"
  secondary: "oklch(43.5% 0.030 258)"
  tertiary: "oklch(70.5% 0.118 87)"
  tertiary-ink: "oklch(46.8% 0.102 82)"
  tertiary-line: "oklch(78.5% 0.072 88)"
  neutral: "oklch(96.2% 0.024 88)"
  neutral-raised: "oklch(98.3% 0.017 88)"
  neutral-sunken: "oklch(92.4% 0.025 86)"
  ink-strong: "oklch(22% 0.034 262)"
  ink-muted: "oklch(35.5% 0.031 262)"
  gold-soft: "oklch(89.6% 0.052 89)"
  gold-night: "oklch(66.5% 0.110 84)"
  cinnabar: "oklch(49.5% 0.128 35)"
  moss: "oklch(43.5% 0.043 128)"
  brass: "oklch(45.5% 0.082 83)"
  winter: "oklch(68.5% 0.040 236)"
  stone: "oklch(55% 0.022 80)"
  evidence: "oklch(60.5% 0.065 191)"
  progress: "oklch(65.5% 0.08 149)"
  caution: "oklch(64.5% 0.115 76)"
  conflict: "oklch(49.5% 0.125 15)"
  fig-night: "oklch(21% 0.048 260)"
  fig-night-structure: "oklch(96.8% 0.004 90)"
  night: "oklch(29% 0.050 260)"
  night-deep: "oklch(21% 0.048 260)"
typography:
  rail:
    fontFamily: "Switzer"
    fontSize: "clamp(0.65rem, 0.72vw, 0.72rem)"
    fontWeight: "500"
    lineHeight: "1.28"
    letterSpacing: "0.07em"
  h1:
    fontFamily: "Zodiak"
    fontSize: "4.35rem"
    fontWeight: "500"
    lineHeight: "1.02"
    letterSpacing: "-0.005em"
  h2:
    fontFamily: "Zodiak"
    fontSize: "2.35rem"
    fontWeight: "500"
    lineHeight: "1.05"
    letterSpacing: "-0.005em"
  body-md:
    fontFamily: "Gambetta"
    fontSize: "1rem"
    fontWeight: "400"
    lineHeight: "1.75"
    letterSpacing: "0em"
  body-lg:
    fontFamily: "Gambetta"
    fontSize: "1.12rem"
    fontWeight: "400"
    lineHeight: "1.72"
    letterSpacing: "0em"
  h2-compact:
    fontFamily: "Zodiak"
    fontSize: "clamp(1.45rem, 7vw, 1.75rem)"
    fontWeight: "500"
    lineHeight: "1.05"
    letterSpacing: "-0.005em"
  caption:
    fontFamily: "Gambetta"
    fontSize: "0.86rem"
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0em"
  note:
    fontFamily: "Switzer"
    fontSize: "0.68rem"
    fontWeight: "400"
    lineHeight: "1.46"
    letterSpacing: "0.005em"
  product-compact-action:
    fontFamily: "Geist Sans"
    fontSize: "0.8rem"
    fontWeight: "500"
    lineHeight: "1.25"
    letterSpacing: "0em"
  product-dashboard-value:
    fontFamily: "IBM Plex Mono"
    fontSize: "1.75rem"
    fontWeight: "500"
    lineHeight: "1.15"
    letterSpacing: "-0.035em"
  label-caps:
    fontFamily: "Switzer"
    fontSize: "0.72rem"
    fontWeight: "500"
    lineHeight: "1"
    letterSpacing: "0.18em"
  mono-index:
    fontFamily: "IBM Plex Mono"
    fontSize: "0.68rem"
    fontWeight: "400"
    lineHeight: "1.2"
    letterSpacing: "0.16em"
  figure-stat:
    fontFamily: "IBM Plex Mono"
    fontSize: "clamp(1.7rem, 3.4vw, 2.3rem)"
    fontWeight: "450"
    lineHeight: "1"
    letterSpacing: "0em"
  figure-stat-mobile:
    fontFamily: "IBM Plex Mono"
    fontSize: "1.6rem"
    fontWeight: "450"
    lineHeight: "1"
    letterSpacing: "0em"
rounded:
  none: "0px"
  xs: "2px"
  sm: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  "3xl": "64px"
  "4xl": "96px"
  "5xl": "128px"
components:
  essay-hero-title:
    textColor: "{colors.primary}"
    typography: "{typography.h1}"
    width: "22ch"
  skip-link:
    backgroundColor: "{colors.neutral-raised}"
    textColor: "{colors.primary}"
    typography: "{typography.note}"
    rounded: "{rounded.sm}"
    padding: "8px"
  essay-prose:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
    width: "41.5rem"
  section-heading:
    textColor: "{colors.primary}"
    typography: "{typography.h2}"
    height: "auto"
  section-glyph:
    textColor: "{colors.tertiary}"
    size: "2.55rem"
  figure-caption:
    textColor: "{colors.secondary}"
    typography: "{typography.caption}"
    width: "follows the active prose measure"
  figure-title:
    textColor: "{colors.ink-strong}"
    typography: "{typography.caption}"
  margin-note:
    textColor: "{colors.ink-muted}"
    typography: "{typography.note}"
    width: "reading measure inline disclosure"
  margin-note-marker:
    textColor: "{colors.tertiary-ink}"
    typography: "{typography.mono-index}"
  left-rail-node:
    textColor: "{colors.secondary}"
    typography: "{typography.note}"
    height: "44px"
  image-plate:
    backgroundColor: "{colors.neutral}"
    width: "52rem"
    rounded: "{rounded.none}"
  image-plate-hover:
    backgroundColor: "{colors.neutral-sunken}"
    width: "52rem"
    rounded: "{rounded.none}"
  dark-canvas:
    backgroundColor: "{colors.night-deep}"
    textColor: "{colors.gold-night}"
  dark-edge:
    backgroundColor: "{colors.night}"
    textColor: "{colors.on-primary}"
  semantic-replicated:
    textColor: "{colors.moss}"
    typography: "{typography.label-caps}"
  semantic-contested:
    textColor: "{colors.brass}"
    typography: "{typography.label-caps}"
  semantic-inferred:
    textColor: "{colors.winter}"
    typography: "{typography.label-caps}"
  semantic-stale:
    textColor: "{colors.stone}"
    typography: "{typography.label-caps}"
  glow-accent:
    backgroundColor: "{colors.gold-soft}"
    textColor: "{colors.primary}"
---

# Vela design

One system, two rooms. `www.vela.space` is a warm editorial reading
surface: cream paper, midnight ink, one gold accent. The Observatory
(`app.vela.space`) is a cool, light-first repository workbench. They
share the sail, the brand tokens in `packages/brand/vela.tokens.json`
(the DTCG source always wins over this document), the status grammar,
and exact generated facts.

Both rooms are Next.js on Tailwind v4 with shadcn primitives. www moved
off Astro on 2026-07-28; the two apps now share a *mechanism* — one
framework, one styling system, one component idiom — but still share no
component. Each keeps its own `src/components/ui`, its own semantic
ramp, and its own faces: the three editorial families never enter the
product app, and Geist never enters the editorial one. What the shared
mechanism buys is that a utility and a hand-authored rule resolve to the
same token in either room. It does not license copying a surface from
one into the other.

The editorial app is a static export (`output: "export"`). Nothing on
www runs at request time.

Both rooms serve the reuse end of one Vela product story: produce, preserve,
check, decide, reuse. The editorial surface explains the system and its case.
The Observatory lets a reader inspect, reproduce, and continue rooted work.
Neither surface produces canonical state or participates in authority.

## Editorial product shell

The rebuild of 2026-07-28 removed the shared shell. There is no
`EditorialMasthead`, no `EditorialFooter`, no `PublicationShelf`, and no
publication registry, because there are two routes and a component
abstracted over two instances is a component that exists to be filled in
later. Each route carries its own header, sized to what it is: the chart
opens with the sail and four wayfinding links on the night plate; the
essay opens with the sail alone, because a reading surface should not
begin with a menu.

That is a reduction, not a repeal. When `/essays`, `/whitepaper`,
`/stack` and `/facility` return, the shared masthead returns with them,
and it returns under the rules the old one earned:

- One height, `--masthead-h` (3.25rem), consumed as a token and never as
  a literal.
- The Vela sail alone links Home. No wordmark text. The anchor carries
  `aria-label="Vela home"` because the mark's svg is aria-hidden, and the
  bar carries no separate Home link.
- It never hides on scroll, never changes ink by scroll position, and
  never invents route-specific navigation.
- On a night route the bar is transparent and the opening pulls itself up
  by `--masthead-h` so the sky runs unbroken behind the sail. A
  translucent plate composites over the page ground instead and reads as
  a grey strip.
- Whatever does not fit a 3.25rem bar on a phone folds into a
  `<details>` disclosure, not a JavaScript menu. The bar has to work with
  no JavaScript.

`ExactSnapshot` and `ArchitectureSnapshotNotice` survive as the two
components that state exact projection state, and every surface that
names a count or a root uses one of them rather than typesetting the
number itself.

The chart route runs one argument in order: the sky, then the table, then
one opened claim, then the command, then where the open work is, then the
test the system can fail. The civilisational claim sits below the working
demonstration, never above it — and on this page it sits below in the
literal sense too, as the last section, phrased as what remains unproved.

The record's anatomy is drawn in the technical vocabulary the Observatory
and the projection already use: claim, evidence, verifier, authority,
root. It was once drawn five times in three vocabularies across a premise
act and a scroll-linked voyage, which is what made the page read as
complicated. Every panel reads at rest, so no-JS loses nothing.

Not patterns to restore: the audience-role chooser, the duplicated night
close, the compact publication shelf, the retired `/manifesto`, the
five-cell station strip, and counts that animate up to their value — a
spring arriving at an exact figure reads as a marketing gesture, and
exactness is the claim the page is making.

### The chart

The landing is a chart of four published frontiers, and the rules that
keep it a chart rather than a picture are executable in
`src/data/frontier-chart.test.ts`:

- Every mark decodes to a protocol state. A mark that decodes to nothing
  does not belong in the sky.
- Positions are hand-placed; strokes are generated from the marks. The
  gold route is built out of exactly the findings that have standing, so
  it cannot be drawn through one that does not.
- Star counts are a sample and say so in the caption. State proportions
  are not a sample: they are the frontier's real ratio of pending reviews
  and open work, floored at one so a single pending decision never
  vanishes.
- A frontier absent from the projection throws at build. The chart must
  not draw a frontier that does not exist.
- The open leg never animates. It has not happened.
- Below 680px the four-constellation sky becomes a stack of the same
  geometry cropped one constellation at a time. There is no second set of
  positions that could drift from the first.

### The essay

An essay is a route component, not a document: `page.tsx` under its own
segment, figures as components beside it, prose wrapped in `P`. See
`docs/WEB.md` for why the MDX pipeline was removed.

The reading surface is three columns on wide screens — rail, prose,
balancing gutter — and one column below. The rail's active marker answers
"where am I", so there is no separate progress bar. Rail entries are
navigation and clear 4.5:1 at rail size: `--ink-4` measures 2.42:1 on
paper and is a decorative tier, not a text one.

Chapter stations are glyphs, not ordinals. Each is a faint substrate, one
ink operation, one directional gold mark, and addressable nodes. They
stay in the rail and out of the section headings.

Every figure is complete at rest. Footnotes render expanded in the server
HTML and collapse only once `html[data-notes-enhanced]` is set, so a
reader without JavaScript keeps every citation.

The identity is Cajal meets Kawase: precise, information-dense
scientific drawing on a calm atmospheric ground. The page is quiet so
the figures can be rich.

## Palette

Cream paper, midnight ink, gold. Gold means direction and current
state, split by job: luminous `--gold` for routes and glows, readable
`--gold-ink` for small markers and figure numbers, pale `--gold-line`
for hairlines. The semantic quartet carries figure state: teal
evidence, green progress, amber caution (review), red conflict
(cinnabar seams). Use the `-ink` variants for strokes and text on
cream, the `-night` variants on the night plate. Never encode meaning
by color alone; pair every semantic color with shape, dash, or a
label. No pure black, no pure white, no second dominant accent.

## Typography

Zodiak for titles and section headings; Gambetta for body and captions;
Switzer for editorial navigation, metadata, and diagram labels; IBM Plex Mono
for identifiers, values, and counts. Prose measure 41.5rem, line-height about
1.7.

All three editorial faces are Indian Type Foundry, shipped as **variable
masters**: Zodiak and Switzer carry `wght` 100–900, Gambetta 300–700, each with
a matching italic. So every weight on the site is a real axis position and
nothing is browser-synthesised. **None of them has an `opsz` axis**, so
`font-variation-settings: "opsz" …` is an inert no-op; do not reach for it.
Headings are sized by `font-size` alone.

Zodiak is a high-contrast display serif with dramatic thick-thin transitions.
It reads heavy at scale on its own, so display type sits at 400 and climbing
past it thickens the stems until the hairlines look broken by comparison.
Zodiak also sets noticeably wider than the face it replaced; check line counts
after any size change.

This replaced Newsreader (titles and body) and Inter (UI) on 2026-07-27.
Newsreader is a quiet book serif and Inter the default UI sans, which made the
pair legible but characterless, and both are training-data defaults rather than
decisions. Neither may return. `packages/brand/scripts/check-brand.mjs` and
`scripts/check-budgets.mjs` both fail the build if either name reappears in a
generated stylesheet or a delivered font profile.

The Observatory is sans and mono only:
Geist Sans carries product prose and controls, while IBM Plex Mono is reserved
for identifiers, roots, commands, and exact numerical fields. Zodiak, Gambetta
and Switzer never enter the product app.

Labels inside SVG figures must render at 12px or larger at every
viewport. Desktop skies multiply a >=12px base by `--svg-label-boost`;
at <=680px every figure switches to an authored phone canvas sized by
`--svg-mlabel`. Redraw geometry for the phone canvas rather than
shrinking a desktop drawing into texture.

## Layout

Three-column reading system on wide screens: quiet left rail, center
prose, balancing gutter. Figure width tiers: `column` (prose measure,
typeset artifacts), `wide` (48rem, ordinary diagrams), `page` (64rem,
dense charts), `screen` (the one immersive sequence). Captions return
to the prose measure and read `Fig. NN. Title. Explanation.` below
the visual, never inside it. Depth is atmospheric: hairlines, paper,
small opacity shifts. No cards, no glass, no heavy shadows, no
side-stripe borders. Sharp corners.

## Figures: the Cajal standard

Each figure takes the strongest form for its own section's argument.
The current roster:

1. Twelve visits: night-sky constellation (the title scene, the one
   dark plate in the essay).
2. Absorption pressure: flow sheaf, 39 to at least 78 to 30, with
   display-scale numerals.
3. The starting point, moved: the finding record itself, typeset
   (ruled matter on the page ground, no card).

Principles:

- Maximize data-ink. A figure earns its place by teaching something
  real; more true content beats more emptiness. Cut decoration, never
  information.
- Labels are content. Annotate directly on the drawing; there is no
  label ceiling. The caption carries argument, not decoding
  instructions the drawing could have carried itself.
- Axes, scales, rulers, and graticules are welcome wherever quantity
  appears. Give every number a yardstick.
- Real names over abstractions. When evidence is the subject, name the
  study, check, artifact, or community whose work the figure depicts.
- One shared kit across all forms: filled disc for state, ring for
  claim, teal tick for evidence, dashed ring for uncertainty and
  review, cinnabar X for conflict. Three stroke weights (1px
  structure, 2px trajectory, 3.5px gold hero, one hero per figure).
  Mono for values, sentence case, no legends when direct labeling
  works.
- Every figure is complete at rest: no-JS, reduced motion, and print
  all read the full argument. Interaction may re-weight what is already
  visible but never carries required meaning.
- The night plate (`.bl-fig-night-plate` in global.css) is the single
  dark ground, reserved for a figure whose subject is darkness. It
  remaps paper, inks, and gold to night values; captions stay on
  cream.
- Do not flatten the essay back into one visual register, in either
  direction.

## Motion

Four durations: 160ms micro feedback, 240ms state transitions, 420ms
draws, 900ms arrivals (the two painted bookends may use 1100ms). Two
curves: `--ease` and `--ease-arrive`. No runtime blur or
backdrop-filter on reading surfaces. Prose never animates in. Honor
reduced motion everywhere; drop stagger, never state.

## The Observatory, briefly

Repository-product register: rail plus contextual header, GitHub-like
hierarchy, record pages that keep metadata beside the object. Fixed
type scale (0.75rem metadata, 0.8rem compact actions, 0.875rem body,
1.5rem titles, 1.75rem dashboard values), 40px row rhythm, one quiet
boundary, restrained radii, and no decorative shadow. Current shadcn
Base UI primitives remain registry-clean; Vela styling enters through
tokens and composition. Gold is reserved for
direction, focus, provenance seams, and the primary action. The
Observatory never signs, never mutates a frontier, and never presents
verifier success as scientific acceptance.

## Avoid

Generic SaaS or dashboard framing on reading pages; dark-neon AI
aesthetics; gradient text; glassmorphism; icon-card grids; decorative
star fields standing in for relationships; captions inside SVGs;
essay typography leaking into figure labels; a second frontier
parser or duplicated canonical routes; em-dash-heavy or grandiose
copy. When something feels flat, add real content or better
composition, not decoration.
