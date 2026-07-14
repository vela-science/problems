---
version: "alpha"
name: "Vela"
description: "A light editorial atlas for essays about scientific state, inherited knowledge, and navigation after papers."
colors:
  primary: "oklch(26.5% 0.035 262)"
  on-primary: "oklch(98.3% 0.017 88)"
  secondary: "oklch(43.5% 0.030 258)"
  tertiary: "oklch(70.5% 0.118 87)"
  tertiary-ink: "oklch(46.8% 0.102 82)"
  tertiary-line: "oklch(78.5% 0.072 88)"
  neutral: "oklch(97.2% 0.013 88)"
  neutral-raised: "oklch(98.8% 0.008 88)"
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
  night: "oklch(29% 0.050 260)"
  night-deep: "oklch(21% 0.048 260)"
typography:
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
    width: "36rem"
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

Vela is a flagship reading surface, not a marketing site and not a product dashboard. The design register is light editorial instrumentation: mineral cream paper, dark indigo ink, directional gold, restrained scientific marks, and generous negative space. Painted plates carry atmosphere; technical figures use baselines, trajectories, nodes, lineage, convergence, and terminal axes to make state change legible.

The primary design job is to help a technically literate reader stay oriented through a dense argument. Beauty matters, but it must come from hierarchy, rhythm, image quality, and diagram clarity rather than decoration. Scientific diagrams are part of the argument. They should make the essay more navigable, not merely illustrate its mood.

The physical scene is a long reading session on a laptop or tablet, likely in a quiet room, where the reader is willing to think but will leave if the interface feels like a pitch deck, a SaaS landing page, or an over-designed AI artifact.

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
- **Moss, Brass, Winter, Stone:** semantic figure colors for replicated, contested, inferred, and stale states. Use inside diagrams, not as general brand colors.
- **Night / Night Deep:** dark-mode atmosphere and edge canvas. Avoid neon or high-saturation AI aesthetics.

Do not use pure black or pure white. Do not introduce a second dominant accent without first reducing gold. If a new section feels flat, improve its composition before adding color.

## Typography

The typographic system is deliberately literary, with a technical counterweight.

- **Newsreader** (display cuts, high optical size) carries titles, section headings, and figure title fragments. It should feel like a chapter opening, not ornamental display type.
- **Newsreader** (text cuts) carries the essay body and captions. It is the voice of the argument.
- **Inter** carries navigation, uppercase metadata, margin notes, and diagram labels. It prevents the page from becoming too antique.
- **IBM Plex Mono** carries indexes, code-like state, figure coordinates, and numbered references.

Technical SVG labels use one shared viewBox scale: `--diagram-label-sm` at 10px for secondary gates and axes, and `--diagram-label` at 11px for primary stations and state roots. These are diagram coordinates rather than browser text sizes; mobile compositions must still remove labels that would read as thumbnails.

Body copy should stay within a humane measure. Desktop prose should sit around 41.5rem. Tablet prose can be narrower than figure width; figures may expand, paragraphs should not. Body line-height should remain generous enough for dense prose, generally around 1.7 to 1.75.

Avoid dramatic one-line fragments unless the essay truly needs a hinge. Avoid product-copy rhythm. Do not use italics as a default way to make citations or notes feel literary; margin notes should be clear reference text.

## Layout

The page is a three-column reading system on wide screens: left orientation rail, center reading column, and right margin for Tufte-style notes. On smaller screens, the page collapses to a single reading column and margin notes become inline toggles.

Spacing should create reading rhythm, not isolated cards. Sections need consistent top and bottom breathing room. Figures and plates should use equal visual spacing above and below unless a specific narrative transition requires otherwise.

Core layout measurements:

- Prose measure: 41.5rem.
- Wide figure measure: 48rem to 52rem depending on the component.
- Margin note width: about 12.25rem.
- Desktop left rail appears only when it helps orientation, fades near the top and ending, and should remain quiet.
- Mobile figures can use nearly full viewport width, but text labels inside SVGs need mobile-specific simplification when they become thumbnails.

The hero should reveal the essay soon enough that the reader understands there is a substantial argument below. Do not let the hero become a landing-page billboard.

## Elevation & Depth

Depth is mostly atmospheric, not card-based. Use paper texture, deckled image masks, soft radial glow, and hairlines. Shadows should be rare, shallow, and ink-tinted.

The dominant surface should remain flat paper. Figures should not sit inside decorative cards. Image plates should dissolve into the page through masks rather than borders. Technical diagrams can have internal structured surfaces, but the outer frame should stay editorial.

Avoid glassmorphism, blur panels, heavy drop shadows, and framed section bands. If depth is needed, prefer a 1px hairline, a small opacity shift, or a gentle paper lift.

## Shapes

Shapes are print-shaped and sharp. Use no radius or tiny radius. Rounded rectangles are not part of the main visual language except for functional affordances such as skip links or small controls.

Technical figures share one state-substrate grammar. A baseline establishes inherited state; trajectories carry claims, evidence, or lineage; nodes mark addressable findings or decisions; apertures expose shared conditions without implying equivalence; terminal axes mark changes in jurisdiction or ownership; parallel paths preserve plurality; gaps make missing context visible. Each figure must assign those marks a local semantic job rather than repeating a decorative route motif. Gradients may encode continuity, uncertainty, or density, but should not provide ambient decoration. Do not copy the provisional Vela symbol or use decorative star fields as a substitute for relationships.

Editorial bearings use the Vela substrate, convex route, lineage echo, and
terminal axis. They accumulate section by section instead of swapping among
unrelated constellation glyphs. At rail scale, the active route must remain a
quiet orientation signal; it must not expand into a decorative miniature
diagram or acquire a glow.

Hairlines should use ink or gold with opacity. Avoid thick side-stripe borders and decorative dividers.

## Components

**Masthead:** the canonical Vela sail mark, the Vela wordmark, and quiet essay context. Use the full two-lineage construction reference at 32px and above and a hand-simplified sail for the favicon. No unfinished route links or product navigation. Do not invent alternate route marks for publication surfaces.

**Browser and social identity:** every browser- and OS-facing asset uses the same Vela sail geometry and the canonical cream (`#F7F6F2`), ink (`#081224`), and gold (`#C9A664`). Keep SVG, PNG favicon, Apple touch, manifest, and pinned-tab exports synchronized. The social card may combine the exact sail with the essay's watercolor world, but must remain a true 1200×630 crop and carry readable Vela attribution. Never substitute the retired constellation polygon or an AI-redrawn sail.

**Hero:** title, subtitle, and image plate. No marketing eyebrow. No CTA cluster. The hero is an opening page, not a conversion module.

**Section Heading:** title on the left, one accumulating Vela bearing on the right, and one quiet gold/ink rule beneath. The bearing shows how much of the route has been inherited; it is not a repeated star ornament. The heading should not create extra vertical dead space.

**Left Rail:** quiet table of contents with the same compact accumulated bearing plus title. Active state strengthens opacity and one gold point; it does not add glow or shadow. The rail must remain above sticky figures without competing with the prose.

**Margin Note:** progressively disclosed in the right margin on desktop through hover, focus, or a pinned click state; inline toggle on smaller screens. It is reference infrastructure, not a decorative pull quote. Use sans text, numbered index, and a thin rule. Never make hover the only access path.

**Figure Plate:** figure identity belongs in the caption below the visual. Technical figures use the numbered `Fig. NN. Title. Explanation.` caption format. Do not put figure numbers or explanatory captions inside SVGs.

**Image Plate:** emotional plates use generated or painted assets with deckled masks. They are not technical figures unless they carry exact labels, legends, or state.

**Technical SVG Diagram:** use web-native SVG/HTML when labels, legends, responsiveness, or captions need to remain exact. Keep internal typography sans, labels small but legible, and all text inside the visual free from essay-body inheritance.

**Closing Page:** a quiet return to the opening image language. On Constellations, the accepted Figure 7 route arrives once, becomes a mast and sail at a light horizon, then holds still. It should feel like the final breath of the reading experience, not a dramatic poster.

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
