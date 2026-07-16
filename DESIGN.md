---
version: "0.1.0"
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
    width: "12.25rem"
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

**Precedence:** where this document conflicts with `src/styles/tokens.css`,
tokens.css wins. It is the single source of truth for colors, type, motion,
radii, and spacing; this document describes and motivates it. After changing
tokens, update this file in the same commit.

Vela is a house of connected public chambers: a flagship reading surface, two companion essays, a technical paper, and denser catalog, protocol, stack, and facility views. None should collapse into a conversion funnel or generic product dashboard. The design register is light editorial instrumentation: mineral cream paper, dark indigo ink, directional gold, restrained scientific marks, and generous negative space. Painted plates carry atmosphere; technical figures use baselines, trajectories, nodes, lineage, convergence, and terminal axes to make state change legible.

The primary design job is to help a technically literate reader stay oriented through a dense argument. Beauty matters, but it must come from hierarchy, rhythm, image quality, and diagram clarity rather than decoration. Scientific diagrams are part of the argument. They should make the essay more navigable, not merely illustrate its mood.

The physical scene begins with a technically literate reader entering a long reading session in a quiet room, with adjacent routes available when they want the working app or a denser technical surface. They will leave if the publication feels like a pitch deck, a SaaS template, or an over-designed AI artifact.

## Typography note: metric-matched fallbacks

Every webfont stack carries a metric-matched local fallback face
("Newsreader-fallback" over Georgia, "Schibsted-fallback" over Arial,
"Inter-fallback" over Helvetica Neue) with empirically measured
size-adjust and ascent/descent overrides, so the font-display: swap
never shifts layout — text set in the fallback occupies the same
space the webfont will claim. The overrides live in fonts.css; if a
family changes, re-measure (canvas advance width + font bounding
box) rather than guessing.

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
- **Schibsted Grotesk** is the product voice on `/vela`: a clean, wind-cut sans for the adoption surface, used with IBM Plex Mono for coordinates and commands. It does not replace the literary essay typography.
- The desktop reading rail uses the compact `--text-rail` step and keeps section names on one line. Below 1320 pixels it becomes the glyph-only bearing before those labels can enter the prose column.

Technical SVG labels use one shared viewBox scale: `--diagram-label-xs` at 9px for compact secondary annotations, `--diagram-label-sm` at 10px for gates and axes, `--diagram-label` at 11px for primary stations and state roots, and `--diagram-title` at 15px for the rare serif station name. These are diagram coordinates rather than browser text sizes; mobile compositions must still remove labels that would read as thumbnails.

Body copy should stay within a humane measure. Desktop prose should sit around 41.5rem. Tablet prose can be narrower than figure width; figures may expand, paragraphs should not. Body line-height should remain generous enough for dense prose, generally around 1.7 to 1.75.

Avoid dramatic one-line fragments unless the essay truly needs a hinge. Avoid product-copy rhythm. Do not use italics as a default way to make citations or notes feel literary; margin notes should be clear reference text.

## Layout

The page is a three-column reading system on wide screens: left orientation rail, center reading column, and right margin for Tufte-style notes. On smaller screens, the page collapses to a single reading column and margin notes become inline toggles.

Spacing should create reading rhythm, not isolated cards. Sections need consistent top and bottom breathing room. Figures and plates should use equal visual spacing above and below unless a specific narrative transition requires otherwise.

Core layout measurements:

- Prose measure: 41.5rem.
- Figure caption measure: 41.5rem on desktop, 34rem on tablet, and the
  available prose width on mobile.
- Wide figure measure: 48rem to 52rem depending on the component.
- Margin note width: about 12.25rem from 1440 pixels; a narrower 9rem band
  geometry serves the 1320–1439 lane so 1366 laptops still get floated notes.
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
from the brand handoff v1.1 and rebuilt across all seven Constellations
figures. The anatomy is the sail's own construction: a substrate
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
lane, panel, or propagation regime lets the others recede (Figs 01,
03, 04, 05, 06 — every comparison figure; Fig 02, the one statement
figure, stays still). It only re-weights what is already visible,
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

A night plate exists in the kit (`.bl-fig-night-plate`: night-deep
panel, 1px gold hairline, sharp corners, the plate div as the var
remap boundary for luminous structure and the dark-adapted quartet)
but no essay figure currently uses it: on the cream reading page a
dark panel reads as an embedded widget, so the same-sky chart returned
to paper. The plate remains available for a surface that is dark by
nature, and captions never enter it.

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

One figure carries the duration exception: the long handoff (Fig 01) may scrub
its draw against scroll on fine viewports with motion allowed, pinning near the
viewport centre while scroll distance maps to elapsed time and a gold year
cursor runs 245 BC to the proposed frontier. Nearly half its stage passes inside
the 1,910-year catalog-to-journal silence, because the wait is the argument and
scroll is the only channel that can make a reader feel duration. This exception
extends to no other figure: it exists because Fig 01's subject IS elapsed time.
Phones, reduced motion, no-JS, and print all keep the complete resting figure
with its one-shot arrival.

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
sail remains reserved for identity and the closing resolution.

Hairlines should use ink or gold with opacity. Avoid thick side-stripe borders and decorative dividers.

## Components

**Masthead:** the horizon masthead — wordless, on every page. The in-flow header is a spacer that preserves flow; two fixed pieces do the work. The bar carries the sail alone (returning to /vela) over a paper gradient scrim that dissolves scrolled prose instead of clipping it; the bar hides while the reader moves down the page and returns on any upward scroll, and at the very top the scrim is transparent so the bar melts into the page. The horizon is a 2px line on the viewport's top edge whose gold fill is reading position on any page with scroll range; it never hides and drifts with the time-of-day gold. Reduced motion never hides the bar and the horizon keeps filling (position is state); capture mode hides both fixed pieces; print hides the masthead entirely. No wordmark, no text links, no menu: a lockup with a mono wordmark and one contextual text link was built and rejected the same day (2026-07-16) — the glyph-only mark is the decided register, and text in the masthead should not be re-proposed. The landing's night variant re-inks spacer, scrim, and horizon through the `.vela-wrapper[data-variant="custom"]` overrides. Crossings between pages are cross-document view transitions (pure CSS, no client router — every navigation is real and every page's scripts run from scratch): the sail and the horizon line persist and morph across, the rest crossfades over 320ms, and reduced motion turns the whole thing off. The favicon carries a dark-scheme variant (night ground, paper sail) so the tab mark never vanishes on dark browser chrome. Use the full two-lineage construction reference at 32px and above and a hand-simplified sail for the favicon. Do not invent alternate route marks for publication surfaces.

**Browser and social identity:** every browser- and OS-facing asset uses the same Vela sail geometry and the canonical cream (`#F7F6F2`), ink (`#081224`), and gold (`#C9A664`). Keep SVG, PNG favicon, Apple touch, manifest, and pinned-tab exports synchronized. The social card may combine the exact sail with the essay's watercolor world, but must remain a true 1200×630 crop and carry readable Vela attribution. Never substitute the retired constellation polygon or an AI-redrawn sail.

**Hero:** title, subtitle, and image plate. No marketing eyebrow. No CTA cluster. The hero is an opening page, not a conversion module. It arrives once on first load — a small fade and 12-pixel settle mirroring the closing plate — then holds; no-JS and reduced-motion readers see the finished hero immediately.

**Section Heading:** a literary title and one quiet gold/ink rule beneath. Keep it free of navigational marks so the title leads directly into the prose without creating extra vertical dead space.

**Left Rail:** one quiet route with a compact semantic operation glyph and title for each section. Visited chapters warm slightly, the current glyph and title reach full ink, and future chapters remain quiet. The glyphs use a consistent square coordinate system and no enclosing cards. Do not reconstruct the Vela sail in the rail. The rail must remain above sticky figures without competing with the prose.

**Margin Note:** progressively disclosed in the right margin on desktop through hover, focus, or a pinned click state; inline toggle on smaller screens. It is reference infrastructure, not a decorative pull quote. Use sans text, numbered index, and a thin rule. Never make hover the only access path.

**Figure Plate:** figure identity belongs in the caption below the visual. Technical figures use the numbered `Fig. NN. Title. Explanation.` caption format. Do not put figure numbers or explanatory captions inside SVGs.

**Image Plate:** emotional plates use generated or painted assets with deckled masks. They are not technical figures unless they carry exact labels, legends, or state. Section plates arrive once (fade and 12px settle on first entry, script-claimed hidden state, complete for no-JS, reduced motion, and print) so every painted plate on the page speaks the same arrival language as the hero and the close. The hero and section plates carry plate drift: they lag the page by up to 7px while scrolling, the one continuous scroll-linked motion allowed outside the background wash, because it layers ink over sky without ever animating an argument. Reduced motion never enters it, and the closing plate is excluded: the final breath holds still.

**Technical SVG Diagram:** use web-native SVG/HTML when labels, legends, responsiveness, or captions need to remain exact. Keep internal typography sans, labels small but legible, and all text inside the visual free from essay-body inheritance.

**Landing (one day):** the /vela landing crosses exactly one day: night hero, one dawn, a light body that never flickers, one dusk, night close. Two sky changes on the whole page — a page that flips registers more often strobes, no matter how smooth each gradient is. The dawns are `.vl-band` strips: a true smootherstep ramp (nine stops, zero slope at both edges) over ~68vh, a wide faint soft-gold warmth at the horizon, stars crossing on the night side, and adjacent content rising into the band so the transition happens behind words, never as an empty interlude. Dark objects during the day (the voyage map, the code panel) keep night interiors as framed instruments on the paper; sections themselves stay transparent over the page's single paper ground (any tint that stops at a section edge prints a seam — corner washes were cut twice). Decorated night sections wash to their pure register color before a band begins (seam guards), and bands overlap both neighbors by 1px. The lane is the observatory ledger: star-atlas instrument on the house's paper — never neon dev-tool. The hero's snapshot row reads as the horizon instrument, the last thing the night shows before dawn. The landing night carries the site's one sanctioned loop: three hero stars breathe on 11-13s cycles after arrival, reduced motion excluded — extend looping motion nowhere else.

**Closing Page:** a restrained return to the opening image language on the same cream reading paper as the essay. Constellations uses the existing painted horizon: the distant sail carries the essay's gold route into open water while the atlas arcs resolve above it. The plate enters once with a small fade and vertical settle; it never loops, changes the page background, or introduces a separate end panel. Reduced motion and no-JavaScript states show the complete plate immediately. Hidden rail or margin lanes must not leave empty grid rows between the dedication and the close. The sail exit is a real crossing: beneath the plate, one small wordless sail links to /vela — the page's final mark and its only exit, arriving a beat after the plate settles. It should feel like the final breath of the reading experience, not a promotional poster.

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

## Do's and Don'ts

Do:

- Use the existing tokens in `src/styles/tokens.css` before inventing new values.
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
