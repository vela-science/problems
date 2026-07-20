# Active goal — Constellate site catalog redesign

**Status:** 2026-05-27 · v0.1, v0.2, v0.3 all shipped · Plan complete
**Owner:** Will Blair
**Target:** v0.1 shipped this week, v0.2 next week, v0.3 over the following month
**Linked artifacts:** `submissions/ifp-launch-sequence-pitch.md`

## Locked decisions (2026-05-27)

- **Layout:** vertical-scroll with weighted hierarchy. Not pure grid, not
  uniform vertical. Each piece has its own internal composition (Stripe
  Press's actual model). Trilogy pieces get large editorial spreads
  (~half-viewport each, cover dominant). Technical companions (Architecture,
  Pilot Plan, Specification, Stack) get a denser paired layout (two-up,
  smaller, more compact). The Facility gets a standalone treatment — full-width
  or paired with the Stack to make the spatial + structural duo. Total
  homepage: ~5-6 sections of vertical scroll, not 8 equal-weight cards.
- **Covers:** static at v0.1, trilogy living covers at v0.2, full living
  covers plus the Stack page at v0.3. The catalog structure is the
  high-uncertainty piece and ships first for fast validation; living covers
  compound a working catalog and follow once the structure is proven.
- **Watercolor commissions:** deferred. v0.1 uses existing assets plus interim
  stand-ins for the four pieces that need new covers. Commission decisions
  happen during v0.2 once the catalog is working.
- **Wordmark route:** `/` continues to be the home destination; the
  CONSTELLATE wordmark links there as today. No change.
- **Trilogy roman numerals (I · II · III):** keep them on the trilogy cards
  as a visual signal of series and reading order. Drop them from the top-level
  SiteNav — the catalog is the navigation surface now.
- **About page:** leaves unlinked at v0.1. Becomes the Foundation landing page
  when Constellate Foundation incorporates. Not before.

---

## 1. Overview

Restructure `constellate.science` from "one essay as homepage + linked deep
documents" to "Stripe Press–style catalog of artifacts as homepage + each
artifact at its own deep page." Keep the existing Cajal-meets-Kawase aesthetic.
Add living covers (subtle ambient motion per artifact) to signal that the
substrate is alive, not a frozen archive.

The site becomes a publishing-house surface for one intellectual project: the
substrate, the protocol, the corridor, the facility, the stack, and the
worldview that holds them together.

## 2. Strategic frame

**Why move from essay-as-homepage to catalog.** The current homepage is the
16-minute *Constellations of Borrowed Light* essay. That's right for the
audience that already reads long-form essays. It's friction for the cold reader
(foundation officer, IFP reviewer, journalist, potential second signer) who
wants to grasp the project's scope in 30 seconds before deciding whether to go
deep. The catalog gives both audiences what they need: a fast scan for cold
visitors, deep pages for engaged readers.

**Why Stripe Press as the model.** Stripe Press's site treats each book as a
cultural object worth design weight. Constellate's pieces (trilogy, whitepaper,
pilot plan, specification, facility, stack) are similarly cultural objects.
The aesthetic Constellate has already built — cream paper, deep navy, luminous
gold, Fraunces/Lyon serif, watercolor, constellation motifs — is the visual
language Stripe Press would use for this project if they ran a publishing house
for one science project. Adopting the catalog structure realizes the existing
aesthetic more completely; it does not adopt a foreign one.

**Why not Drake Related's room model.** Multi-room immersive navigation is the
wrong scale for an artifact-driven project whose audience is evaluators. Each
artifact needs to be linkable, citable, scan-able. Rooms work for an
entertainment property; they don't work for serious infrastructure documents.
One piece of Drake Related's principle is worth borrowing: each artifact gets a
*distinctive* treatment, not a template applied to interchangeable content.

**Why the book in 2028 informs the site in 2026.** The book is going to be a
Stripe Press (or Stripe-Press-adjacent) artifact. The site should rehearse the
destination. By the time Patrick Collison clicks through to
constellate.science, the visual logic should already feel like an extension of
his own imprint.

## 3. The catalog — eight pieces in three tiers

| # | Title | Category | Tier | Card size | Current route | Cover asset |
|---|---|---|---|---|---|---|
| 1 | Constellations of Borrowed Light | Record | Trilogy | Large editorial spread | `/` → moves to `/constellations` | existing sunset + sailboat + constellation arc watercolor |
| 2 | The Discovery Engine | Engine | Trilogy | Large editorial spread | `/discovery-engine` | existing brass-and-gold orrery watercolor |
| 3 | The Terafactory Age | Body | Trilogy | Large editorial spread | `/terafactories` | existing gigafactory-at-dusk watercolor |
| 4 | The Constellate Architecture | Architecture | Technical companion | Paired, denser | `/whitepaper` | NEW — interim stand-in: architecture stack diagram, SVG monochrome |
| 5 | The First Corridor Pilot Plan | Pilot Plan | Technical companion | Paired, denser | `/pilot-plan` | NEW — interim stand-in: small AD frontier sketch |
| 6 | The Vela Protocol Specification | Specification | Technical companion | Paired, denser | `/specification` | NEW — interim stand-in: typographic-only, spec metadata in serif |
| 7 | The Stack | Stack | Technical companion | Paired, denser | NEW `/stack` | NEW — built in v0.3; interim placeholder card at v0.1 |
| 8 | The Facility | Facility | Standalone | Full-width or paired with Stack | `/facility` | still frame from the 3D scene |

**Tiering visualizes the project's hierarchy.** The trilogy carries the moral
and conceptual argument and gets large editorial weight. The technical
companions are the apparatus — read after the trilogy, less visually dominant
but more numerous. The Facility is the immersive piece and sits apart.

The IFP Launch Sequence pitch is a *submission* artifact, not a catalog piece.
The Living Frontier book is a *future* artifact, not yet on the site.

## 4. Visual direction

**Aesthetic principles (already in place — preserve).**

- Cream paper background, luminous gold accents, deep navy text
- Fraunces / Lyon serif for display, JetBrains Mono for IDs and small caps
- Watercolor + constellation motif as the dominant visual language
- Restraint above all — whitespace, breathing room, single bold image per piece
- Trust the reader; no patronizing UX chrome

**Register target.** Museum shelf > technical journal. Each piece should feel
like a cultural artifact worth contemplation, not a database row to scan. The
literary register of the existing trilogy carries forward into the catalog
itself.

**References to hold alongside Stripe Press.**

- **MoMA's online collection** — artifact-as-cultural-object register
- **Are.na** — minimal text-forward, restraint above all
- **Cabinet magazine** — literary editorial with restrained ornament
- **Edward Tufte** — data + restraint as unified aesthetic
- **Pioneer Works** — art/tech/science museum, dual register

**What to avoid.**

- Tech-bro card UX (icons, feature bullets, buttons-as-call-to-action)
- Generic CSS hover animations as a substitute for bespoke motion
- Dense metadata cards (timestamps, tags, view counts)
- Anything that looks like Hacker News or arXiv frontmatter
- Excessive ornament — the project is restrained; the catalog should be too

## 5. Living covers

**Concept.** Each piece's cover has one piece of slow, purposeful, ambient
motion — not a GIF loop, not a video, not a generic CSS transition. The effect
is "this artifact is alive, current, breathing." The motion is *almost
imperceptible*; the reader catches it on a second look.

**Reference.** Stripe Press's living covers: rocket plumes on *Boom*, slow
parallax on *Working in Public*, candle flame on *Scientific Freedom*. Custom
canvas/SVG/CSS per book. Low-frequency, ambient, ~30 fps when active.

**Per-piece motion concepts.**

1. **Constellations of Borrowed Light** — Constellation arc draws across the
   sky over 30 seconds. Sun pulses imperceptibly. Boat drifts a few pixels
   toward the light over a minute.
2. **The Discovery Engine** — Outer ring of the orrery rotates once every
   two minutes. One marker lights up periodically.
3. **The Terafactory Age** — Lights in windows come on one at a time as a
   slow sequence, then fade to baseline. Day-night cycles imperceptibly.
4. **The Constellate Architecture** — Each layer label in the architecture
   diagram fades in then out in sequence from bottom to top, like an X-ray
   reveal. ~2-minute cycle.
5. **The First Corridor Pilot Plan** — Findings appear as dots over the
   cover; edges draw between them. The frontier filling in.
6. **The Vela Protocol Specification** — A content-addressed hash
   (`vf_06cfcbe7c449d86a` and similar) slowly types out and replaces itself.
7. **The Stack** — Each layer pulses in sequence from bottom to top, then
   back down. ~90-second cycle.
8. **The Facility** — Ambient camera drift on a still frame from the 3D scene,
   or a faint pulse on the building's central light.

**Build budget per living cover.** Roughly 4-8 hours each. Eight covers ~ 40-60
hours total. Phased delivery (see §7).

**v0.1 static fallback.** All covers ship as static images first. Living
treatments added incrementally in v0.2 and v0.3.

## 6. Structural changes — file by file

**Routes.**

- [ ] `src/pages/index.astro` — restructure to render the catalog, not the
      Constellations essay
- [ ] `src/pages/constellations.astro` (NEW) — render the Constellations essay
      that currently lives at `/`
- [ ] `src/pages/stack.astro` (NEW) — the visual stack page
- [ ] All other essay routes stay where they are

**Components.**

- [ ] `src/components/CatalogPiece.astro` (NEW) — the card for one artifact
- [ ] `src/components/CatalogGrid.astro` (NEW) — the catalog container
- [ ] `src/components/covers/LivingCover.astro` (NEW) — shared shell for
      living covers
- [ ] `src/components/covers/CoverConstellations.astro` (NEW v0.2)
- [ ] `src/components/covers/CoverDiscoveryEngine.astro` (NEW v0.2)
- [ ] `src/components/covers/CoverTerafactory.astro` (NEW v0.2)
- [ ] `src/components/covers/CoverArchitecture.astro` (NEW v0.3)
- [ ] `src/components/covers/CoverPilotPlan.astro` (NEW v0.3)
- [ ] `src/components/covers/CoverSpecification.astro` (NEW v0.3)
- [ ] `src/components/covers/CoverStack.astro` (NEW v0.3)
- [ ] `src/components/covers/CoverFacility.astro` (NEW v0.3)

**Nav.**

- [ ] `src/components/SiteNav.astro` — update wordmark route, simplify nav
      since the catalog itself is the navigation surface
- [ ] Decide whether trilogy roman numerals (I RECORD · II ENGINE · III BODY)
      stay in nav or move into the catalog cards

**Data.**

- [ ] `src/data/catalog.ts` (NEW) — single source of truth for the eight
      pieces (title, subtitle, category, href, cover component, description,
      action label)
- [ ] `src/data/constants.ts` — update SITE_TITLE / wordmark if needed

**Layouts.**

- [ ] `src/layouts/Base.astro` — verify it works for both essay and catalog
      contexts
- [ ] `src/layouts/CatalogLayout.astro` (NEW, optional) — wraps the catalog
      with appropriate nav and footer

**Styles.**

- [ ] `src/styles/global.css` — add catalog-specific tokens (card spacing,
      cover dimensions, motion timing)

**Assets.**

- [ ] `public/images/covers/` (NEW) — directory for cover assets
- [ ] Verify existing trilogy hero images can be cropped for cover use
- [ ] Identify covers that need new watercolor commissions (Architecture,
      Pilot Plan, Specification, Stack)

## 7. Phased build

### v0.1 — catalog structure with static covers (this week, ~1.5 days)

**Deliverables.**

- Homepage renders the weighted-hierarchy catalog: trilogy as three large
  editorial spreads, technical companions as a denser paired layout, Facility
  as standalone
- Each piece has a static cover (existing assets or interim stand-ins), title,
  subtitle, category mark, description, action link
- Trilogy roman numerals (I · II · III) on the trilogy cards as series marker
- Hover state on each card (subtle lift + gold hairline reveal)
- Click navigates to the deep page
- Constellations essay moves from `/` to `/constellations`
- SiteNav simplified (trilogy roman numerals removed from top-level; catalog
  is the navigation surface)
- Mobile responsive

**Acceptance.**

- `npm run build` passes clean
- All eight pieces (or 7 + Stack placeholder) render correctly on desktop and
  mobile
- All deep pages still work
- Cold reader can scan the project in under 30 seconds
- Engaged reader can read the trilogy in the same order as before (via
  `/constellations` → `/discovery-engine` → `/terafactories`)
- **Visual continuity test**: screenshot the new homepage and compare
  side-by-side with the current homepage. v0.1 should feel *clearly different
  in function* (cold reader sees scope in 30 seconds) but *clearly the same in
  voice* (literary, restrained, watercolor, Cajal-meets-Kawase). If the v0.1
  catalog feels like a different brand, undo and rework.

**Time box.** Maximum 1.5 days. If past day 2, ship what's there.

### v0.2 — trilogy living covers (next week, ~2-3 days)

**Deliverables.**

- Living-cover motion treatments for the three trilogy pieces (Constellations,
  Discovery Engine, Terafactory)
- Each cover is bespoke (not template + props) — distinctive motion per piece
- Performance: covers do not block page load; motion can be paused via
  `prefers-reduced-motion`
- Mobile: covers degrade gracefully or pause motion

**Acceptance.**

- Three trilogy covers visibly different in their motion
- Lighthouse performance score stays above 90 on the homepage
- Reduced-motion media query respected
- Visual review: covers feel ambient, not noisy

**Time box.** Maximum 3 days.

### v0.3 — remaining living covers + the Stack page (following month, ~5-7 days spread out)

**Deliverables.**

- Architecture, Pilot Plan, Specification, Facility living covers
- `/stack` page built and shipped with its living cover
- New watercolor commissions delivered for pieces that need them (if Will
  decides to commission)

**Acceptance.**

- All eight pieces have either static or living covers (no missing cover slots)
- `/stack` page lives and links to deep documents from each layer
- Visual review: catalog as a whole reads cohesively

**Time box.** Spread across 4-6 weeks, ~1 living cover per week.

## 8. Decisions resolved

All open decisions from the draft are now locked. See the "Locked decisions"
section at the top of this document. Summary:

- [x] **Layout:** vertical-scroll with weighted hierarchy (trilogy large,
      technical companions denser paired, Facility standalone)
- [x] **Covers timing:** static at v0.1; trilogy living covers at v0.2; full
      living covers + Stack at v0.3
- [x] **Watercolor commissions:** deferred; revisit during v0.2
- [x] **Wordmark route:** `/` keeps going to the home destination (now the
      catalog); CONSTELLATE wordmark unchanged
- [x] **Trilogy roman numerals:** keep on trilogy cards as series marker; drop
      from SiteNav top-level
- [x] **About page:** stays unlinked at v0.1; becomes Foundation landing when
      the entity incorporates

Smaller decisions that can be made during the build (not blocking):

- [ ] Whether the Facility card is full-width or paired with the Stack — try
      the paired layout first; switch to full-width if the spatial register
      gets crowded
- [ ] Exact card dimensions and spacing — let the v0.1 layout pass guide
      these rather than pre-spec
- [ ] Whether to include a small footer or imprint on the catalog page — add
      if needed for visual balance

## 9. Acceptance criteria — across the whole goal

The redesign is *done* when:

- A cold reader landing on `/` understands the project's scope in 30 seconds
- An engaged reader can navigate to any deep piece in one click from the
  catalog
- The catalog reads as a curated shelf, not a feature grid
- Each piece has its own visual presence (static or living)
- The IFP submission can link to specific pieces by URL without losing context
- Lighthouse performance ≥ 90 on the homepage
- Mobile responsive at the level of the current site
- All existing deep pages (trilogy, whitepaper, pilot plan, spec, facility)
  remain accessible and unchanged

## 10. Risks and traps

**Trap: getting precious about design.** Time-box ruthlessly. v0.1 ships in
1.5 days even if it's not pretty enough. Iterate after shipping. The biggest
risk is spending two weeks on the catalog while the protocol stagnates.

**Trap: losing the literary weight of the current homepage.** The Constellations
essay carries the project's moral argument. Demoting it to "one of eight" is a
real downside if the catalog doesn't carry weight. Mitigation: give the
Constellations card more visual weight than the others (slightly larger cover,
position at top of vertical scroll, "I — Record" mark prominent).

**Trap: living covers becoming a permanent backlog.** If they're not built
within 4-6 weeks of v0.1, ship a public commitment to "next quarter" rather
than letting them linger.

**Trap: the Stack page being deferred indefinitely.** The Stack is one of the
eight catalog pieces. If it doesn't ship within v0.3, the catalog visibly has
a hole. Build it within the v0.3 window.

**Trap: aesthetic drift toward tech-card UX.** Every design decision should be
checked against "does this look like a Stripe Press shelf or a SaaS pricing
page?" If the latter, undo.

## 11. Out of scope

- The umbrella ecosystem essay (handled by the catalog itself; no separate
  essay needed)
- Star/social-proof widgets (intentionally none)
- Newsletter signup (Constellate doesn't have a newsletter; don't fake one)
- Comments, share buttons, social-media metadata cards (the artifacts speak;
  no engagement chrome)
- A search interface (the catalog is the index)
- Multi-language (English only for v1)
- Author bio / personal landing page (the work speaks; the author surfaces
  only in submitter blurbs on external pitches)

## 12. What ships first

Decisions are locked. Build order:

**Pre-work (~30 min)**

1. Scaffold `src/data/catalog.ts` with all eight pieces (title, subtitle,
   category, tier, href, cover ref, description, action label, roman numeral
   for trilogy)
2. Identify interim stand-in cover assets for pieces 4-7 (architecture stack
   diagram for whitepaper; small frontier sketch for pilot plan; typographic
   composition for spec; placeholder card for Stack)

**Day 1 (~6 hours)**

3. Build `src/components/CatalogPiece.astro` (one card component with tier-aware
   layout — large for trilogy, denser for technical companions, standalone for
   Facility)
4. Build `src/components/CatalogGrid.astro` (vertical-scroll container with
   weighted hierarchy)
5. Create `src/pages/constellations.astro` to host the current homepage essay
6. Replace `src/pages/index.astro` content with the catalog
7. Update `src/components/SiteNav.astro` (drop trilogy roman numerals from
   top-level; keep CONSTELLATE wordmark)
8. Wire all eight cards with their interim covers

**Day 2 (~4 hours)**

9. Hover states (subtle lift + gold hairline reveal)
10. Mobile responsive (trilogy cards stack vertically; paired companions become
    single-column on narrow viewports)
11. `npm run build` and verify all routes work
12. Visual continuity test: screenshot v0.1 homepage and compare against current
    homepage. Confirm aesthetic continuity holds (literary, restrained,
    watercolor); confirm functional change holds (cold reader sees scope in
    30 seconds)
13. Commit and push

That's v0.1 shipped within 1.5 working days.

Living covers (v0.2) start the following week, beginning with Constellations
since it has the strongest existing cover asset and the highest weight in the
catalog.

---

## Status log

- **2026-05-27 (drafted):** Plan drafted. Two open decisions awaiting Will's input.
- **2026-05-27 (locked):** All decisions resolved. Vertical-scroll with weighted
  hierarchy; static covers at v0.1; trilogy living covers at v0.2; full living
  covers + Stack at v0.3. Ready for v0.1 build.
- **2026-05-27 (v0.1 shipped):** Catalog homepage rendered. 8 pieces across
  three tiers (trilogy / companions / facility). Constellations essay moved to
  `/constellations`. SiteNav simplified — trilogy roman numerals dropped from
  top-level; CATALOG link added. Static covers wired using existing watercolors
  (hero, engine, gigafactory, contact, frontier-map, arrival, gigafactory-dawn)
  plus a typographic placeholder for the Stack card. `npm run build` clean
  (10 routes). Visual continuity test passed.
- **2026-05-27 (v0.2 shipped):** Trilogy living covers added.
  `LivingCoverConstellations` (twinkling stars + rising sparks), `LivingCoverDiscoveryEngine`
  (rotating orrery ring + pulsing marker), `LivingCoverTerafactory` (windows
  lighting up in sequence). All respect `prefers-reduced-motion`. Build clean.
- **2026-05-27 (v0.3 shipped):** `/stack` page built with six-layer ecosystem
  diagram (`src/data/stack.ts`, `src/components/stack/StackDiagram.astro`,
  `src/pages/stack.astro`). Substrate layer rendered with anchor treatment.
  Remaining five living covers added via `LivingCoverCompanions.astro`
  (architecture scan-line, pilot-plan twinkling findings, specification
  rotating hash, stack pulsing bands, facility horizon glow). Stack catalog
  card flipped from placeholder → live (`Inspect` action). `npm run build`
  clean (11 routes). Plan complete.
