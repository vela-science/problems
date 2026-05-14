---
version: "alpha"
name: "Constellate"
description: "A warm editorial atlas for essays about scientific state, inherited knowledge, and navigation after papers."
colors:
  primary: "#232B3A"
  on-primary: "#FCF8EE"
  secondary: "#4A5568"
  tertiary: "#C9A227"
  neutral: "#F8F2E5"
  neutral-raised: "#FCF8EE"
  neutral-sunken: "#F1E9D6"
  ink-strong: "#14191F"
  ink-muted: "#3A4555"
  gold-soft: "#E8D59E"
  gold-night: "#F2C670"
  cinnabar: "#B5443A"
  moss: "#59634E"
  brass: "#8A6A1F"
  winter: "#8FA7B7"
  stone: "#8A8176"
  night: "#1F2E45"
  night-deep: "#131E33"
typography:
  h1:
    fontFamily: "Cormorant Garamond"
    fontSize: "4.35rem"
    fontWeight: "500"
    lineHeight: "1.02"
    letterSpacing: "-0.005em"
  h2:
    fontFamily: "Cormorant Garamond"
    fontSize: "2.35rem"
    fontWeight: "500"
    lineHeight: "1.05"
    letterSpacing: "-0.005em"
  body-md:
    fontFamily: "EB Garamond"
    fontSize: "1rem"
    fontWeight: "400"
    lineHeight: "1.75"
    letterSpacing: "0em"
  body-lg:
    fontFamily: "EB Garamond"
    fontSize: "1.12rem"
    fontWeight: "400"
    lineHeight: "1.72"
    letterSpacing: "0em"
  caption:
    fontFamily: "EB Garamond"
    fontSize: "0.86rem"
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0em"
  note:
    fontFamily: "Inter Tight"
    fontSize: "0.68rem"
    fontWeight: "400"
    lineHeight: "1.46"
    letterSpacing: "0.005em"
  label-caps:
    fontFamily: "Inter Tight"
    fontSize: "0.72rem"
    fontWeight: "500"
    lineHeight: "1"
    letterSpacing: "0.18em"
  mono-index:
    fontFamily: "JetBrains Mono"
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
    textColor: "{colors.cinnabar}"
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

Constellate is a flagship reading surface, not a marketing site and not a product dashboard. The design register is warm editorial minimalism: cream paper, dark indigo ink, borrowed gold, restrained scientific marks, and generous negative space. The page should feel like an authored atlas plate inside a serious essay.

The primary design job is to help a technically literate reader stay oriented through a dense argument. Beauty matters, but it must come from hierarchy, rhythm, image quality, and diagram clarity rather than decoration. Scientific diagrams are part of the argument. They should make the essay more navigable, not merely illustrate its mood.

The physical scene is a long reading session on a laptop or tablet, likely in a quiet room, where the reader is willing to think but will leave if the interface feels like a pitch deck, a SaaS landing page, or an over-designed AI artifact.

## Colors

The canonical palette is cream, ink, and gold. Cream is the reading ground, ink is the primary carrier of thought, and gold is the navigational light accent. Gold should mark orientation, section identity, constellation lines, indexes, and fine emphasis. It should not become a button color sprayed across the page.

- **Primary (#232B3A):** body ink and the default color for serious claims.
- **Ink Strong (#14191F):** reserved for maximum contrast and rare anchoring moments.
- **Secondary (#4A5568):** captions, rail labels, ticks, and quiet metadata.
- **Neutral (#F8F2E5):** aged paper ground, warm but not beige-heavy.
- **Neutral Raised (#FCF8EE):** sheets, subtle surfaces, skip link, and image-adjacent lift.
- **Neutral Sunken (#F1E9D6):** hover and sunken paper states.
- **Tertiary (#C9A227):** borrowed gold. Use as a single accent, mostly in hairlines, glyphs, figure routes, margin indexes, and small active states.
- **Cinnabar (#B5443A):** rare correction or alert accent. It should read as editorial annotation, not error UI.
- **Moss, Brass, Winter, Stone:** semantic figure colors for replicated, contested, inferred, and stale states. Use inside diagrams, not as general brand colors.
- **Night / Night Deep:** dark-mode atmosphere and edge canvas. Avoid neon or high-saturation AI aesthetics.

Do not use pure black or pure white. Do not introduce a second dominant accent without first reducing gold. If a new section feels flat, improve its composition before adding color.

## Typography

The typographic system is deliberately literary, with a technical counterweight.

- **Cormorant Garamond** carries titles, section headings, and figure title fragments. It should feel like a chapter opening, not ornamental display type.
- **EB Garamond** carries the essay body and captions. It is the voice of the argument.
- **Inter Tight** carries navigation, uppercase metadata, margin notes, and diagram labels. It prevents the page from becoming too antique.
- **JetBrains Mono** carries indexes, code-like state, figure coordinates, and numbered references.

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

Glyphs should read as scientific sigils: simple gold nodes, thin connecting lines, and enough semantic distinction to work at 30px in the rail. They should track the essay's argument:

- Inheritance: first light.
- Pattern: scattered points becoming legible.
- Substrate: layered state beneath the surface.
- Constellation: navigable field structure.
- Contact With Reality: experiment and feedback loop.
- Arrival: destination, horizon, and resolved bearing.

Hairlines should use ink or gold with opacity. Avoid thick side-stripe borders and decorative dividers.

## Components

**Hero:** title, subtitle, and image plate. No marketing eyebrow. No CTA cluster. The hero is an opening page, not a conversion module.

**Section Heading:** title on the left, glyph on the right, one quiet gold/ink rule beneath. The glyph is identity, not decoration. The heading should not create extra vertical dead space.

**Left Rail:** quiet table of contents with glyph plus title. Active state can strengthen opacity and gold glow, but the rail must never compete with the prose.

**Margin Note:** visible in the right margin on desktop, inline toggle on smaller screens. It is reference infrastructure, not a decorative pull quote. Use sans text, numbered index, and a thin rule.

**Figure Plate:** figure identity belongs in the caption below the visual. Technical figures use the numbered `Fig. NN. Title. Explanation.` caption format. Do not put figure numbers or explanatory captions inside SVGs.

**Image Plate:** emotional plates use generated or painted assets with deckled masks. They are not technical figures unless they carry exact labels, legends, or state.

**Technical SVG Diagram:** use web-native SVG/HTML when labels, legends, responsiveness, or captions need to remain exact. Keep internal typography sans, labels small but legible, and all text inside the visual free from essay-body inheritance.

**Closing Page:** a quiet return to the opening image language. It should feel like the final breath of the reading experience, not a dramatic poster.

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
