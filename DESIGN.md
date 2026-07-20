---
version: "0.2.0"
name: "Vela"
description: "A light editorial atlas for essays about scientific state, inherited knowledge, and navigation after papers."
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
    width: "21.5rem anchored overlay"
  margin-note-marker:
    textColor: "{colors.tertiary-ink}"
    typography: "{typography.mono-index}"
  left-rail-node:
    textColor: "{colors.secondary}"
    typography: "{typography.note}"
    height: "30px"
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

## Overview

**Precedence:** where this document conflicts with
`packages/brand/vela.tokens.json`, the DTCG source wins. Generated CSS and
TypeScript are outputs, never parallel token authorities. This document
describes the editorial and Observatory applications that consume that shared
brand source.

Vela is one public system with two different rooms. The Astro editorial site is
a light, atmospheric reading surface. The Next.js Observatory is a cool,
first-light scientific-state instrument with a dense night mode. They share
the same sail, brand governance, status grammar, and exact facts, but they do not share UI
implementations or force one framework to imitate the other. Neither should
collapse into a conversion funnel or a generic dashboard.

The primary design job is to help a technically literate reader stay oriented through a dense argument. Beauty matters, but it must come from hierarchy, rhythm, image quality, and diagram clarity rather than decoration. Scientific diagrams are part of the argument. They should make the essay more navigable, not merely illustrate its mood.

### Observatory product register

The Observatory follows a repository-product register: the archived product's
collapsible rail and contextual header provide orientation; GitHub-like
repository hierarchy provides the structural backbone; and Hugging Face-like
record pages keep scientific metadata close to the object it describes. This
is design DNA, not pixel imitation. The result must remain unmistakably Vela
through the sail, stardust focus and active states, semantic state marks, exact
roots, and an explicit separation between verification and authority.

The default is a cool first-light surface. Dark mode remains available as
deep-prussian observatory night, but it is not the default. Product typography
uses the native platform sans stack with Inter as its cross-platform fallback.
IBM Plex Mono carries identities, roots, commands, and aligned values. No serif
appears in the Observatory. Newsreader remains exclusive to the editorial
application, and no product-only font family enters the shared brand package.

Product type is fixed rather than fluid: body and controls use 0.875rem, page
titles use 1.5rem, record names use 1.125rem, compact section headings use
1rem, and exact metadata uses 0.75rem. Weight, proximity, rules, and source
order carry hierarchy before scale. The 40px row rhythm governs repeated state.

The app shell is flatter than a dashboard inset. The rail and contextual header
remain distinct, but the working surface uses one quiet boundary, tiny radii,
and no decorative shadow. Catalogue rows resemble repository records: one
primary identity, one useful summary, nearby state, and exact provenance in a
stable trailing column. Detail pages use contextual tabs and a sticky metadata
rail when width permits. Dense ledgers, open rules, and typographic grouping are
preferred over dashboard-card grids. Stardust is reserved for direction,
focus, active navigation, provenance seams, and the primary action.

Base UI is the only default headless primitive layer. shadcn supplies open
component source and composition, not a visual theme. Every imported primitive
must be normalized into Vela tokens and tested in its interactive states. Do
not add a parallel Radix implementation, a visual component suite, glass,
glow, gradient text, generic cosmic imagery, decorative star fields, or status
meaning conveyed by color alone.

The physical scene begins with a technically literate reader entering a long reading session in a quiet room, with adjacent routes available when they want the working app or a denser technical surface. They will leave if the publication feels like a pitch deck, a SaaS template, or an over-designed AI artifact.

## Typography delivery

Newsreader is served as text and display role instances at its intended optical
sizes. Normal and italic critical files are 22–24 KiB rather than placing the
129–147 KiB variable sources on the critical path; the variable files remain
checked in as licensed source. Normal Newsreader and UI faces use
`font-display: swap` with the established Georgia/Iowan fallback stack;
non-critical italic roles use `optional`.
Preload only a route's above-the-fold role. Font-role or fallback changes need
real-browser layout and visual-regression evidence rather than guessed metrics.

## Colors

The canonical palette is cream, ink, and gold. Cream is the reading ground, ink is the primary carrier of thought, and gold is the navigational light accent. Gold has three jobs: luminous gold for routes and glows, darker gold-ink for small readable markers, and soft gold-line for hairlines. It should not become a button color sprayed across the page.

- **Primary (#232B3A):** body ink and the default color for serious claims.
- **Ink Strong (#14191F):** reserved for maximum contrast and rare anchoring moments.
- **Secondary (#4A5568):** captions, rail labels, ticks, and quiet metadata.
- **Neutral (oklch(97.2% 0.013 88)):** light mineral cream ground, warm enough for the paintings without reading as parchment.
- **Neutral Raised (oklch(98.8% 0.008 88)):** sheets, subtle surfaces, skip link, and image-adjacent lift.
- **Neutral Sunken (oklch(92.4% 0.025 86)):** hover and sunken diagram states.
- **Tertiary (oklch(70.5% 0.118 87)):** borrowed gold for luminous routes, nodes, and glows.
- **Tertiary Ink (oklch(46.8% 0.102 82)):** readable gold for small note numbers, figure numbers, active rail states, and link hover.
- **Tertiary Line (oklch(78.5% 0.072 88)):** pale gold for rules, hairlines, and underline texture.
- **Cinnabar (#B5443A):** rare correction or alert accent. It should read as editorial annotation, not error UI.
- **Moss, Brass, Winter, Stone:** legacy semantic figure colors for the older essays' diagrams; do not use in new figures.
- **Evidence, Progress, Caution, Conflict:** the brand handoff v1.1 semantic quartet (teal, green, amber, red), the figure grammar's state colors. Fitted to the brand hexes and contrast-measured: base values serve fills and bands; `-ink` variants serve stroke marks and labels on cream (all clear 5.6:1); `-night` variants serve the night plate (all clear 5.3:1). Never encode meaning by color alone; pair every semantic color with shape, dash, or an on-mark label. Stable across data-time; only gold shifts with local light.
- **Night / Night Deep:** dark-mode atmosphere and edge canvas. Avoid neon or high-saturation AI aesthetics.

Do not use pure black or pure white. Do not introduce a second dominant accent without first reducing gold. If a new section feels flat, improve its composition before adding color.

## Typography

The typographic system is deliberately literary, with a technical counterweight.

- **Newsreader** (display cuts, high optical size) carries titles, section headings, and figure title fragments. It should feel like a chapter opening, not ornamental display type.
- **Newsreader** (text cuts) carries the essay body and captions. It is the voice of the argument.
- **Inter** carries navigation, uppercase metadata, margin notes, and diagram labels. It prevents the page from becoming too antique.
- **IBM Plex Mono** carries indexes, code-like state, figure coordinates, and numbered references.
- **Inter** is also the Observatory product voice; IBM Plex Mono carries exact
  identifiers, roots, commands, and count values.
- The desktop reading rail uses the compact `--text-rail` step and keeps section names on one line. Below 1320 pixels it becomes a compact current-section disclosure near the masthead; on mobile it returns to the document flow as a non-persistent contents entry.

Technical SVG labels use one shared viewBox scale: `--diagram-label-xs` at 9px for compact secondary annotations, `--diagram-label-sm` at 10px for gates and axes, `--diagram-label` at 11px for primary stations and state roots, and `--diagram-title` at 15px for the rare serif station name. These are diagram coordinates rather than browser text sizes; mobile compositions must still remove labels that would read as thumbnails.

Body copy should stay within a humane measure. Desktop prose should sit around 41.5rem. Tablet prose can be narrower than figure width; figures may expand, paragraphs should not. Body line-height should remain generous enough for dense prose, generally around 1.7 to 1.75.

Avoid dramatic one-line fragments unless the essay truly needs a hinge. Avoid product-copy rhythm. Do not use italics as a default way to make citations or notes feel literary; margin notes should be clear reference text.

## Layout

The page is a three-column reading system on wide screens: left orientation rail, center reading column, and a balancing right gutter. Footnotes do not occupy that gutter; they open as transient cards anchored to their inline references. On smaller screens, the page collapses to a single reading column and footnotes open as bottom reference slips.

Spacing should create reading rhythm, not isolated cards. Sections need consistent top and bottom breathing room. Figures and plates should use equal visual spacing above and below unless a specific narrative transition requires otherwise.

Core layout measurements:

- Prose measure: 41.5rem.
- Figure caption measure: 41.5rem on desktop, 34rem on tablet, and the
  available prose width on mobile.
- Figure widths use four explicit roles: `column` at the 41.5rem prose measure,
  `wide` at 48rem to 52rem for ordinary explanatory diagrams, `page` at 64rem
  for dense comparisons and interactive maps, and `screen` at up to 88rem with
  a one-rem viewport inset for the one immersive long-handoff sequence.
- Footnote card width: 21.5rem maximum, clamped inside a one-rem viewport
  gutter and placed above or below its marker according to available space.
- Desktop left rail appears only when it helps orientation, fades near the top and ending, and should remain quiet.
- Mobile figures can use nearly full viewport width, but text labels inside SVGs need mobile-specific simplification when they become thumbnails. Quantitative fields must preserve the legibility of their repeated marks: redraw the geometry for the phone canvas instead of shrinking a desktop count into texture.

The hero should reveal the essay soon enough that the reader understands there is a substantial argument below. Do not let the hero become a landing-page billboard.

## Elevation & Depth

Depth is mostly atmospheric, not card-based. Use paper texture, deckled image masks, soft radial glow, and hairlines. Shadows should be rare, shallow, and ink-tinted.

The dominant surface should remain flat paper. Figures should not sit inside decorative cards. Image plates should dissolve into the page through masks rather than borders. Technical diagrams can have internal structured surfaces, but the outer frame should stay editorial.

Avoid glassmorphism, blur panels, heavy drop shadows, and framed section bands. If depth is needed, prefer a 1px hairline, a small opacity shift, or a gentle paper lift.

## Shapes

Shapes are print-shaped and sharp. Use no radius or tiny radius. Rounded rectangles are not part of the main visual language except for functional affordances such as skip links or small controls.

Technical figures share one state-substrate grammar, codified 2026-07-16
from the brand handoff v1.1 and rebuilt across the Constellations
figures (the 2026-07-17 visual-world pass cut the route to the seven
visuals that are the story — Figs 01–08 (the last of them the instrument) — and
added the finding-record specimen and the torrent-and-ledger
centerpiece). The anatomy is the sail's own construction: a substrate
baseline (2px ink at the figure's foot) establishes inherited state;
trajectories (2px ink, left to right) carry claims, records, or lineage;
a terminal axis (1px vertical near the right edge) marks where
jurisdiction or direction resolves; condition bands expose shared
conditions without implying equivalence; uncertainty is dashed or
ringed, never implied; negative space is the unknown and is never
filled with decoration. One node kit serves every figure (shared
classes in global.css): state is a filled disc, claim a 2px ring,
evidence a teal tick, uncertainty a dashed ring, conflict an X seam.
Exactly three stroke weights exist: 1px structure, 2px trajectory, and
the 3.5px gold hero reserved for the single route the caption is about;
gold means direction or current state and nothing else. Labels anchor
on the marks (Inter micro-caps for names, IBM Plex Mono for identifiers
and values, quoted short tokens for named concepts); legends are
banned, as are enclosing zone boxes and panels, icon-in-circle clip
art, and gradients as decoration. Captions carry how-to-read and
method, and a figure may open with a question-form kicker. Figures
are statements first: every figure reads complete at rest and serves
the paragraph beside it. Pointer interaction is one shared gesture,
isolation: on hover-capable fine pointers, resting on a strand,
lane, panel, candidate, or propagation thread lets the others recede
(the comparison figures — the absorption cord and the four charts —
and the torrent-and-ledger centerpiece, where resting on the failed
replication traces the correction through all three stanzas). Static
statement figures (the twelve-visits opener, the finding record, the
colophon) carry no gesture; they are complete and still. It only re-weights what is already visible,
never adds tap stops inside aria-hidden art, and is guarded behind
`(hover: hover) and (pointer: fine)` so touch never pins a dimmed
state. A figure that restates
the prose, or that makes an extrapolation or an invented value its
centerpiece, is a tangent and gets cut or simplified. Where
quantity appears, a reference line or labeled tick gives it a
yardstick. Gradients may encode continuity, uncertainty, or density,
but should not provide ambient decoration. Do not copy the provisional
Vela symbol or use decorative star fields as a substitute for
relationships.

The same-sky chart uses the kit's single night plate
(`.bl-fig-night-plate`: night-deep panel, 1px gold hairline, sharp
corners, the plate div as the var-remap boundary for luminous structure
and the dark-adapted quartet). It earns the exception because darkness
is part of the figure's subject, not an ornamental theme change. No
other essay figure should use the plate without the same by-nature
reason, and captions never enter it.

The literal Vela sail is an orientation mark, not a decorative logo.
It may appear at three changes of scale: the opening departure (hero
painting), the long historical handoff where a minimal sail cursor
rides the route head (Fig 02), and the closing return (closing
painting). Do not stamp it onto technical diagrams; the constellation,
finding, and update loop remain their canonical objects. Painted
plates bookend the essay only: the 2026-07-17 (late) pass removed all
inline plates from Constellations after the middle read as
painting-heavy — the middle carries its argument in authored figures
alone, and the two bookends gain force from being the only paintings.

**Motif registry.** The Constellations spine is four persistent objects,
each drawn from shared partials in
`apps/www/src/components/essay/blocks/motifs/`
and painted by the `.m-*` classes in global.css, never redrawn ad hoc,
so every return is literally the same object gaining meaning. The
**finding-star** (`FindingStar.astro`, the long-handoff port geometry:
halo r15 / ring r8 / core r2.8) is a finding, its state epistemic not
decorative — recorded (ink ring), current (gold), superseded (0.55, it
fades without disappearing), open (dashed ring). The **wake**
(`Wake.astro`, the 3.5px gold hero route with `pathLength="1"`) is an
accepted route left recoverable — the voyage's route, the record's
provenance line, the ledger's step, the instrument's lit edges. The
**chart-lines** (`ChartLines.astro`) are the unread field a route
crosses, ambient and unlabelled. The **manifest** is a vocabulary,
not a component (the `ManifestRow.astro` primitive was retired
2026-07-18 with the closing colophon, its last renderer): its six
canonical words — **Location · Claim · Path · History · Check ·
State** — are the layers the voyage collects (Fig 02) and the field
groups of the finding record (Fig 05). If those six words ever change,
both sites change in the same commit. A motif appears only where its
meaning applies.

Every technical figure must expose its complete causal structure at rest. Direct
controls may change emphasis, scale, or the inspected example, but they must not
unlock meaning that is otherwise absent. Keep interaction patterns concept-led:
a historical handoff uses a lineage selector, a queue uses scale, a jurisdiction
comparison uses lanes, and plural authority uses attributed layers. Do not force
different arguments into one repeated numbered-control template.

One instrument, at most, per essay: an operable object where the reader
performs the essay's mechanism once (Constellations: the handoff, in your
hands — challenge a finding, watch the correction reach declared dependents,
flip to document-only and watch it reach no one). An instrument is not a
figure — it is unnumbered, carries its own mono eyebrow, and its resting
state is a server-rendered worked example so no-JS, reduced motion, and
print read the full argument without touching anything. It speaks the node
kit's vocabulary, its propagation stagger is dropped (not the state) under
reduced motion, and its selection is keyboard-operable. Do not add a second
instrument; the singularity is what keeps it from reading as widgets.

One figure carries the duration exception: the long handoff (Fig 02) may scrub
its passage against scroll on fine viewports with motion allowed. Rebuilt
2026-07-17 (late) from a decorated nautical chart into a precise two-register
instrument after the map read as scenery: a straight time ruler whose spacing
lets the 1,910-year catalog-to-journal gap dominate the line, six finding-star
landfalls, a gold wake drawing with scroll, a minimal sail cursor at the route
head — and beneath it the record itself, a six-layer stack (the manifest words)
that takes one layer aboard per landfall, so the inherited object visibly grows.
No compass, no rhumb lines, no painted water: the scroll advances one mechanism
and the left world accumulates. The final leg remains dashed and open. This
exception extends to no other figure: it exists because Fig 02's subject is
elapsed time and handoff. Phones, reduced motion, no-JS, and print keep the
complete instrument with a static landfall ledger.

When a one-shot draw reveals a route in stages, keep a faint static substrate of
the complete route underneath it. The reader should understand the final causal
shape immediately; motion may explain its order, but must never temporarily make
the figure look broken or unfinished.

Section glyphs are miniature argument diagrams, not alternate logos. Each one
uses the Vela substrate grammar but assigns it a local operation: inheritance,
handoff, pressure, jurisdiction, writable continuation, governed state, plural
authority, or succession. They belong to the table of contents, where a compact
square construction makes chapters addressable along one continuous reading
route. They do not appear beside the literary section headings. The canonical
Vela mark remains reserved for identity and the closing resolution. Fig 01 may
use a literal working vessel as its explanatory object; it must read as passage
and inheritance, not as another stamped brand mark.

Hairlines should use ink or gold with opacity. Avoid thick side-stripe borders and decorative dividers.

## Components

**Masthead:** the horizon masthead — wordless, on every page. The in-flow header is a spacer that preserves flow; two fixed pieces do the work. The bar carries the sail alone (returning to `/`) over a paper gradient scrim that dissolves scrolled prose instead of clipping it; the bar hides while the reader moves down the page and returns on any upward scroll, and at the very top the scrim is transparent so the bar melts into the page. The former 2px horizon progress line was removed 2026-07-17: reading position lives in the rail on essay pages, and a second always-on meter read as redundant chrome — do not re-propose it. Reduced motion never hides the bar; capture mode hides the bar; print hides the masthead entirely. No wordmark, no text links, no menu: a lockup with a mono wordmark and one contextual text link was built and rejected the same day (2026-07-16) — the glyph-only mark is the decided register, and text in the masthead should not be re-proposed. The landing's night variant re-inks spacer, scrim, and horizon through the `.vela-wrapper[data-variant="custom"]` overrides. Crossings between pages are cross-document view transitions (pure CSS, no client router — every navigation is real and every page's scripts run from scratch): the sail persists and morphs across (300ms) while the root cuts instantly — a crossfade smeared night pages over cream and was removed 2026-07-18 — and reduced motion turns the whole thing off. The favicon carries a dark-scheme variant (night ground, paper sail) so the tab mark never vanishes on dark browser chrome. Use the full two-lineage construction reference at 32px and above and a hand-simplified sail for the favicon. Do not invent alternate route marks for publication surfaces.

**Browser and social identity:** every browser- and OS-facing asset uses the same Vela sail geometry and the canonical cream (`#F7F6F2`), ink (`#081224`), and gold (`#C9A664`). Keep SVG, PNG favicon, Apple touch, manifest, and pinned-tab exports synchronized. The social card may combine the exact sail with the essay's watercolor world, but must remain a true 1200×630 crop and carry readable Vela attribution. Never substitute the retired constellation polygon or an AI-redrawn sail.

**Hero:** title, subtitle, and image plate. No marketing eyebrow. No CTA cluster. The hero is an opening page, not a conversion module. It arrives once on first load — a small fade and 12-pixel settle mirroring the closing plate — then holds; no-JS and reduced-motion readers see the finished hero immediately.

**Section Heading:** a literary title and one quiet gold/ink rule beneath. Keep it free of navigational marks so the title leads directly into the prose without creating extra vertical dead space.

**Left Rail:** one quiet route with a compact semantic operation glyph and title for each section. Visited chapters warm slightly, the current glyph and title reach full ink, and future chapters remain quiet. The glyphs use a consistent square coordinate system and no enclosing cards. Do not reconstruct the Vela sail in the rail. The desktop rail sits toward the viewport edge and retracts its titles while a page-width figure occupies the reading field. On tablet, replace the rail with a compact current-section/contents disclosure at the top-left edge; on mobile, place that disclosure in flow before the prose. Hide either floating navigator while the immersive screen-width figure occupies the viewport so navigation never sits on top of the argument.

**Footnote Card:** progressively disclosed beside its inline marker through hover, focus, or a pinned click state. It uses fixed viewport positioning so wide figures and breakout layouts cannot push or clip it; the placement script clamps it to the viewport and flips it above the marker when needed. Phones use a bottom reference slip. It is reference infrastructure, not a decorative pull quote. Use a numbered index and quiet rule, preserve keyboard and Escape behavior, and never make hover the only access path.

**Figure Plate:** figure identity belongs in the caption below the visual. Technical figures use the numbered `Fig. NN. Title. Explanation.` caption format. Do not put figure numbers or explanatory captions inside SVGs.

**Image Plate:** emotional plates use generated or painted assets with deckled masks. They are not technical figures unless they carry exact labels, legends, or state. Section plates arrive once (fade and 12px settle on first entry, script-claimed hidden state, complete for no-JS, reduced motion, and print) so every painted plate on the page speaks the same arrival language as the hero and the close. Plate drift (a ≤7px scroll lag on the painted plates) was removed 2026-07-18: at that amplitude it sat below the perceptibility floor while costing a scroll loop and a transform channel. Plates hold still; atmosphere breathes by opacity, never by position.

**Technical SVG Diagram:** use web-native SVG/HTML when labels, legends, responsiveness, or captions need to remain exact. Keep internal typography sans, labels small but legible, and all text inside the visual free from essay-body inheritance.

**Record specimen:** one figure per essay may be a typeset HTML inspection artifact rather than an SVG diagram — a finding rendered as a catalog-card-crossed-with-a-commit (`--paper-1` ground, one hairline top rule, sharp corners, mono values, real published example only). Constellations' is Fig 05, the finding record. It holds the reading measure (`layout="column"`), following the VelaEventCode width case law, and is a deliberate change of medium in the middle run; it is a statement, not a widget (no controls, complete at rest). Its field labels are the manifest words.

**Landing (one day):** the editorial `/` landing crosses exactly one day: night hero, one dawn, a light body that never flickers, one dusk, night close. Two sky changes on the whole page — a page that flips registers more often strobes, no matter how smooth each gradient is. The dawns are `.vl-band` strips: a true smootherstep ramp (nine stops, zero slope at both edges) over ~68vh, a wide faint soft-gold warmth at the horizon, stars crossing on the night side, and adjacent content rising into the band so the transition happens behind words, never as an empty interlude. Dark objects during the day (the voyage map, the code panel) keep night interiors as framed instruments on the paper; sections themselves stay transparent over the page's single paper ground (any tint that stops at a section edge prints a seam — corner washes were cut twice). Decorated night sections wash to their pure register color before a band begins (seam guards), and bands overlap both neighbors by 1px. The lane is the observatory ledger: star-atlas instrument on the house's paper — never neon dev-tool. The hero's snapshot row reads as the horizon instrument, the last thing the night shows before dawn. The landing night carries the site's one sanctioned loop: three hero stars breathe on 11-13s cycles after arrival, reduced motion excluded — extend looping motion nowhere else.

**Closing Page:** a restrained return to the opening image language on the same cream reading paper as the essay. Constellations uses the existing painted horizon: the distant sail carries the essay's gold route into open water while the atlas arcs resolve above it. The plate enters once with a small fade and vertical settle; it never loops, changes the page background, introduces a separate end panel, or adds another Vela mark beneath the image. The plate itself stays untouched: the motif return happens beside it, not over it. Reduced motion and no-JavaScript states show the complete plate immediately. Hidden rail or balancing gutters must not leave empty grid rows between the final paragraph and the close.

**The chart handed on (colophon):** removed 2026-07-18. The drawn §9 colophon (`ChartHandedOn.astro`) that sat above the dedication was cut at Will's direction — a second ending image diluted the closing plate. The later dusk NightBand and private dedication were removed 2026-07-20 for the same reason: they created another ending after the final sentence and painted horizon. The closing plate is the sole ending image. Do not reintroduce an in-flow ending composition or a second coda after it.

## Case law

Rules paid for on 2026-07-10, written down so they are not paid for twice.

**Marks are content; atmosphere is ambient.** Discrete ink — dots, lines,
glyphs — appears only inside designed containers: figures, plates, the
reading rail, navigation. Full-page ambient layers must be edgeless
(heavily blurred wash only). The margin star atlas failed at every opacity:
perceptible marks collided with the rail, margin notes, and wide figures;
imperceptible marks were dead code. There is no vacant band in the margins
of a reading layout; do not paint marks into them.

**Perceptibility floor.** If an effect cannot be noticed by a reader, it
does not ship. Subtle is a register, not a hiding place. The original
ambient sky rendered near three percent effective alpha, was broken for its
entire life, and nobody could tell, because working and broken looked
identical.

**Adaptive behavior must be demonstrable.** Any system keyed to scroll,
time, or reading state must be verifiable as a measured value or screenshot
in the browser, not as intent in a comment. Every such system is listed in
`docs/living-systems.md` with its verification; add new ones there in the
same commit that ships them.

**Relocate, don't tune.** When feedback on an element is categorical
("this conflicts," "this does nothing"), a number change — opacity, size,
duration — is the wrong fix. Move the element's job to a medium that can
hold it, or delete it. The composing-sky story survived the atlas's
deletion by moving into the wash and the rail's visited trail.

**Density is the argument, so the density must read.** Rules paid for
2026-07-17. A cord (Fig 03) or a torrent (Fig 06) whose point is "many"
fails if its marks are individually faint: 78 hairlines at 0.3 opacity /
0.8px read as empty space, not as load. When a figure's argument is
count or convergence, the marks carry weight — legible opacity and a
stroke a notch above a reference line — and the count appears as
typographic mass (large mono numerals), not a whispered label.

**One language, varied — OVERTURNED "vary the medium" 2026-07-19.**
The vary-the-medium rule produced eight competing metaphors (weave,
soundings, weather-machine, network) and Will rejected most of them.
His named register (Fig 07) now governs: every figure is a
constellation-field variation — stars in open space, fine lines,
meaning carried by geometry and count. Variation lives INSIDE the
language (a strung line, a mist with one gold pair, a starfield over
one thread, reaches to different depths), never in a change of
metaphor. Do not reintroduce medium variety for its own sake.

**The geometry law — 2026-07-19, after 04/05/08 failed a third
time.** Speaking the register's vocabulary is not enough; the
GEOMETRY must be a sky's. The three figures that kept failing all
wore star costumes over diagram skeletons: three rays from a common
origin (a protractor), nine lines converging on one large disc (a
hub-and-spoke), a mirror-symmetric node lattice with a toggle and a
KPI readout (product UI). The loved figures share three structural
facts the failures lacked, now mandatory: (1) every figure sits in
a faint field — a hash-scattered background of quiet points, so the
drawing is a sky, not marks floating in blank; (2) joins run STAR
TO STAR in irregular chains and branches with bends — nothing
converges on a point, nothing mirrors, no ray bundles, no hubs, no
lattices; (3) no object breaks the motif scale — the brightest star
is bright by contrast (a FindingStar near scale 1, everything else
receded), never by size, and no UI chrome (toggles, readout bars,
stage headers) stands in for meaning that two line grammars can
carry in the drawing itself. Fig 08 is the proof: the frontier /
paper-trail toggle became one solid grammar and one dashed
citation line, both visible at rest, and the instrument's answer
moved into the sky as a small mono numeral.

**The scene law — 2026-07-19, after 04/05 failed a FOURTH time in
correct register geometry.** A figure must depict ONE PARTICULAR
SCENE OR EVENT, never a taxonomy and never an anatomy. Every
accepted figure is a particular: twelve visits, one record over
2,200 years, 39 proposals, one week, two hands, one worked
frontier. The two repeat-failures were abstractions in sky
costume: Fig 04 showed three labeled specimen asterisms side by
side (a legend of check-kinds — small multiples in disguise), and
Fig 05 showed the labeled parts of "a finding" (an anatomy — a
spec sheet however it is drawn, even with atlas nomenclature).
The fixes replaced the SUBJECT: 04 became one sky drawing itself
at the speed of its checks (join density as the claim), 05 became
the section's event — the correction landing, old star faded but
kept, successor stepping on along the same diagonal, dependents
ringed. Test before building: name the figure's subject in one
sentence — if it names a category system or a concept's parts
rather than something that happened somewhere, change the subject,
not the drawing.

**One sky, complete — 2026-07-19, Will's direction ("apply it to
all of them").** With the theme confirmed, every figure now sits
in the shared field grammar: a deterministic hash scatter of quiet
points (r 1.5, opacity ~0.16-0.45, bumped to r 2 under 560px)
behind the drawing, motif stars or field-scale marks as the only
objects, star-to-star joins, lowercase mono/sans labels. Fig 01
lost the essay's last timeline apparatus (2px baseline, outlined
discs, tick deposits, uppercase axis labels) and became the title
scene: the pattern overhead, twelve visits passing as a low track,
the recognition drawn at the twelfth. Fig 02 gained the static
field behind the strung record (the silence is sky empty of
landfalls, not empty paper). Fig 03 kept its mist as its sky but
its endpoints joined the mark grammar (39 open rings, 30 small
filled marks) and the last ground rule died. Baselines, axes,
outlined discs, and uppercase label systems are extinct in the
essay; do not reintroduce them.

## Do's and Don'ts

Do:

- Use `packages/brand/vela.tokens.json` before introducing any app-specific extension.
- Keep the palette restrained: cream, ink, gold, with semantic figure colors only when needed.
- Let images and diagrams carry meaning. Every visual should map to an argument beat.
- Keep prose width separate from figure width.
- Prefer open editorial layouts over cards.
- Use generated image plates for mood, atmosphere, and atlas language.
- Use HTML/SVG diagrams for exact technical labels, legends, responsive behavior, and figure captions.
- Check desktop, tablet, and mobile before calling visual work finished.

Don't:

- Do not make the site feel like generic SaaS, AI tooling, crypto, or dark-neon science fiction.
- Do not use gradient text, decorative bokeh, glass panels, or repeated icon cards.
- Do not add visible UI explaining how to use the essay.
- Do not put captions inside SVG diagrams when the figure caption below should carry the numbering and explanation.
- Do not make all diagrams share the same constellation-node shape if the section meanings differ.
- Do not let global essay typography leak into SVG labels.
- Do not add new sections, nav surfaces, or product affordances unless they serve the reading experience.

## Amendment 2026-07-20 · The open horizon (NightBand)

Constellations opens in night and resolves on the cream reading paper.
`NightBand.astro` is now an opening-only full-bleed sky band on the
`--fig-night` ground, dissolving into `--paper-0` through the shared
`.sky-fade` smootherstep. Its field is sparse and edge-weighted: fourteen
hand-placed stars leave silence around the title, while the Fig 01 trio
remains arranged but unjoined at the upper-right edge. The closing painted
horizon follows the final paragraph and ends the page. No dusk band,
star-field coda, dedication, rule, attribution, or Vela mark follows it.

This supersedes the closing half of the 2026-07-18 day arc. The return to
night and `for M.` were removed because they made the reader cross a second
threshold after the prose and painted horizon had already landed the ending.

Case law amendments:
- The sanctioned loop: the star-breathe keyframe (11-13s, alternate,
  opacity only) is permitted on three designated prelude stars, only after
  arrival, never under reduced motion, and nowhere else on the reading
  surface.
- The hero carries no kicker: the "no eyebrow, no cartouche" ruling
  stands (a family label above the night masthead was tried 2026-07-18
  and cut the same day). The essay carries no attribution mark beyond
  the masthead sail; do not re-propose one at either end.
- The masthead sail inverts to night ink (`data-ink="night"`) while
  over the prelude plateau; state, not motion.

## Amendment 2026-07-18 · One motion instrument

The essay's motion collapses onto one scale. Four durations: **160ms**
(micro feedback: hovers, traces, control presses), **240ms** (state
transitions: rail reveal, mast bar, era-follow), **420ms** (draws: rules,
threads, trio lines), **900ms** (arrivals: plates and pours). Two curves:
`--ease` for micro and transition, `--ease-arrive`
for draw and arrival. The hero and closing painted plates alone keep
`--dur-arrive` (1100ms) as plate weight. Two sanctioned loops: the opening
NightBand's star breathe and scroll-linked linear tracking (the Fig 02 sail).
Anything off this scale is a defect, not a nuance — nine easing curves
and thirty duration literals measured 2026-07-18 made every entrance a
different instrument.

One reveal geometry: entrance observers use `{ threshold: 0.1,
rootMargin: "0px 0px 25% 0px" }` (ClosingPage, SectionHeading).
The atlas controller's wide pre-trigger margin and
scrub geometry are choreography, not reveals, and keep their own values.

Staged cascades target ~0.9s of visibility (1.3s is the hard
bound; tightened 2026-07-19 after "still heavy and slow"): a reader
mid-scroll should never wait on a figure still assembling. Entrance
choreography animates GROUPS, not populations — a 150-mark rain
animates as 7 day-paths, a 78-filament weave settles as one — SVG
animations run on the main thread and a population of them stutters
scroll.

No runtime filters on reading surfaces (2026-07-19): `filter: blur`
holds full-viewport GPU layers alive, and `backdrop-filter` on a
fixed or sticky element re-renders the page beneath it every
scrolled frame. Bake softness into gradient stops; carry scrims
with near-opaque paper.

Subtraction rulings (2026-07-19, "nothing tangential"):
- The §1 "Three questions" aside was cut — it restated the thesis
  stated one line above it. Do not reintroduce an opening aside
  that paraphrases the essay's own claim.
- Footnotes open on click, Enter, or focus — never hover. Margin
  notes are 1–2 sentences; a citation is a coordinate, not an
  essay-within-the-essay.
- The scrolly rides ~1.6 viewports and lands its landfalls plainly:
  the pulse rings, title crossfade, and crossing beat were cut. A
  landfall is a fact, not a firework.
- Machinery ships only if a figure consumes it: the atlas
  controller is a visibility gate and an instant pin, nothing more.
- The §3 Chiang epigraph was cut 2026-07-19 and its line woven into
  the paragraph that discusses the story: a quote lands where the
  prose earns it, not as a gate before an argument that hasn't
  started. No section carries an epigraph; do not reintroduce one.

## Amendment 2026-07-19 · The bare standard

After nine passes the verdict on the annotation-rich instrument
register was categorical. Every figure now states ONE claim, and
any mark not serving that claim dies. The rules:

- ≤5 text elements inside the drawing. Data labels that ARE the
  object (stratum names, day letters, counts) count lightly;
  explanation labels count double.
- Sentence case; mono for numbers and ids only. No uppercase
  micro-label systems.
- Banned inside figures: kickers, header rows, margin rails,
  readout sentences, field/atmosphere decoration, secondary
  annotation lines, sub-labels under labels.
- The structured caption carries ALL reading instruction — the
  drawing never explains itself.
- Ink spans the box: every viewBox trims to its content bounds
  plus a uniform 8-unit frame, re-measured after any content
  change.

What died 2026-07-19 under this standard: the scrolly's entire
header (kicker, stage title, year odometer, wait line) and its
sky-wash/ripples; the finding record's masthead, six numbered
field labels, every sub-annotation, and the challenge slip (the
caption carries the story); the torrent's thirteen-element margin
rail (two placed numbers replace it) and document-only row; the
instrument's kicker, stage headers, node detail lines, and mono
readout sentence; the pour's band fill, review bracket, and source
lines; the soundings' and timeline's annotations and field curves;
the tracings' sheet rectangles. Display-count numerals survive —
the density law's numeral rule outranks minimalism. The bound applies to scroll-entered
cascades; load-time bookend arrivals (the hero, the dawn prelude)
carry plate weight and are exempt. Two literals sit deliberately off the scale and are
sanctioned by name: the Fig 02 sail's 110ms linear transform (the
smoothing filter of its scroll-linked tracking, not an entrance)
and the 300ms view-transition sail glide.

Typography note (2026-07-18): italic Newsreader is NOT preloaded.
Its first use is below the fold, the metric-matched Georgia
fallback holds layout (CLS ≈ 0), and 147KB would contend with the
night-prelude paint. Do not re-litigate without new evidence.
