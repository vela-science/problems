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
- The two applications share brand and exact generated data, never framework-specific UI or duplicated canonical routes.
- The public editorial path is Home → Manifesto → Trilogy → Architecture. Constellations remains the flagship reading experience; `/essays` is the publication index, not a product catalogue.
- `/manifesto` is the concise entry document. `/case` is a permanent legacy redirect and must not return to primary navigation or current copy.
- Every publication surface should feel like an adjacent chamber in the same house, not a separate microsite.
- The Vela sail and wordmark are the clearly labeled Home affordance. Primary navigation contains only Essays and Open Observatory; Manifesto is a home-page and publication-index entry, while architecture and source links live in the publication index and footer.
- Navigation should be calm, explicit, and complete on desktop and mobile.
- Use open editorial sections by default; reserve bordered panels for dense structured material
- Keep dated protocol snapshots on the pages that own them, and update their source links and dates together.
- The Observatory must preserve accepted, pending, rejected, withdrawn, replayed, verified, and strict-blocked as different states.
- The website never signs, mutates a frontier, or interprets verifier success as scientific acceptance.

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
