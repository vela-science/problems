# Vela Recommended Frontend and Design-System Stack

**Decision summary, 15 July 2026**

## Canonical architecture

- **Components:** shadcn/ui open-code and registry model
- **Primitives:** Base UI
- **Advanced accessibility:** React Aria Components, selectively
- **Styling:** Tailwind CSS 4
- **Tokens:** DTCG-compatible JSON, CSS variables, Style Dictionary when multiple outputs are required
- **Variants:** Class Variance Authority, `clsx`, `tailwind-merge`
- **Icons:** Lucide plus a custom Vela scientific-state icon set
- **Server state:** TanStack Query
- **Tables and virtualization:** TanStack Table and TanStack Virtual
- **Forms:** React Hook Form and Zod
- **Workbench:** cmdk, Sonner, react-resizable-panels, dnd-kit
- **Motion:** Motion plus CSS and View Transitions
- **Graph authoring:** React Flow plus ELK
- **Large graph exploration:** Sigma.js or Cytoscape.js after benchmark
- **Scientific editor:** Tiptap
- **Code editor:** CodeMirror
- **Read-only code:** Shiki
- **Charts:** Observable Plot
- **Serializable visualization specs:** Vega-Lite
- **Component workshop:** Storybook
- **Testing:** Testing Library, Playwright, axe-core, visual regression

## Key rule

Vela owns the visual and semantic component layer. Third-party packages supply difficult behavior, layout, rendering, and accessibility behind Vela-owned APIs.

## Do not do

- Do not adopt MUI, Mantine, Chakra, Ant Design, and shadcn simultaneously.
- Do not mix Base UI, Radix, React Aria, and Ark implementations for the same Vela primitive without a written decision.
- Do not expose React Flow, Tiptap, Vega-Lite, or chart-library data structures as the canonical Vela domain model.
- Do not copy registry components without license, accessibility, dependency, and provenance review.
- Do not communicate scientific state through color alone.

## Immediate implementation sequence

1. Establish token layers and CSS variables.
2. Add Tailwind CSS 4 and the Vela theme.
3. Build Base UI-backed primitives in a local shadcn-compatible registry.
4. Create Storybook and test gates.
5. Build workbench shell and command registry.
6. Add tables, forms, and virtualization.
7. Implement Tiptap scientific blocks.
8. Implement React Flow graph adapters and Vela nodes.
9. Build Observable Plot and Vega-Lite themes.
10. Benchmark large-graph and domain-specific renderers only when real datasets require them.
