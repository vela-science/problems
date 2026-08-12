# `@vela/ui`

Private shared React source for the Vela design system.

- Official shadcn `base-nova` source over Base UI owns generic interaction.
- `components.json` is the only primitive installation configuration.
- Shared Vela components are limited to stable scientific presentation
  semantics and demonstrated cross-application compositions.
- Application shells, route tables, graph instruments, and editorial
  compositions remain in their owning application until reuse is real.

Workspace applications import this package directly through its package
exports. `components.json` is the only primitive installation configuration.
`registry.json` is the governed private source catalog, and `lab/catalog.json`
adds agent-readable review scenarios derived from its item names. Neither is
exported, served, or copied into an application.

Licensed Tailwind Plus source may be adapted for Vela end products inside this
private repository. App-local use is the default. A reused adaptation may enter
`@vela/ui` with provenance, but it remains tied to the private Vela product and
is never redistributed separately.

See [`../../docs/design-system.md`](../../docs/design-system.md).
