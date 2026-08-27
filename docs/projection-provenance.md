# Problems product provenance

`apps/problems` is the canonical implementation extracted from the historical
private `vela-web` line. The archived `vela-site` repository was studied at commit
`34e3f20` for product anatomy: its inset shell, collapsible navigation,
contextual header, dense ledgers, metadata rail, command palette, and stable
deep-link behavior.

No unrelated Git history was merged and no archived component was copied
wholesale. The old repository contained several generations of duplicate UI
(`components/ui`, `components/ui2`, route-specific primitives, and retired
Atlas/campaign surfaces); those are evidence, not dependencies. Generic
interaction now comes from the single shadcn/Base UI source in `packages/ui`.
The surviving application owns only product composition, controllers, and
specialized instruments under `src/components`.

Scientific facts and roots are not ported from the archived application. They
are projected from the canonical repository Git repositories into a read-only
Neon database after Vela replay and root checks. The database is rebuildable;
the Git repositories and signed event histories remain canonical.
