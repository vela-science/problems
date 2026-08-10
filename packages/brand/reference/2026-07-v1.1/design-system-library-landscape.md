# Vela Design System and Frontend Library Landscape

**Status:** Designer and engineering handoff supplement
**Date:** 15 July 2026
**Scope:** Web product UI, scientific state editing, provenance graphs, repository maps, evidence views, data visualization, documentation, and brand surfaces.

This document maps the design systems, component libraries, and frontend packages most relevant to Vela. It is deliberately broader than the recommended dependency list. The purpose is to show what should be adopted, what should be evaluated for specific surfaces, and what should remain inspiration only.

## 1. Executive decision

Vela should build an owned design system, not theme a large third-party component suite.

The recommended architecture is:

1. **Open-code component ownership:** shadcn/ui registry and file-distribution model.
2. **Behavioral primitives:** Base UI as the default primitive layer.
3. **Accessibility escape hatch:** React Aria Components for interaction patterns that Base UI does not cover deeply enough, especially complex collections, grids, trees, date input, and advanced keyboard behavior.
4. **Styling:** Tailwind CSS 4 with CSS custom properties and semantic tokens.
5. **Variants:** Class Variance Authority, `clsx`, and `tailwind-merge`.
6. **Tokens:** DTCG-compatible JSON as source of truth, transformed with Style Dictionary when multiple outputs are needed.
7. **Documentation and quality:** Storybook, visual regression, Playwright, Testing Library, and axe-core.
8. **Data-dense product infrastructure:** TanStack Table, TanStack Virtual, TanStack Query, React Hook Form, and Zod.
9. **Scientific state and provenance:** React Flow plus ELK for editable and structured graphs. Sigma.js or Cytoscape.js for larger exploratory networks.
10. **Scientific authoring:** Tiptap as the default structured editor, CodeMirror for code and structured source, Shiki for read-only code rendering.
11. **Visualization:** Observable Plot for Vela-native analytical charts, Vega-Lite for declarative and serializable chart specifications, and ECharts or Plotly only for specialized high-density use cases.
12. **Icons:** Lucide as the general-purpose base, supplemented by a custom Vela semantic icon set for evidence, provenance, uncertainty, conflict, dependency, intervention, and finding state.

This stack gives Vela control over the visual and semantic layer without forcing the team to rebuild difficult accessibility, editor, graph, and data-grid behavior.

## 2. Governing principles

### 2.1 Own the top layer

Vela components should live in the repository as editable source. The product should not depend on opaque visual defaults that become difficult to override. This is why shadcn/ui's open-code model is a stronger fit than adopting a monolithic themed suite as the permanent foundation.

### 2.2 Separate behavior from appearance

Behavioral primitives should solve focus management, keyboard interaction, ARIA, positioning, collection state, and controlled versus uncontrolled behavior. Vela should own layout, typography, color, density, semantic states, and composition.

### 2.3 Use semantic tokens, not raw brand values

Components should consume tokens such as `surface.canvas`, `surface.panel`, `text.primary`, `evidence.supporting`, `claim.contested`, and `provenance.lineage`, rather than hard-coded hex values or generic color names.

### 2.4 Do not install the landscape

The libraries below are a decision map, not a package manifest. Install the smallest coherent set. Avoid multiple packages that solve the same primitive unless there is a documented reason.

### 2.5 Scientific truth outranks decorative consistency

The design system must preserve uncertainty, provenance, contradictory evidence, data quality, and transformation history. Visual simplification must never erase epistemic distinctions.

---

# 3. Canonical Vela implementation stack

## 3.1 Component ownership and primitive foundation

| Layer | Recommended | Role | Decision |
|---|---|---|---|
| Component source and distribution | **shadcn/ui** | Ownable component source, registry, CLI, blocks, consistent composition | Adopt |
| Default behavioral primitives | **Base UI** | Unstyled accessible React primitives | Adopt |
| Advanced accessibility primitives | **React Aria Components** | Complex collection, keyboard, grid, date, and internationalized interaction patterns | Adopt selectively |
| Existing ecosystem compatibility | **Radix Primitives** | Mature primitives and ecosystem support | Keep available, do not duplicate Base UI controls without cause |
| State-machine primitives | **Ark UI + Zag.js** | Framework-agnostic interaction state machines and headless components | Evaluate for unusually complex interactions |
| Additional headless patterns | **Ariakit** | Accessible composite widgets, menus, comboboxes, dialogs | Reference or selective adoption |
| Minimal Tailwind headless set | **Headless UI** | Basic components maintained by Tailwind Labs | Reference, not primary |

### Recommendation

Use Base UI for the default Vela primitives and shadcn-style source ownership. Use React Aria when Vela needs a component whose accessibility model is substantially more complex than a typical dialog, popover, select, or menu. Do not create two separate Vela `Select`, `Dialog`, or `Tooltip` implementations backed by different primitive families.

### Why shadcn/ui fits Vela

shadcn/ui is explicitly a code distribution system rather than a traditional package. The component source is copied into the application and becomes part of the product codebase. That is aligned with Vela's need for deep semantic customization and agent-readable infrastructure.

### Why Base UI fits Vela

Base UI is unstyled, tree-shakable, and designed for compositional control. It is appropriate for a product whose visual language should not resemble a generic component suite.

### Why React Aria remains important

React Aria is strongest where interaction complexity, internationalization, focus behavior, and collection semantics become difficult. Likely Vela uses include:

- evidence and finding grids
- virtualized collection navigation
- tree and tree-grid interfaces
- advanced combo boxes
- date and time inputs
- keyboard-heavy workbench surfaces
- drag-and-drop patterns that must remain accessible

---

## 3.2 Styling, tokens, and variants

| Package or system | Role | Decision |
|---|---|---|
| **Tailwind CSS 4** | Utility styling, responsive states, theme variables, zero-runtime output | Adopt |
| **CSS custom properties** | Runtime theming and semantic token application | Adopt |
| **DTCG token JSON** | Portable token source format | Adopt |
| **Style Dictionary** | Transform tokens into CSS, TypeScript, native, documentation, and other outputs | Adopt when output count justifies it |
| **Tokens Studio for Figma** | Designer token authoring and Figma synchronization | Evaluate, useful if the designer works token-first |
| **Class Variance Authority** | Typed component variants | Adopt |
| **clsx** | Conditional class composition | Adopt |
| **tailwind-merge** | Resolve conflicting Tailwind utilities | Adopt |
| **Panda CSS** | Typed build-time atomic CSS and design-system recipes | Strong alternative, do not combine as a second primary styling system |
| **vanilla-extract** | Type-safe zero-runtime CSS and theme contracts | Alternative for packages that require stricter TypeScript contracts |
| **CSS Modules** | Locally scoped authored CSS | Use for complex custom visuals where utilities become unreadable |

### Tailwind versus Panda versus vanilla-extract

**Choose Tailwind CSS 4 for the main Vela application.** It has the best fit with shadcn's open-code ecosystem, agentic coding workflows, rapid iteration, and the current toolkit.

Choose **Panda CSS instead** only if the team decides that type-safe recipes and generated design-system APIs are more important than ecosystem alignment.

Use **vanilla-extract** for an independently published component package only if compile-time theme contracts and authored CSS objects are a hard requirement. Do not run Tailwind, Panda, and vanilla-extract as three peer styling systems across the same product.

### Required token layers

The current brand tokens should be expanded into four layers:

1. **Primitive:** raw colors, dimensions, type families, durations.
2. **Semantic:** `text.primary`, `surface.raised`, `border.subtle`, `state.conflict`.
3. **Component:** `button.primary.background`, `finding.card.border`, `graph.edge.lineage`.
4. **Contextual:** light, dark, print, presentation, high contrast, reduced motion.

---

## 3.3 Core UI utilities

| Need | Recommended package | Notes |
|---|---|---|
| Floating placement | **Floating UI** | Use directly only for custom floating interactions not handled by the primitive layer |
| Command palette | **cmdk** | Strong fit for Vela's keyboard-first workbench |
| Toasts | **Sonner** | Keep notifications concise and non-blocking |
| Resizable panels | **react-resizable-panels** | Core for workbench, graph, evidence, and inspector layouts |
| Drag and drop | **dnd-kit** | Use for sortable evidence, structured panels, and controlled spatial interactions |
| Carousel | **Embla Carousel** | Marketing and image collections, not central product navigation |
| Date selection | **React Aria date components** or **react-day-picker** | Prefer React Aria when date input semantics and internationalization matter |
| Drawer | **Vaul** | Mobile and narrow-screen product surfaces only |
| Hotkeys | **TanStack Hotkeys** or a small internal abstraction | Centralize shortcuts and collision handling |
| Keyboard command registry | Internal layer on top of command palette and hotkey package | Required for discoverability and user customization |
| Class utilities | **clsx + tailwind-merge** | Expose one internal `cn()` helper |
| Variants | **CVA** | Define variants and compound variants near component source |
| State store | **Zustand** for local complex UI state, **XState** for explicit workflows | Do not put server state in either |

### Interaction policy

Vela should maintain a central command registry. Every user action that matters should have:

- stable command identifier
- human label
- optional keyboard shortcut
- permission and availability predicate
- analytics or provenance event where appropriate
- command palette exposure

This makes the product controllable by keyboard, agents, accessibility tools, and future automation layers.

---

## 3.4 Data, forms, and dense interfaces

| Need | Recommended | Decision |
|---|---|---|
| Server state | **TanStack Query** | Adopt |
| Data tables | **TanStack Table** | Adopt |
| Virtualized long lists and grids | **TanStack Virtual** | Adopt |
| Forms | **React Hook Form** | Adopt |
| Schema validation | **Zod** | Adopt |
| Form resolver | **@hookform/resolvers** | Adopt |
| Highly advanced spreadsheet-grade grid | **AG Grid** | Evaluate only for requirements TanStack Table cannot reasonably meet |
| Data import mapping | Custom Vela flow using TanStack Table, React Hook Form, and Zod | Build internally |

### Why TanStack Table

Vela's tables are not generic admin tables. Findings, claims, evidence, provenance, confidence, and dependency state need custom cells, multi-row expansion, keyboard navigation, filters, grouped views, and deep links. A headless table gives the team control over markup and semantics.

### When AG Grid is justified

Use AG Grid only if Vela needs features such as spreadsheet-scale editing, pinned aggregation, complex Excel-like interactions, or very large enterprise data grids that would be expensive to reproduce. Keep it isolated from the canonical Vela table component.

---

# 4. Knowledge graphs, provenance, and spatial interfaces

Vela's graph layer is a core product surface, not a decorative visualization. Different graph libraries serve different scales and interaction models.

## 4.1 Recommended graph stack

| Library | Best use | Decision |
|---|---|---|
| **React Flow (`@xyflow/react`)** | Editable node-edge canvases, workflow-style graphs, typed finding bundles, inspectors, handles, grouping, custom nodes | Adopt for interactive authoring |
| **ELK / elkjs** | Layered DAG layout, ports, orthogonal routing, compound graphs | Adopt alongside React Flow |
| **Dagre** | Simpler directed graph layout | Use for small graphs or fallback |
| **d3-force** | Force-directed exploratory layouts | Use selectively |
| **Sigma.js + Graphology** | Large WebGL network exploration | Evaluate for large read-only repositories |
| **Cytoscape.js** | Graph analysis, rich graph interaction, biological networks, layout ecosystem | Evaluate for scientific network views |
| **Graphology** | Graph data model and algorithms | Useful with Sigma.js or independently |
| **PixiJS** | Custom high-performance 2D rendering | Use only if graph requirements exceed higher-level libraries |
| **deck.gl** | Massive geospatial and GPU visual layers | Optional for geographical research maps |

### Architecture decision

Use **React Flow plus ELK** for the primary editable repository and provenance interface. React Flow has the right interaction model for custom nodes, handles, edges, selection, grouping, contextual controls, and whiteboard-like features.

Use **Sigma.js** when the user needs to explore thousands or tens of thousands of nodes with WebGL rendering and relatively limited editing.

Use **Cytoscape.js** when graph analysis, domain-specific layouts, or biological network conventions become more important than Vela-native node composition.

Do not force one renderer to serve every graph scale. Define an internal graph schema and adapters for different renderers.

## 4.2 Internal graph primitives Vela should own

The following should be Vela components and not raw third-party defaults:

- `FindingNode`
- `ClaimNode`
- `EvidenceNode`
- `DatasetNode`
- `MethodNode`
- `PersonNode`
- `InstrumentNode`
- `ConflictNode`
- `UnknownNode`
- `LineageEdge`
- `SupportsEdge`
- `ContradictsEdge`
- `DependsOnEdge`
- `DerivedFromEdge`
- `ReplicatesEdge`
- `InterventionEdge`
- `GraphInspector`
- `GraphLegend`
- `GraphTimeScrubber`
- `GraphFilterBar`
- `GraphMinimap`
- `GraphCommandMenu`

Edge type must not be communicated through color alone. Use shape, dash pattern, endpoint glyph, label, or directionality as redundant channels.

## 4.3 Whiteboard and freeform canvas libraries

| Library | Use | Decision |
|---|---|---|
| **tldraw** | Full collaborative whiteboard and infinite canvas | Evaluate if freeform scientific synthesis becomes a product pillar |
| **Excalidraw** | Sketch-style diagrams and embedded collaborative drawing | Optional utility, not core visual language |
| **React Flow whiteboard features** | Constrained graph-first canvas | Prefer for canonical Vela state graphs |
| **Konva / react-konva** | Custom canvas interactions | Use only for specialized rendering |

Vela should not become an undifferentiated whiteboard. The core canvas must preserve typed scientific state and relationships. Freeform drawing can exist as an annotation layer, but should not replace the data model.

---

# 5. Scientific authoring and document surfaces

## 5.1 Rich-text editor decision

| Library | Strength | Decision |
|---|---|---|
| **Tiptap** | Headless ProseMirror wrapper, extensible schema, tables, math, comments, collaboration ecosystem | Adopt |
| **ProseMirror** | Maximum low-level control | Use through Tiptap unless Vela reaches a hard Tiptap limitation |
| **Lexical** | Reliable, accessible, performant editor framework with serializable state | Strong alternative |
| **BlockNote** | Faster Notion-like block editor implementation | Evaluate for prototypes, less control than a custom Tiptap schema |
| **Milkdown** | Markdown-first editor built on ProseMirror | Evaluate if markdown is the canonical authoring model |
| **Slate** | Flexible React editor framework | Reference, not first choice for new Vela work |

### Why Tiptap is the default

Vela needs more than rich text. It needs typed scientific nodes embedded in documents:

- claim references
- evidence receipts
- datasets
- equations
- citations
- uncertainty statements
- provenance anchors
- executable or reproducible methods
- dependency references
- graph embeds
- tracked changes and review states

Tiptap's extension model and ProseMirror foundation make it suitable for building this schema while retaining complete visual control.

### Required custom editor nodes

- `FindingBlock`
- `ClaimBlock`
- `EvidenceCitation`
- `DatasetEmbed`
- `MethodReceipt`
- `EquationBlock`
- `CodeBlock`
- `GraphEmbed`
- `UncertaintyCallout`
- `ConflictCallout`
- `AssumptionBlock`
- `DecisionRecord`
- `ProvenanceAnchor`

## 5.2 Markdown, citations, and math

| Need | Recommended |
|---|---|
| Markdown parsing | **unified**, **remark**, **rehype** |
| React markdown rendering | **react-markdown** |
| MDX documentation | **MDX** |
| Mathematics | **KaTeX** for fast rendering, **MathJax** if broader TeX compatibility is required |
| Syntax highlighting | **Shiki** |
| Citation processing | **Citation.js** or a CSL-compatible service, after format requirements are defined |
| Sanitization | **rehype-sanitize** with a strict schema |

Use a single canonical serialized representation for each artifact type. Do not silently round-trip between HTML, markdown, and editor JSON without explicit conversion rules and loss tests.

## 5.3 Code and structured source

| Library | Use | Decision |
|---|---|---|
| **CodeMirror 6** | Editable code, queries, schemas, structured scientific text | Adopt |
| **Monaco Editor** | Full IDE-grade editor | Evaluate only for a substantial coding workbench |
| **Shiki** | High-fidelity read-only syntax highlighting | Adopt |
| **Tree-sitter** | Parsing and structural analysis | Evaluate for code-aware scientific receipts and transformations |

CodeMirror is the better default for embedded code and schema editors because it is modular and easier to integrate into a custom product surface. Monaco is justified only if Vela becomes a full development environment.

---

# 6. Data visualization and scientific graphics

## 6.1 Recommended visualization hierarchy

| Library | Best use | Decision |
|---|---|---|
| **Observable Plot** | Vela-native exploratory and analytical charts with concise grammar-of-graphics composition | Adopt |
| **Vega-Lite** | Serializable declarative chart specs, portable analytical views, reproducibility | Adopt |
| **D3** | Custom visualization primitives and transforms | Use as low-level foundation when needed |
| **Apache ECharts** | Large interactive dashboards, high chart variety, dense canvas rendering | Evaluate for specialized dashboards |
| **Plotly.js** | Scientific chart types, 3D, domain familiarity | Evaluate for specialized scientific views |
| **visx** | React-first low-level visualization primitives | Evaluate when React component composition matters more than declarative specs |
| **Recharts** | Simple React charts | Acceptable for basic dashboard charts, not the canonical scientific visualization system |
| **Nivo** | Fast polished charting | Reference or prototype use |
| **Tremor** | Dashboard blocks and chart patterns | Inspiration or rapid internal tooling |

### Decision

Use **Observable Plot** for most authored analytical charts and **Vega-Lite** when the chart specification itself should be stored, audited, exchanged, or regenerated as scientific state.

Use D3 for custom marks, scales, layout, and interactions rather than as the default authoring API.

Use Plotly or ECharts in isolated components for chart types or performance requirements not met by the default stack.

## 6.2 Vela chart rules

Every chart component should support:

- source and transformation provenance
- explicit units
- uncertainty representation
- missing-data representation
- accessible text summary
- downloadable data or receipt
- stable chart specification identifier
- light, dark, print, and high-contrast rendering
- color-independent category distinction
- honest axis and aggregation defaults

The chart system should include Vela-owned presets, not expose raw library defaults.

## 6.3 Scientific and domain renderers

These are optional modules, not core dependencies:

| Domain | Library | Use |
|---|---|---|
| Molecular structures | **Mol\*** | Molecular and macromolecular visualization |
| 3D scientific data | **vtk.js** | Volume, mesh, and scientific 3D rendering |
| Geospatial | **MapLibre GL JS** | Open map rendering |
| GPU geospatial layers | **deck.gl** | Large geospatial datasets and overlays |
| Genomics | **HiGlass** | Multiscale genomic data visualization |
| Neuroimaging | **Niivue** | Browser-based neuroimaging visualization |
| Images and deep zoom | **OpenSeadragon** | Large scientific images and tiled microscopy |
| Diagrams | **Mermaid** | Generated documentation diagrams, not core graph UI |

Adopt these only when a product instance requires them. Wrap them in Vela components with shared provenance, selection, annotation, export, and accessibility behavior.

---

# 7. Icons and visual symbols

## 7.1 Icon libraries

| Library | Strength | Decision |
|---|---|---|
| **Lucide** | Broad, consistent, simple stroke icons, React package | Adopt as general base |
| **Phosphor Icons** | Multiple weights and expressive symbols | Evaluate for selected communication surfaces |
| **Radix Icons** | Compact UI controls | Useful where a smaller icon style is required |
| **Heroicons** | Tailwind ecosystem and familiar application icons | Reference |
| **Iconify** | Aggregator and access to many sets | Use carefully for discovery, not uncontrolled production mixing |
| **Material Symbols** | Broad semantic coverage | Reference, avoid making Vela look like generic Material UI |

### Vela-owned semantic icon set

Generic icon libraries do not encode the Vela ontology. Create a custom set for:

- claim
- evidence
- finding
- provenance
- lineage
- dependency
- uncertainty
- contradiction
- replication
- intervention
- method
- dataset
- instrument
- observation
- model
- repository
- unresolved
- superseded
- verified
- contested

The icons should use the same optical grid, stroke logic, corner behavior, and terminal geometry as the product icon system. The sail logo should not be reused as a generic navigation icon.

---

# 8. Motion, transitions, and feedback

| Library | Role | Decision |
|---|---|---|
| **Motion** | React animation, layout transitions, gestures | Adopt selectively |
| **CSS transitions and View Transitions API** | Default low-cost transitions | Adopt |
| **AutoAnimate** | Simple list and layout transitions | Optional |
| **Rive** | Authored interactive brand and educational motion | Rare, marketing or explanatory use |
| **Lottie** | Playback of exported motion assets | Avoid as the default product animation system |

Motion should explain causality, hierarchy, and state change. Appropriate uses include:

- graph layout transitions that preserve mental map
- evidence expanding into provenance detail
- state changes moving through a visible lifecycle
- comparison transitions
- confidence or uncertainty updates
- focus transfer and command feedback

Avoid ambient motion, looping star fields, excessive parallax, and decorative acceleration metaphors in the scientific product.

All motion must respect reduced-motion preferences.

---

# 9. Documentation, quality, and design-system operations

## 9.1 Required tooling

| Tool | Role | Decision |
|---|---|---|
| **Storybook** | Component workshop, states, documentation, interaction and accessibility tests | Adopt |
| **Chromatic** or equivalent | Hosted visual regression and review | Adopt or reproduce internally |
| **Playwright** | Cross-browser end-to-end and visual tests | Adopt |
| **Testing Library** | User-centered component tests | Adopt |
| **axe-core** | Automated accessibility checks | Adopt |
| **Vitest** | Unit and component logic tests | Adopt |
| **Changesets** | Package versioning and changelogs | Adopt for a multi-package design system |
| **semantic-release** | Automated release alternative | Evaluate, do not combine release systems |
| **Lefthook** or **Husky** | Local quality gates | Optional |
| **ESLint / Oxlint** | Code quality | Use the repository standard |
| **Prettier / Oxfmt** | Formatting | Use one repository standard |

## 9.2 Storybook acceptance requirements

Every production component should document:

- default state
- all visual variants
- all sizes and densities
- loading, empty, error, and permission-denied states
- long content and localization stress
- keyboard behavior
- focus-visible state
- high contrast
- reduced motion
- light and dark themes
- scientific semantic states
- mobile and narrow container behavior

For graph and editor components, stories should include deterministic sample data and serialized fixture files.

## 9.3 Figma and code synchronization

Recommended workflow:

1. Figma variables represent semantic design tokens.
2. Tokens export to or reconcile with the DTCG JSON source.
3. Code generation creates CSS variables and TypeScript token types.
4. Storybook is the source of truth for implemented component behavior.
5. Figma components link to Storybook stories where practical.
6. Visual regression checks prevent accidental drift.

Do not promise perfect automatic round-trip synchronization. Assign explicit ownership for each artifact:

- brand master artwork: design-owned, versioned exports
- semantic tokens: shared governance, repository source of truth
- behavior and accessibility: code-owned
- component composition guidance: jointly maintained

---

# 10. Styled component suites and institutional design systems

These systems are relevant as references or alternatives, but should not all become dependencies.

## 10.1 Product component suites

| System | Strength | Vela position |
|---|---|---|
| **Mantine** | Broad React suite, hooks, dates, forms, charts, notifications, Tiptap integration | Excellent rapid prototype or internal-tool option, not recommended as Vela's permanent visual foundation |
| **MUI** | Huge ecosystem, mature enterprise components, Material conventions | Use only if delivery speed outweighs distinct identity and markup control |
| **Chakra UI** | Accessible components, strong theming, Panda and Ark ecosystem alignment | Reference or alternative stack |
| **Ant Design** | Dense enterprise applications and comprehensive components | Reference for information-dense patterns, avoid visual adoption |
| **Blueprint** | Desktop-like data tools | Reference for power-user and scientific workstation density |
| **Fluent UI** | Microsoft ecosystem and enterprise interaction patterns | Reference |
| **React Spectrum** | Adobe's comprehensive accessibility and internationalization system | Reference and source of advanced React Aria behavior |
| **NextUI / HeroUI** | Polished application components | Prototype or inspiration only |
| **PrimeReact** | Very broad widget coverage | Evaluate only for isolated enterprise requirements |

## 10.2 Institutional and public design systems

| System | What to study |
|---|---|
| **IBM Carbon** | Data-heavy enterprise layout, structured content, accessibility, charts |
| **Adobe Spectrum** | Accessibility, interaction precision, cross-product consistency |
| **GitHub Primer** | Developer tooling, dense navigation, code and issue surfaces |
| **Microsoft Fluent** | Productivity interfaces and command systems |
| **Shopify Polaris** | Content guidance and operational product patterns |
| **Atlassian Design System** | Complex teamwork and issue workflows |
| **Material Design 3** | Platform conventions and adaptive UI |
| **Apple Human Interface Guidelines** | Native interaction expectations and spatial hierarchy |
| **GOV.UK Design System** | Clarity, accessibility, evidence-based patterns |
| **US Web Design System** | Accessible public-service implementation and tokens |
| **PatternFly** | Enterprise infrastructure and administration patterns |

Study these systems for solved interaction patterns, terminology, accessibility, and content guidance. Do not visually collage them into Vela.

---

# 11. Component registries, blocks, and inspiration sources

These sources can accelerate implementation, but copied components must pass Vela's accessibility, token, behavior, and licensing review.

| Source | Use | Policy |
|---|---|---|
| **shadcn/ui components and blocks** | Primary starting source | Preferred |
| **shadcn registry ecosystem** | Discover open-code components | Review source and dependency tree |
| **Origin UI** | High-quality interaction and component variants | Inspiration and selective source |
| **Park UI** | Ark UI plus Panda recipes | Reference if evaluating the Ark/Panda stack |
| **React Flow UI** | Node, edge, and graph control components | Strong starting point for graph-specific implementation |
| **Tremor** | Dashboard and chart compositions | Internal tools and inspiration |
| **Tailwind Plus / Catalyst** | Polished application and marketing patterns | Reference or licensed source, not Vela's canonical system |
| **Aceternity UI** | Marketing effects and hero compositions | Very selective marketing use only |
| **Magic UI** | Motion and marketing components | Very selective marketing use only |
| **21st.dev registries** | Component discovery and agent workflows | Treat as untrusted source until code review |
| **Radix Themes** | Coherent reference implementation on Radix | Reference |

### Registry intake checklist

Before a third-party block enters Vela:

1. Confirm license.
2. Audit transitive dependencies.
3. Remove unnecessary libraries.
4. Replace raw colors, radii, type, and shadows with Vela tokens.
5. Replace generic copy.
6. Verify keyboard and screen-reader behavior.
7. Add reduced-motion behavior.
8. Add Storybook stories.
9. Add interaction, accessibility, and visual tests.
10. Move source into the Vela registry with provenance metadata.

This intake process is a direct expression of Vela's own thesis: component source should retain lineage and evidence, not appear without provenance.

---

# 12. Recommended Vela component inventory

The designer should produce component specifications in coordination with the implementation stack below.

## 12.1 Foundations

- color and semantic state tokens
- typography styles
- spacing
- radii
- border and divider styles
- elevation and surface hierarchy
- opacity
- motion curves and durations
- icon grid
- chart palette
- graph line and node language
- density modes
- focus ring
- selection language

## 12.2 Base controls

- button
- icon button
- button group
- link
- checkbox
- radio group
- switch
- input
- textarea
- number field
- select
- combobox
- multi-select
- token input
- date and time field
- slider
- segmented control
- tabs
- toolbar
- tooltip
- popover
- menu
- context menu
- dialog
- alert dialog
- drawer
- toast
- progress
- skeleton
- badge
- avatar
- separator

## 12.3 Navigation and workbench

- application shell
- workspace switcher
- primary sidebar
- secondary navigator
- breadcrumb
- tabs with persistence
- command palette
- inspector panel
- resizable split pane
- activity panel
- notification center
- recent items
- saved views
- search results
- filter builder
- keyboard shortcut help

## 12.4 Scientific-state components

- claim card
- evidence card
- finding card
- provenance receipt
- uncertainty indicator
- confidence distribution
- conflict state
- dependency state
- replication state
- observation record
- method record
- dataset reference
- citation
- inline source preview
- lineage timeline
- version comparison
- state diff
- assumption register
- unresolved question
- intervention proposal
- decision record

## 12.5 Data and graph components

- data table
- column chooser
- filter bar
- query builder
- chart frame
- chart legend
- chart annotation
- accessible chart summary
- graph node families
- graph edges
- minimap
- graph inspector
- graph selection tray
- graph timeline
- graph comparison
- graph export

## 12.6 Authoring components

- structured editor
- slash command menu
- block inserter
- citation picker
- equation editor
- code editor
- file attachment
- comment thread
- tracked change
- review decision
- document outline
- table of contents
- embedded graph
- embedded chart
- receipt preview

---

# 13. Package policy and dependency governance

## 13.1 Adoption classes

Every frontend dependency should be labeled:

- **Foundation:** difficult to replace, architecture-level dependency.
- **Capability:** provides a bounded complex feature.
- **Utility:** small replaceable helper.
- **Development-only:** documentation, test, build, or lint tooling.
- **Experimental:** isolated behind an adapter and excluded from stable interfaces.

## 13.2 Foundation dependencies should be few

Recommended foundation set:

- React and the chosen application framework
- Tailwind CSS
- Base UI
- shadcn component source model
- token pipeline
- Storybook

Graph, editor, and visualization libraries are capability dependencies and should sit behind Vela-owned interfaces.

## 13.3 Required dependency record

For each adopted dependency, record:

- package and repository
- version range
- license
- maintainer and project health
- security posture
- bundle impact
- SSR and React Server Component implications
- accessibility responsibility
- data serialization formats
- migration and replacement strategy
- Vela adapter or owner
- first adoption decision and date

## 13.4 Avoid package drift

- Pin the lockfile.
- Use automated update PRs, but do not auto-merge foundation changes.
- Update primitive families as a coordinated set.
- Run Storybook visual and interaction tests on dependency updates.
- Record breaking changes in the design-system changelog.
- Keep third-party APIs behind Vela components.

---

# 14. Proposed repository architecture

```text
packages/
  vela-tokens/
    src/
      primitive.json
      semantic.json
      component.json
      themes/
    generated/
      css/
      ts/
      figma/
  vela-ui/
    src/
      primitives/
      components/
      patterns/
      scientific-state/
      graph/
      editor/
      charts/
      icons/
    registry/
  vela-graph/
    schema/
    react-flow/
    sigma/
    cytoscape/
    layouts/
  vela-editor/
    schema/
    extensions/
    serializers/
    migrations/
  vela-viz/
    plot/
    vega/
    themes/
    accessibility/
  vela-brand/
    logo/
    templates/
    guidance/
apps/
  storybook/
  docs/
```

The design system can start inside the product monorepo. Publish packages only when multiple applications genuinely need independent versioning.

---

# 15. Phased adoption plan

## Phase 1: Foundations

- Tailwind CSS 4
- semantic CSS variables
- shadcn open-code structure
- Base UI primitives
- CVA, `clsx`, and `tailwind-merge`
- Lucide plus initial Vela semantic icons
- Storybook
- Testing Library, Playwright, and axe

## Phase 2: Workbench

- command registry and cmdk
- resizable panels
- TanStack Query, Table, and Virtual
- React Hook Form and Zod
- shared empty, loading, error, and permission states
- density modes

## Phase 3: Scientific state

- Tiptap schema and custom nodes
- citations, equations, code, and provenance blocks
- finding and evidence components
- version comparison and state diff

## Phase 4: Repository graph

- React Flow adapter
- ELK layouts
- Vela graph node and edge system
- graph accessibility and alternative list view
- Sigma.js or Cytoscape spike for large graphs

## Phase 5: Visualization and domain modules

- Observable Plot theme
- Vega-Lite schema storage and rendering
- scientific domain renderers as required
- export, provenance, and accessibility standards

---

# 16. Designer deliverables tied to the stack

The designer should be asked to produce:

1. Figma variable collections that mirror the token layers.
2. Full component set with states, sizes, density, and themes.
3. Base UI and React Aria behavior annotations where interaction is not obvious.
4. Responsive workbench layouts, including narrow and high-density modes.
5. Keyboard focus and command palette behavior.
6. Graph node, edge, selection, filtering, and comparison language.
7. Editor block system and insertion behavior.
8. Table and data-filter patterns.
9. Chart themes with uncertainty, missing data, annotation, and accessible summaries.
10. Storybook-ready component acceptance notes.
11. Third-party component intake and visual normalization guidance.
12. Examples of scientific truth preservation, especially contradiction and uncertainty.

The designer should not be asked to recreate the visual defaults of shadcn, Base UI, React Aria, React Flow, or Tiptap. They should design the Vela layer that sits above those behaviors.

---

# 17. Final shortlist

## Adopt now

- shadcn/ui source and registry model
- Base UI
- Tailwind CSS 4
- CSS custom properties
- DTCG-compatible token JSON
- Class Variance Authority
- `clsx`
- `tailwind-merge`
- Lucide
- TanStack Query
- TanStack Table
- TanStack Virtual
- React Hook Form
- Zod
- Storybook
- Playwright
- Testing Library
- axe-core

## Adopt with the first corresponding surface

- React Aria Components
- cmdk
- Sonner
- react-resizable-panels
- dnd-kit
- Motion
- React Flow
- ELK
- Tiptap
- CodeMirror
- Shiki
- Observable Plot
- Vega-Lite

## Evaluate through focused prototypes

- Sigma.js plus Graphology
- Cytoscape.js
- tldraw
- ECharts
- Plotly.js
- AG Grid
- Lexical
- Panda CSS as an alternative architecture, not an addition
- domain-specific scientific renderers

## Reference only unless a concrete need emerges

- MUI
- Mantine
- Chakra UI
- Ant Design
- Fluent UI
- Carbon
- Spectrum
- Primer
- Polaris
- Material Design
- GOV.UK Design System
- USWDS
- marketing-oriented component effect libraries

---

# 18. Official references

Primary sources reviewed for this supplement:

- shadcn/ui: https://ui.shadcn.com/docs
- Base UI: https://base-ui.com/react/overview/quick-start
- Radix Primitives: https://www.radix-ui.com/primitives/docs/overview/introduction
- React Aria: https://react-aria.adobe.com/getting-started
- Tailwind CSS: https://tailwindcss.com/docs
- Panda CSS: https://panda-css.com/docs/overview/getting-started
- vanilla-extract: https://vanilla-extract.style/documentation/getting-started/
- Style Dictionary: https://styledictionary.com/
- CVA: https://cva.style/
- Floating UI: https://floating-ui.com/docs/getting-started
- TanStack Table: https://tanstack.com/table/latest/docs/introduction
- React Flow: https://reactflow.dev/learn
- Cytoscape.js: https://js.cytoscape.org/
- Sigma.js: https://www.sigmajs.org/docs/
- Eclipse Layout Kernel: https://eclipse.dev/elk/
- Tiptap: https://tiptap.dev/docs/editor/getting-started/overview
- Lexical: https://lexical.dev/docs/intro
- CodeMirror: https://codemirror.net/docs/
- Shiki: https://shiki.style/guide/install
- Observable Plot: https://observablehq.com/plot/what-is-plot
- Vega-Lite: https://vega.github.io/vega-lite/
- Apache ECharts: https://echarts.apache.org/handbook/en/get-started/
- Plotly.js: https://plotly.com/javascript/
- Storybook: https://storybook.js.org/docs
- Playwright: https://playwright.dev/docs/intro
- axe-core: https://github.com/dequelabs/axe-core
- Testing Library: https://testing-library.com/docs/
- Mantine: https://mantine.dev/getting-started/

Version numbers should be pinned by engineering at implementation time. This document intentionally recommends capabilities and architectural roles rather than freezing transient versions.
