# Editorial reference ledger

This ledger records outside patterns studied for `www.vela.space`. References
inform composition and interaction; they are not runtime dependencies, copied
templates, or visual identities.

| Reference | Adopted | Adapted | Rejected |
| --- | --- | --- | --- |
| [Synthetic Sciences manifesto](https://syntheticsciences.ai/#thesis) | A short identity statement followed by numbered theses | Vela uses five theses tied to durable state, explicit authority, and demonstrated limits | Startup proof points, investor copy, and product-specific visual styling |
| [21st.dev editorial patterns](https://21st.dev/community/components/s/editorial) | Image-led hierarchy, asymmetric publication rhythm, restrained metadata | Implemented natively with the existing Vela tokens and asset pipeline | React packages, copied component code, bento layouts, and decorative library artifacts |
| [Arc Institute](https://arcinstitute.org/) | Scientific confidence, generous editorial pacing, clear institutional voice | Warm paper, exact evidence, and direct routes into the working product | Institutional imitation, generic laboratory photography, and oversized marketing claims |
| [Tailwind Plus](https://tailwindcss.com/plus/templates) — licensed 2026-07-28 | `Container`, `text` (Heading/Subheading/Lead), `Button` variants, and `PlusGrid` from **Radiant**, adapted into `components/ui` | Radius pinned to the two sanctioned steps, shadow ramp flattened, Headless UI `data-hover` replaced with hover/focus-visible, `PlusGrid` re-pointed at `--rule-3`/`--gold-line` | Radiant's page composition wholesale — bento grids, logo cloud, testimonials, gradient hero — and its Sanity CMS. `AnimatedNumber` was ported and then removed: a spring arriving at an exact count reads as marketing on a page whose claim is exactness |
| Framer marketplace (Solra and the Documentation category), surveyed 2026-07-28 | Nothing | Nothing | Surveyed and declined. Solra's homepage is Hero → Intro → Features → Trust → Pricing → FAQ → CTA; removing the three sections Vela cannot honestly show leaves Hero → Features → CTA. The 147-template Documentation category and the `science` and `research` searches returned no template in this register |

The Vela sail, Zodiak/Gambetta/Switzer/IBM Plex Mono typography, Cajal-like scientific
drawing, exact rooted facts, and authority boundary remain project-owned. New
references must be added here with a clear adopted/adapted/rejected decision.

Licensed template source is kept outside every working tree, at
`~/personal/tailwind-plus`. The licence permits unlimited projects but not
redistribution, so adapted code may enter this repository and raw template
files may not.

## Image-generation review

The `v0.410.0` pass considered generated background art for the home,
Manifesto, and publication index. It was rejected because those surfaces
already have stronger, authored visual roles: the sail and exact proof object
on Home, typography-first theses on Manifesto, and source paintings in the
publication shelf. A generated atmospheric background would be decorative,
would compete with exact scientific objects, and would introduce an unrelated
image language. Future image generation is reserved for a named missing asset
with a structural job, not generic mood or filler.
