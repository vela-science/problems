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

The Vela sail, Zodiak/Gambetta/Switzer/IBM Plex Mono typography, Cajal-like scientific
drawing, exact rooted facts, and authority boundary remain project-owned. New
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
