# Constellate

Static Astro site for the Constellate essay sequence:

```text
Record -> Engine -> Body
```

The first essay argues that science needs a shared record. The second specifies the engine that turns activity into governed state transitions. The third asks whether that engine reaches the physical world as an open public body or as closed private bodies first.

## Source of Truth

- Record essay source: `src/content/essays/constellations/index.mdx`
- Engine essay source: `src/content/essays/discovery-engine/index.mdx`
- Body essay source: `src/content/essays/terafactories/index.mdx`
- Shared reading UI: `src/components/essay/chrome/*` and `src/components/essay/blocks/*`

## Commands

**Node requirement:** use Node `>=22.14.0` (see `.nvmrc`). Older Node versions can fail Astro builds with `URL.canParse is not a function`.

Example:

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
node -v
bun run check:launch-surface
bun run build
```

## Routes

- `/`: *Constellations of Borrowed Light*, the shared-record essay
- `/discovery-engine`: *The Discovery Engine*, the transition-engine essay
- `/terafactories`: *The Terafactory Age*, the public-body essay

## Visuals

Visuals are web-native Astro/HTML/SVG components. Do not add a separate diagram generation or asset build pipeline.

## Launch And Review Docs

- `docs/trilogy-doctrine.md` defines the Record -> Engine -> Body frame.
- `docs/source-audit.md` tracks external citations and factual claim groups.
- `docs/figure-registry.md` tracks visual QA across desktop, tablet, and mobile.
- `docs/external-review-program.md` defines reviewer lanes and launch blockers.
- `docs/external-review-outreach.md` tracks the live reviewer outreach queue.
- `docs/reviewer-intake.md` lists the reviewer names/contact info needed before outreach.
- `docs/reviewer-candidate-shortlist.md` suggests possible reviewer profiles and names to consider.
- `docs/reviewer-emails.md` contains ready-to-send outreach drafts by lane.
- `docs/review-packets.md` contains lane-specific prompts ready to send.
- `docs/reviewer-claim-packet.md` lists the highest-priority claims for expert review.
- `docs/reader-validation-protocol.md` defines first-time reader sessions.
- `docs/feedback-workflow.md` defines feedback triage and closeout rules.
- `docs/review-feedback-log.md` records reviewer decisions and reader-session summaries.
- `docs/launch-package.md` contains reviewer and public launch copy.
- `docs/public-launch-readiness.md` tracks launch-blocking gates.
- `docs/active-goal-audit.md` maps the active launch goal to current evidence and gaps.
- `docs/version-log.md` records material public-facing changes.

## Deployment

- `bun run build` runs `astro build`.
- `bun run check:launch-surface` verifies that only the three trilogy pages are public routes.
- `bun run check:public-launch` verifies the simulated-review launch gates for the current release candidate. It does not claim real external reviewers were contacted.
- Build output stays untracked in `dist/`.
- `public/robots.txt` and `public/sitemap.xml` are the only crawler files.
- SEO metadata and JSON-LD live in `src/layouts/Base.astro`.

## CI

GitHub Actions runs:

- `bun install --frozen-lockfile`
- `bun run check:launch-surface`
- `bun run build`

See `.github/workflows/ci.yml`.
