# `@vela/ui`

Private shared React source for the Vela design system.

- Official shadcn `base-nova` source over Base UI owns generic interaction.
- `components.json` is the only primitive installation configuration.
- Shared Vela components are limited to stable scientific presentation
  semantics and demonstrated cross-application compositions.
- Application shells, route tables, graph instruments, and editorial
  compositions remain in their owning application until reuse is real.

Workspace applications import this package directly through its package
exports. `components.json` is the only shadcn configuration; there is no
second component catalog or installable Vela registry.

Licensed Tailwind Plus source may be adapted for Vela end products inside this
private repository. App-local use is the default. A reused adaptation may enter
`@vela/ui` with provenance, but it remains tied to the private Vela product and
is never redistributed separately.

See [`../../docs/design-system.md`](../../docs/design-system.md).
