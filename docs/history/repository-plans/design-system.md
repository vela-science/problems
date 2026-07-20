# Constellate design system — motifs, principles, components

**Status:** 2026-05-27 · Drafting · For Will's review before further UI work
**Purpose:** A canonical doc that names the design vocabulary so every
component decision derives from the system rather than being invented
on the fly. The dropdown UX problem is downstream of not having this doc.

---

## 1. The starting point

The Constellate visual identity is already partly defined:

- **Cajal-meets-Kawase** — anatomical/scientific drawing married to
  Japanese watercolor. Restrained, considered, never decorative for
  decoration's sake.
- **Cream paper + deep navy + luminous gold** — printed-page register,
  not screen-default register.
- **Cormorant Garamond + EB Garamond + JetBrains Mono** — display +
  body + small-caps respectively.
- **Hairline gold rules** as the dominant separator.
- **Watercolor plates + constellation motifs** as the dominant imagery.

The gap: there's no codified set of *motifs* and *interaction
patterns* that components inherit. So each component (the dropdown,
the catalog piece, the stack diagram) keeps reinventing what gold
hairlines and constellation nodes mean.

This document closes that gap.

## 2. Design principles

These are non-negotiable. Every component decision is checked against
these.

**Ma (間) — negative space is content.** Whitespace is not "empty"; it
is the rest the eye takes between forms. Components should breathe.
Cramping is a design failure.

**Restraint over ornament.** No decorative element earns its place
unless it carries meaning. Gold dots are not pretty; they are stars.
Hairline rules are not borders; they are horizons.

**Hairline weight.** Lines are 1px or less. Borders are soft, not
assertive. The page asserts itself through whitespace and typography,
not chrome.

**Editorial first.** Typography carries the design. Cards, buttons,
panels are containers for type, not the object of attention.

**Trust the reader.** Minimal UX chrome. No "click here," no
oversized affordances, no defensive copy. The reader is sophisticated.

**Wabi-sabi.** Beauty in imperfection, asymmetry, the texture of
paper. The site should feel hand-printed, not lithograph-perfect.

**Living register.** Where motion exists, it is slow, ambient, and
purposeful. The page breathes; it does not perform.

## 3. The motif library

These are the canonical visual elements. Every component is composed
from this library. Inventing a new motif means adding it here first.

### 3.1 Hairline gold rule

A horizontal or vertical 1px line in gold-line tint with a fade-out
gradient at both ends. The signature separator.

- Variants: full-width (masthead, section dividers), inset (item
  separators), vertical (column separators)
- Opacity: 38-55% gold-line tint at the dense midsection
- Use: any place where the eye needs a gentle pause between forms

### 3.2 Constellation node

A small gold-filled circle representing a "star" in the constellation
network. Roughly 4-8px depending on scale. Pairs with the constellation
watercolor motif.

- Variants:
  - Plain dot (filled gold)
  - Dot with halo (filled + faint ring)
  - Active dot (filled luminous gold + drop-shadow glow)
- Use: only where the constellation network metaphor is load-bearing.
  Not as decoration. Examples: a small map of corridors, a TOC entry
  in the trilogy, a node on a federation diagram. **Not appropriate
  for nav dropdowns** — there is no "constellation" meaning there.

### 3.3 Tracing line

A dotted or dashed gold line connecting constellation nodes. Echoes
the network arcs in the trilogy watercolors.

- Variants: short straight, long curved
- Use: only where the constellation network metaphor is in play.
  Mathematical: nodes-and-arcs. Not appropriate as a divider on a nav
  panel.

### 3.4 Hanko mark

A Japanese seal-style red-orange square stamp (cinnabar token) used
sparingly for a single decisive mark — "accepted," "you are here,"
or a signature gloss in the margin. Reads as the painter's stamp on
a Kawase print.

- Variants: small (≤ 1rem square), with a single character or initial
  inside in mono
- Use: extremely rare. Reserved for moments where one stamp says it
  all. Examples: signed-by-maintainer indicator on a published
  transition, the "current page" mark in a long table of contents.

### 3.5 Margin gloss

Small italic display text set in the right margin of a long-form
column, set in a quieter ink. The Tufte side-note moved into the
Constellate register.

- Use: annotations on essays. **Not in nav.**

### 3.6 Plate caption

JetBrains Mono small caps below or beside an image, naming the plate
and its source. Editorial-print register.

- Use: ImagePlate captions, FigurePlate footers, any place an image
  needs to be cited.

### 3.7 Paper surface

A subtly textured cream background that reads as printed paper rather
than screen pixel. Achieved via paper-0 and paper-1 layered with a
faint warm gradient.

- Variants: page paper (paper-0), raised card paper (paper-1, slight
  contrast lift), gold-tinted anchor paper (paper-1 + gold-soft for
  emphasis bands like the substrate row in the stack diagram)
- Use: every container surface. The page is never solid white or
  flat grey.

### 3.8 Soft watercolor edge

A fuzzy faded edge on illustrated plates and some cards, made by
gradient masks rather than hard rectangular crops.

- Use: ImagePlate when the image's watercolor edge should bleed into
  the page rather than crop.

### 3.9 Walking-foot indicator

A thin horizontal underline that draws in from left to right over
~180ms when an element is hovered or activated. Like a fountain-pen
trace across a line of text.

- Variants: ink-2 tint, gold-ink tint
- Use: links in essays, dropdown items, anywhere an interactive
  element wants to telegraph "this is active without ornament."
  This is the right move for nav dropdown hover affordance.

### 3.10 Section glyph

A small constellation-inspired ideogram that names a section. Already
in use in the essay TOC.

- Variants: inheritance, pattern, substrate, constellation, contact,
  crossing, engine, body, etc.
- Use: section headings only. Not in nav.

## 4. Component patterns — derivation

Each common component is composed from the motif library. If a
component needs a motif not on the list, the motif gets added to §3
before the component is built.

### 4.1 Section heading
- Hairline gold rule (top)
- Section glyph (left of title)
- Display italic title
- Optional kicker in mono small caps

### 4.2 Card (catalog piece)
- Paper surface (paper-1 with hairline gold inset)
- Optional cover plate with soft watercolor edge
- Body: kicker (mono small caps) → italic display title → body subtitle
- Hover: very slight transform-lift + walking-foot underline on title

### 4.3 Margin note
- Margin gloss (italic display in right margin)
- Connecting hairline tick from the body column

### 4.4 Link in prose
- Underline = walking-foot indicator
- Color: ink-1, decoration color gold-line
- Hover: decoration thickens slightly

### 4.5 Nav dropdown — proposed pattern (replaces current implementation)

**Trigger:**
- Label in mono small caps (existing)
- Caret in gold-ink, rotates 180° when open
- Open state: hair-thin walking-foot underline draws under the label
  in gold-ink (180ms left-to-right). Not a static border — a *motion*
  that signals the panel is now in front of the page.

**Panel:**
- Paper surface (paper-1) with a soft watercolor edge along the top
  (the panel is set on the page, not cut from the page)
- A single hairline gold rule across the top of the panel — the same
  motif as the masthead rule below, mirrored. The panel reads as a
  small page hanging below the masthead.
- No box-shadow. The panel does not float; it sits on the same
  paper. (Replace card-shadow with a *very* faint warm halo behind
  the panel: 0 1px 0 + 0 20px 40px -30px at extremely low opacity,
  enough to lift the edge but not to read as a SaaS card.)
- Width: comfortable for the longest item title with 2rem horizontal
  padding. No artificial minimum.

**Items:**
- Roman display, 0.96rem (no italic — italic is reserved for titles
  in a reading context, not nav)
- Generous padding: 0.8rem vertical, 1.1rem horizontal
- One item per row, full width
- Hover: walking-foot underline draws in below the title in gold-ink.
  No background fill. No transform. The underline IS the affordance.
- Active page: walking-foot underline stays drawn, in gold (luminous
  variant, not gold-ink), at full width. The active item also gets
  a tiny hanko-style mark — a 4px gold square in the right margin
  of the item — to signal "you are here." This is the only place
  the hanko motif appears in the nav.

**Bridge:**
- Panel sits with no visible gap from the trigger; a small invisible
  hover bridge prevents the panel from closing as the cursor moves
  from trigger to panel.

**Open / close:**
- Open: 180ms fade-in + 4px upward translate
- Close: 220ms grace period after mouseleave (hover-intent)
- Click outside closes immediately
- Esc closes and returns focus to trigger

**Spacing between Essays and Papers dropdowns:**
- 2.4rem (clamp 1.6-2.8rem responsive)
- No vertical divider between them. They are two distinct labels in
  the masthead, not a paired control.

## 5. What this means for the current state

The dropdowns I have shipped have iterated through three failure
modes:
1. Over-engineered card menu with kickers, subtitles, and box-shadows
2. Plain hairline list (generic, no motif character)
3. Constellation thread with star nodes (motif used where it doesn't
   apply — there is no constellation meaning in a nav)

The proposed pattern (§4.5) uses the *walking-foot underline* motif
as the primary affordance — a motif that does apply to nav (signals
interaction the way a pen traces a line) — and the *hanko mark*
sparingly for active-page indication. No constellation nodes, no
italic titles, no card shadow, no thread.

## 6. Implementation order

1. Land this doc (now)
2. Add §3.9 walking-foot indicator and §3.4 hanko mark as new motif
   tokens / utility classes in `src/styles/`
3. Rebuild the nav dropdown against §4.5
4. Audit existing components for adherence — update where the
   pattern was invented inline (essay TOC active indicator, catalog
   piece hover, etc.)
5. Add §4.5 (and other patterns) as Astro components that compose
   the motifs, so future components are built from the library
   rather than reinvented

## 7. What I will not do without explicit sign-off

- Add new motifs beyond §3 without updating this doc first
- Use any motif outside its named applicability (no constellation
  nodes in nav, no hanko marks as decoration, no margin gloss in UI
  chrome)
- Add box-shadows that read as SaaS cards. Constellate panels sit on
  paper, they do not float in front of it.
- Use italic outside of reading-register contexts (titles, captions,
  margin gloss). Italic is not a UI accent.
- Use any color outside the established token set

## 8. Open questions for Will

- Is the *walking-foot underline* the right name and right motion for
  the hover affordance? (Alternative: *trace*, *underscore-draw*,
  *gloss-line*.)
- Does the *hanko mark* fit your aesthetic, or is the cinnabar red
  too loud against the cream/gold palette? (Alternatives: gold dot,
  small gold bracket, no mark.)
- Should the panel really sit with no shadow (motif: pure paper) or
  is a *very* subtle warm-glow lift permitted as a "page slightly
  raised off page" cue?
- For the trigger label, do you want to keep mono small caps or move
  to a quieter display register (small Cormorant, regular weight)?

---

## Status log

- **2026-05-27 (drafted):** Design system articulated. Motif library
  named. Nav dropdown pattern proposed in §4.5. Awaiting Will's
  review on the four open questions in §8 before implementation.
