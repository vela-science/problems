# `@vela/ui`

Private shared React source for the Vela design system.

- Official shadcn `base-nova` source over Base UI owns generic interaction.
- `components.json` is the only primitive installation configuration.
- Shared Vela components are limited to stable scientific presentation
  semantics and demonstrated cross-application compositions.
- Application shells, route tables, graph instruments, and editorial
  compositions remain in their owning application until reuse is real.

Workspace applications import this package directly. `registry.json` is a
private, product-bound inventory for this monorepo and future private Vela
applications. It records the approved source; it is not an installer, public
registry, separately published UI library, or second implementation.

Licensed Tailwind Plus source may be adapted for Vela end products inside this
private repository. App-local use is the default. A reused adaptation may enter
the internal registry with provenance, but it remains tied to the private Vela
product and is never redistributed separately.

See [`../../docs/design-system.md`](../../docs/design-system.md).
