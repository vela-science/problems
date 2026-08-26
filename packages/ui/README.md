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
The governed private source catalog (`registry.json`, `lab/catalog.json`) is
not part of this repository. A catalogue of components is what the Tailwind Plus
and shadcn.io Pro licenses forbid publishing; the application that uses those
components is what they permit.

Licensed Tailwind Plus and shadcn.io Pro source may be adapted for Vela end
products. App-local use is the default. A reused adaptation may enter
`@vela/ui` with provenance, but `@vela/ui` is application source: it is never
published to a package registry or distributed apart from the product.

See [`../../docs/design-system.md`](../../docs/design-system.md).
