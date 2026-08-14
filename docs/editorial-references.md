# Editorial reference ledger

This ledger records outside patterns studied for `www.vela.space`. References
inform composition and interaction; they are not runtime dependencies, copied
templates, or visual identities.

| Reference | Adopted | Adapted | Rejected |
| --- | --- | --- | --- |
| [Synthetic Sciences manifesto](https://syntheticsciences.ai/#thesis) | A short identity statement followed by numbered theses | Vela uses five theses tied to durable state, explicit authority, and demonstrated limits | Startup proof points, investor copy, and product-specific visual styling |
| [21st.dev editorial patterns](https://21st.dev/community/components/s/editorial) | Image-led hierarchy, asymmetric publication rhythm, restrained metadata | Implemented natively with the existing Vela tokens and asset pipeline | React packages, copied component code, bento layouts, and decorative library artifacts |
| [Arc Institute](https://arcinstitute.org/) | Scientific confidence, generous editorial pacing, clear institutional voice | Warm paper, exact evidence, and direct routes into the working product | Institutional imitation, generic laboratory photography, and oversized marketing claims |
| [Tailwind Plus](https://tailwindcss.com/plus/templates) — licensed 2026-07-28 | `Container`, text roles, `Button` variants, and `PlusGrid` from **Radiant**, adapted into the private www application | Radius pinned to the sanctioned steps, shadow ramp flattened, Headless UI state replaced where shared shadcn/Base UI behavior is sufficient, and `PlusGrid` re-pointed at Vela rules | Radiant's page composition wholesale — bento grids, logo cloud, testimonials, gradient hero — and its Sanity CMS. `AnimatedNumber` was ported and then removed: a spring arriving at an exact count reads as marketing on a page whose claim is exactness |
| Framer marketplace (Solra and the Documentation category), surveyed 2026-07-28 | Nothing | Nothing | Surveyed and declined. Solra's homepage is Hero → Intro → Features → Trust → Pricing → FAQ → CTA; removing the three sections Vela cannot honestly show leaves Hero → Features → CTA. The 147-template Documentation category and the `science` and `research` searches returned no template in this register |

**Amended 2026-07-31.** A second pass took Radiant's *grammar* rather than
more of its components: `Container`, the `Eyebrow`/`Heading`/`Lead` type
roles, a `Section` rhythm and a `BentoCard`-derived `Card` with a graphic
well, all in `components/editorial/sections.tsx` on Vela tokens and the Vela
shell. Radiant's page composition stays rejected on the original grounds —
hero into feature into bento into logo cloud into testimonials into pricing,
four of which this product cannot fill without inventing claims.

Adopted at the same time, from the repository's own `packages/ui` rather than
from a template: the official shadcn/Base UI primitives now render this
application's buttons, badges, sheet, command palette and copy control. `www`
had carried vendored Tailwind Plus equivalents for all five while
`apps/observatory` already used the shared library. Protocol remains the
documentation shell; its search, mobile navigation, tag and button are gone.

**Amended 2026-07-31, landing rebuild.** Salient, Primer and Radiant were read
end to end for the home page and **all three rejected as page compositions**.
Salient is Hero → Features → CTA → Testimonials → Pricing → FAQs; Primer is
Hero → Intro → TOC → Testimonial → Screencasts; Radiant adds bento and a logo
cloud. Every one is built to sell a product to many buyers using social proof,
and four of those section types cannot be filled here without inventing claims.

What replaced them is not another template but the product's own material,
read out of the protocol repository: the tagline the README and `vela --help`
both carry, the install line, the six-verb loop from `docs/TERMINOLOGY.md`, the
"Required distinctions" block, and the boundary summary table from
`paper/vela.md`. The reference class for a page like this is
developer-infrastructure documentation, not a marketing template — lead with
the claim, the install command and the real commands; differentiate with a
comparison the project already wrote; close on what is not established.

`docs/TERMINOLOGY.md` is an enforced dictionary with a banned list, so landing
copy is quoted rather than paraphrased and is checked against that list.

The Vela sail, system Iowan/Baskerville editorial roles, Switzer/IBM Plex Mono
interface roles, Cajal-like scientific drawing, exact rooted facts, and
authority boundary remain project-owned. Zodiak and Gambetta remain licensed
delivery assets but are no longer selected on current WWW surfaces. New
references must be added here with a clear adopted/adapted/rejected decision.

The complete licensed archive stays at `~/personal/tailwind-plus` to avoid
vendoring an unused catalogue. Selected source and adaptations may enter this
private Vela end product with provenance. They are not published separately as
a template, component library, or public registry, and source access remains
within the licensed person or team.

**Amended 2026-08-04, Observatory application patterns.** Work and Attention
adapt Tailwind Plus Application UI v4's conventional multi-column shell and
stacked-list composition; Activity adapts its simple feed structure. The
implementation uses the existing shadcn/Base UI `Item`, `Sheet`, `Button`,
`Select`, `StatusBadge`, and `CopyButton` primitives and Vela tokens. It adds no
template-owned component layer, Headless UI runtime, or new visual hierarchy.

**Amended 2026-08-05, the six Repository surfaces.** Four adaptations from
Tailwind Plus Application UI v4, all licensed for this repository, all carrying
their provenance in a comment at the point of use:

- `lists/stacked-lists/08-two-columns-with-links` → the source-binding rows on
  the Repository Overview. Taken: the row-wide link and a right-justified
  secondary column that collapses under the primary at narrow widths. Rebuilt
  on the shared `Item`/`ItemGroup`, Hugeicons, semantic tokens and `next/link`;
  the chevron affordance dropped. Heroicons, the avatar column and the raw gray
  ramp were not taken.
- `lists/stacked-lists/03-with-links` → the problem ledger row. The anchor's
  `::after` covers a positioned `Item` so the statement is the row's only link,
  which is what let two per-row ghost buttons come off 1,217 rows without
  nesting interactives. Its Heroicons and Headless UI are not used. This
  supersedes the 2026-08-04 amendment's "stacked-list composition", which did
  not record the overlay.
- `lists/tables/07-with-stacked-columns-on-mobile` → the Proposal sweep's
  parameter table. Taken: the `hidden md:table-cell` fold. Vela folds at `md`
  rather than `sm`, because five mono integers and a badge do not fit at 640px
  and a wrapped integer is a misread integer.
- The claims toolbar's range-of-total sentence (`Showing 51–100 of 2,782`) is
  Tailwind Plus phrasing, adapted.

The retired Targets surface added no independent licensed pattern. The Dossier collection
took no overlay, so the stretched-link row above does not extend to it — with
three links per cell and two paragraphs of triage prose meant to be read, an
overlay makes that prose unselectable and adds no tab stop the title does not
already give.

**Amended 2026-08-05, home page rebuilt in the essay register.** The 0.436
landing — chart, loop ring, command tour, required distinctions, boundary
table, opened claim, boundary ledger — is gone. It was true throughout and it
said all of it at once, which made an entry point read as a second manifesto
beside the one already published at `/constellations`. The page now carries
four bands, one argument each, at the interval and in the type the essay reads
at: the published repositories on a night plate, the five-act loop in prose, one
copyable install-and-read block, and three routes out. Copy is still quoted
from the protocol repository and every count still comes from the committed
projection.

The reference for the new page is `/constellations` itself, in this
repository. One outside mechanic was adapted: Marketing UI v4
`feature-sections/07.simple-three-column-with-small-icons`, for the closing
routes — equal columns, each a flex column whose description takes `flex-auto`
so the trailing action aligns across columns of unequal text. Its Heroicon was
dropped for the hairline the band heads carry, its indigo and gray ramps for
`--ink-*` and `--gold-*`, and its anchors for `next/link`. Nothing else of that
section was taken; no template source is committed. Radiant's `Container` and
`Section` from `components/editorial/sections.tsx` continue to carry the shell
and the band rhythm.

The rest of that grammar went with the old page. `Eyebrow`, `Heading`, `Lead`,
the composed `SectionHeader`, and the `BentoCard`-derived `Card` all lost their
last consumer in the rebuild and are removed; the 2026-07-31 amendment above
stands as the record of what was adapted then. What Radiant contributes to this
application today is the container and the section rhythm, and nothing else —
the essay register sets its own type. Removed with them:
`components/StarField.tsx`, the Commit/Protocol star field, which was drawn
`fill="white"` for a dark ground and never found a surface in this palette. The
`motion` dependency it used stays — the vendored Protocol shell imports
`motion/react` in three places (`Header.tsx`, `Layout.tsx`, `Navigation.tsx`).
It was four until `components/protocol/Heading.tsx` was removed on 2026-08-05:
that template component registered MDX headings, and this app has no MDX
pipeline, so `RegisterHeadings.tsx` feeds the section store from the rendered
DOM instead and nothing ever mounted it.

**Amended 2026-08-12, scientific-atlas gateway.** The personal site at
`williamjblair/williamjamesblair` was reviewed at exact commit
`6805155bd8e9df1cedc322c525ed4d96bcd17fde`. Vela adopts its cinematic pacing,
not its code or identity: a midnight canopy gives way to a physical reading
surface and returns to a quiet horizon, with one memorable instrument and
almost no persistent chrome. The personal constellation, biography, palette,
manual routing, giant client component, and global stylesheet were all
rejected. Vela keeps its own paintings, exact projection, editorial type, and
shared `@vela/ui` source.

The new Home composition also adapts three private shadcn.io Pro grammars
already reviewed for the Vela registry: an asymmetric headline frame, an
indexed scientific sequence, and a pipeline step diagram. Their demo content,
generic cards, arbitrary colour, Lucide icons, load choreography, and fabricated
metrics were removed. The resulting components are app-local editorial
compositions over Vela tokens, Hugeicons, the shared Button and CopyButton, and
real projection values. The protocol-corridor animation describes workflow,
not scientific progress, and becomes static under reduced motion.

## Image-generation review

The `v0.410.0` pass considered generated background art for the home,
Manifesto, and publication index. It was rejected because those surfaces
already have stronger, authored visual roles: the sail and exact proof object
on Home, typography-first theses on Manifesto, and source paintings in the
publication shelf. A generated atmospheric background would be decorative,
would compete with exact scientific objects, and would introduce an unrelated
image language. Future image generation is reserved for a named missing asset
with a structural job, not generic mood or filler.

**Amended 2026-07-31.** The `/constellations` opening now carries a drawn
sky behind the title (`components/essay/hero-sky.tsx`). The 0.410.0
finding stands as written and this does not overturn it: nothing here is
generated, and it is not a background image. It is authored SVG in the
essay's own hairline vocabulary, seeded so it is identical between
builds, and it exists because the opening had a real compositional
problem — the title, and an illustration of a sky under it, with the
whole upper right of the first screen empty. It shares the register of
the painting it sits above rather than introducing a second image
language. The rule it is held to is in DESIGN.md: behind the type, no
labels, no quantities, does not print, and never mistakable for a figure.
