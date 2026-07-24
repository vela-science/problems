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
    fontFamily: "Inter"
    fontSize: "clamp(0.65rem, 0.72vw, 0.72rem)"
    fontWeight: "500"
    lineHeight: "1.28"
    letterSpacing: "0.07em"
  h1:
    fontFamily: "Newsreader"
    fontSize: "4.35rem"
    fontWeight: "500"
    lineHeight: "1.02"
    letterSpacing: "-0.005em"
  h2:
    fontFamily: "Newsreader"
    fontSize: "2.35rem"
    fontWeight: "500"
    lineHeight: "1.05"
    letterSpacing: "-0.005em"
  body-md:
    fontFamily: "Newsreader"
    fontSize: "1rem"
    fontWeight: "400"
    lineHeight: "1.75"
    letterSpacing: "0em"
  body-lg:
    fontFamily: "Newsreader"
    fontSize: "1.12rem"
    fontWeight: "400"
    lineHeight: "1.72"
    letterSpacing: "0em"
  h2-compact:
    fontFamily: "Newsreader"
    fontSize: "clamp(1.45rem, 7vw, 1.75rem)"
    fontWeight: "500"
    lineHeight: "1.05"
    letterSpacing: "-0.005em"
  caption:
    fontFamily: "Newsreader"
    fontSize: "0.86rem"
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0em"
  note:
    fontFamily: "Inter"
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
    fontFamily: "Inter"
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

One system, two rooms. The Astro site (`www.vela.space`) is a warm
editorial reading surface: cream paper, midnight ink, one gold accent.
The Next.js Observatory (`app.vela.space`) is a cool, light-first
repository workbench. They share the sail, the brand tokens in
`packages/brand/vela.tokens.json` (the DTCG source always wins over
this document), the status grammar, and exact generated facts. They
never share UI implementations.

Both rooms serve the reuse end of one Vela product story: produce, preserve,
check, decide, reuse. The editorial surface explains the system and its case.
The Observatory lets a reader inspect, reproduce, and continue rooted work.
Neither surface produces canonical state or participates in authority.

## Editorial product shell

All `www` routes use the same explicit 60px masthead and the same mast-headed
colophon footer. The labeled Vela wordmark links Home; the masthead exposes
Home, Constellations, Manifesto, and Open Observatory. Whitepaper, Stack,
Facility, and source remain durable routes outside the primary navigation.
The masthead never hides on scroll, changes ink based on viewport
position, or invents route-specific navigation. Dark openings choose the
night variant in their layout; paper routes choose the paper variant.

The current shared vocabulary is deliberately small:

- `EditorialMasthead`
- `PublicationHeader`
- `EditorialFooter`
- `PublicationShelf`
- `ExactSnapshot`
- `ArchitectureSnapshotNotice`

Every route closes on the same `EditorialFooter`. There is no per-publication
continuation footer: a reader who reaches the end of an essay is offered the
same statement, the same two link groups, and the same line of exact state as
everywhere else.

`src/data/publications.ts` is the sole publication registry. The index, route
metadata, and home shelf derive from it. Do not recreate a catalogue data file,
alternate imprint, or second navigation component.

The home uses a four-act Feature Stack: proposition and exact proof object;
state to direction; one end-to-end receipt; demonstrated/open evidence plus
publications. The removed audience-role chooser and duplicated night close are
not patterns to restore. `/manifesto` is a numbered thesis page with no painted
hero, rail, or essay chrome. `/essays` is an asymmetric Index-First publication
surface. The authored essays remain Long Documents.

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

Newsreader (display cuts) for titles and section headings; Newsreader
(text cuts) for body and captions; Inter for editorial navigation, metadata,
and diagram labels; IBM Plex Mono for identifiers, values, and counts. Prose
measure 41.5rem, line-height about 1.7. The Observatory is sans and mono only:
Geist Sans carries product prose and controls, while IBM Plex Mono is reserved
for identifiers, roots, commands, and exact numerical fields. Newsreader and
Inter never enter the product app.

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
2. The long handoff: route chart across twenty-two centuries with a
   six-landfall ledger; the one scroll-scrubbed figure.
3. Absorption pressure: flow sheaf, 39 to at least 78 to 30, with
   display-scale numerals.
4. Three soundings: plumb lines on a log scale of time.
5. The starting point, moved: the finding record itself, typeset
   (ruled matter on the page ground, no card).
6. The torrent and the ledger: event rain over a step function.
7. Two tracings: two hands tracing shared stars (the section is about
   who draws the lines).
8. A synthesis frontier: the one interactive instrument, a dependency
   graph with keyboard-operable records.

Principles:

- Maximize data-ink. A figure earns its place by teaching something
  real; more true content beats more emptiness. Cut decoration, never
  information.
- Labels are content. Annotate directly on the drawing; there is no
  label ceiling. The caption carries argument, not decoding
  instructions the drawing could have carried itself.
- Axes, scales, rulers, and graticules are welcome wherever quantity
  appears. Give every number a yardstick.
- Real names over abstractions. When history is the subject, name the
  Library of Alexandria, the Philosophical Transactions, the Memex.
- One shared kit across all forms: filled disc for state, ring for
  claim, teal tick for evidence, dashed ring for uncertainty and
  review, cinnabar X for conflict. Three stroke weights (1px
  structure, 2px trajectory, 3.5px gold hero, one hero per figure).
  Mono for values, sentence case, no legends when direct labeling
  works.
- Every figure is complete at rest: no-JS, reduced motion, and print
  all read the full argument. Interaction re-weights what is already
  visible. One instrument per essay (Fig 08), one scroll scrub
  (Fig 02), hover isolation only on comparison figures, guarded by
  `(hover: hover) and (pointer: fine)`.
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
