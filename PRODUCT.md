---
register: brand
---

# Design Context

## Audience

- Technically literate researchers, founders, and serious readers
- People who can handle dense ideas, but still need the interface to reduce friction

## Tone

- Restrained
- Lucid
- Trustworthy
- Concrete before abstract

## Aesthetic Direction

- Warm editorial minimalism
- Japanese influence: ma, wabi-sabi, quiet asymmetry, deliberate negative space
- Scientific diagrams as first-class visual language, not decoration
- Interfaces should feel authored, not productized for growth loops

## Product Rules

- The site-level identity is Vela; the essays sit underneath it.
- `www.vela.space` is the editorial register. Its `/` route is the authored Vela home, and Constellations remains intact at `/constellations`.
- `app.vela.space` is the product register. It is a read-only scientific-state instrument for exact frontier, work, review, finding, replay, search, and product-guidance routes.
- The two applications are independently deployed surfaces of one Web product. They share brand and exact generated data, never framework-specific UI or duplicated canonical routes.
- The public editorial path is Home → Constellations → Observatory. `/essays`, Whitepaper, Stack, and Facility remain durable routes, but they do not compete with that primary path.
- Constellations is the entry document. `/manifesto` was retired 2026-07-25 and now permanently redirects to it; `/case` was removed entirely. Neither may return to primary navigation or current copy.
- Every publication surface should feel like an adjacent chamber in the same house, not a separate microsite.
- The Vela sail is the Home affordance, unaccompanied by wordmark text, so navigation carries no separate Home link and the bar holds one mark and one wayfinding row. Primary navigation contains Constellations and Open Observatory, which fit every width without a menu. Architecture and source links live in durable routes and the footer.
- Navigation should be calm, explicit, and complete on desktop and mobile.
- Use open editorial sections by default; reserve bordered panels for dense structured material
- Keep dated protocol snapshots on the pages that own them, and update their source links and dates together.
- The Observatory must preserve accepted, pending, rejected, withdrawn, replayed, verified, and strict-blocked as different states.
- The website never signs, mutates a frontier, or interprets verifier success as scientific acceptance.

## Product Story

Vela has one five-step path: produce → preserve → check → decide →
reuse. A workbench or optional Canopus runner produces candidate work. A
canonical frontier Git repository preserves it. Vela checks and replays it.
Signed policy or a protected human decision decides accepted state. The
Observatory and other replaceable readers support reuse.

Every Web feature must serve the reuse step. It may explain, search, compare,
or reproduce rooted state. It may not become a producer, canonical store,
verifier, signer, or authority.

## Anti-Patterns

- Generic SaaS cards as the dominant layout language
- Dark neon AI aesthetics
- Over-explained UI
- Duplicated chrome
- Dashboard framing on pages that are fundamentally for reading
- Marketing chrome inside the Observatory
- A second frontier parser, bundle generator, search index, or deployment-manifest implementation
- Scroll-reactive or route-specific mastheads; editorial chrome is stable and shared
- Parallel publication registries, catalogue components, or manually copied release facts
