import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import {
  SourceRecordView,
  SourceRegistryView,
  type SourceRegistryViewModel,
} from "./source-registry-view";

vi.mock("next/navigation", () => ({
  usePathname: () => "/sources",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const root = (character: string): `sha256:${string}` => (
  `sha256:${character.repeat(64)}`
);

const registry: SourceRegistryViewModel = {
  schema: "vela.math-source-registry-read.v1",
  release_root: root("a"),
  source_registry: {
    schema: "vela.math-source-registry-release.v1",
    declaration_root: root("b"),
    observation_bundle_root: root("c"),
    source_count: 1,
    observation_count: 1,
    native_record_count: 1_126,
    release_source_count: 1,
    repository_binding_count: 23,
  },
  sources: [{
    declaration: {
      source_id: "source:formal-conjectures",
      native_namespace: "formal-conjectures",
      publisher_or_maintainer: "Google DeepMind; Formal Conjectures authors",
      source_kind: "formal_library",
      locators: [{
        locator_id: "repository",
        kind: "git",
        url: "https://github.com/google-deepmind/formal-conjectures",
      }],
      attributed_claims: [{
        role: "publisher",
        name: "Google DeepMind",
        basis_locator_id: "repository",
      }],
      rights: {
        status: "declared",
        license_expression: "Apache-2.0",
        access: "public",
        redistribution: "full_under_license",
        basis: "Upstream license record.",
      },
      snapshot_policy: {
        mode: "content_root_only",
        retention: "none",
        reason: "Index the exact source binding without duplicating its repository.",
      },
      adapter: {
        adapter_id: "problems-data/formal-conjectures",
        version: "1.0.0",
        mode: "networked_acquisition",
        acquisition_contract: "vela.source-adapter-bundle.v2",
        observation_contract: "vela.math-source-observation.v1",
        adapter_root: root("d"),
      },
      coverage: {
        repository_slugs: ["math"],
        included: ["Observed formal declaration identity and source path"],
        omissions: [{
          code: "kernel_not_fidelity",
          description: "Kernel elaboration is not statement fidelity or scientific acceptance.",
        }],
      },
      declaration_root: root("e"),
    },
    declaration_row_root: root("f"),
    observation: {
      schema: "vela.math-source-observation.v1",
      source_id: "source:formal-conjectures",
      observation_id: "observation:formal-conjectures:8046fbf",
      declaration_root: root("e"),
      acquisition_root: root("3"),
      observed_at: "2026-07-29T12:00:00Z",
      native_revision: {
        kind: "git",
        value: "8046fbff7b6c801d8debd4a85bf67a0541b78dda",
        content_root: root("1"),
        tree: "8".repeat(40),
      },
      snapshot_root: null,
      snapshot_state: "content_root_only",
      projected_record_count: 1_126,
      projected_records_root: root("2"),
      coverage: {
        status: "partial",
        included: ["Observed formal declaration identity and source path"],
        native_record_count: null,
        projected_record_count: 1_126,
      },
      omissions: [{
        code: "kernel_not_fidelity",
        description: "Kernel elaboration is not statement fidelity or scientific acceptance.",
      }],
      observation_root: root("4"),
    },
    native_record_count: 1_126,
    repository_binding_count: 23,
  }],
  native_records: [{
    schema: "vela.math-native-record.v1",
    source_id: "source:formal-conjectures",
    observation_root: root("4"),
    native_id: "formal-conjectures:Erdos505",
    native_kind: "formal_theorem",
    native_revision: "8046fbff7b6c801d8debd4a85bf67a0541b78dda",
    title: "Erdos505.erdos_505",
    summary: "The exact retained formal statement.",
    locators: [],
    metadata: { problem_number: 505 },
    metadata_root: root("5"),
    content_root: root("6"),
    availability: "reference_only",
    row_root: root("7"),
  }],
  repository_bindings: [{
    schema: "vela.repository-source-binding.v1",
    release_root: root("a"),
    repository_id: "123e4567-e89b-42d3-a456-426614174000",
    binding_id: "binding:1234567890abcdef",
    source_id: "source:formal-conjectures",
    observation_root: root("4"),
    native_id: "formal-conjectures:Erdos505",
    native_record_root: root("7"),
    binding_kind: "reference",
    repository_object_kind: "claim",
    repository_object_id: "vcl_1234567890abcdef",
    repository_object_root: root("8"),
    local_standing_effect: "none",
    binding_root: root("9"),
  }],
  next_cursor: "next-native",
  next_binding_cursor: "next-binding",
};

describe("Source inventory view", () => {
  test("keeps declarations, observations, projected objects, and bindings distinct", () => {
    const html = renderToStaticMarkup(
      <SourceRegistryView registry={registry} />,
    );

    expect(html).toContain("Google DeepMind; Formal Conjectures authors");
    expect(html).toContain("formal-conjectures");
    expect(html).toContain("8046fbff7b6c801d8debd4a85bf67a0541b78dda");
    expect(html).toContain("1,126");
    expect(html).toContain("exact links");
    expect(html).toContain("Source declarations");
    expect(html).toContain("Source-local read projections");
    expect(html).toContain("Formal Conjectures PR audit");
    expect(html).toContain("/sources/source%3Aformal-conjectures-pr-audit");
    expect(html).toContain("no automatic Verification, Decision, or Standing effect");
    expect(html).toContain("Exact observation");
    expect(html).toContain("Projected objects");
    expect(html).toContain("Repository bindings");
    expect(html).not.toContain("Rights and retention");
    expect(html).toContain("table-fixed");
    expect(html).toContain(">Inspect</a>");
    expect(html.match(/data-slot="table-head"/gu)).toHaveLength(5);
    expect(html).toMatch(/>Sources<\/dt><dd[^>]*>1<\/dd>/u);
    expect(html).toMatch(/>Observations<\/dt><dd[^>]*>1<\/dd>/u);
    expect(html).toMatch(/>Native records<\/dt><dd[^>]*>1,126<\/dd>/u);
    expect(html).toContain("Search record IDs, titles, or summaries");
    expect(html).toContain("Exact native ID");
    expect(html).toContain("Record kind");
    expect(html).toContain("All Repositories");
    expect(html).toContain("All source kinds");
    expect(html).toContain("All coverage");
    expect(html).toContain("observation:formal-conjectures:8046fbf");
    expect(html).toContain(
      `/sources.json?root=${encodeURIComponent(registry.release_root)}`,
    );
    expect(html).toContain("/sources/source%3Aformal-conjectures");
  });

  test("keeps coverage, omissions, authority boundary, and exact roots in the selected record", () => {
    const html = renderToStaticMarkup(
      <SourceRecordView
        source={registry.sources[0]}
        releaseRoot={registry.release_root}
        nativeRecords={registry.native_records}
        repositoryBindings={registry.repository_bindings}
        cursor="current-native"
        bindingCursor="current-binding"
        nextCursor={registry.next_cursor}
        nextBindingCursor={registry.next_binding_cursor}
      />,
    );

    expect(html).toContain("Observed formal declaration identity and source path");
    expect(html).toContain("kernel not fidelity");
    expect(html).toContain("Kernel elaboration is not statement fidelity or scientific acceptance.");
    expect(html).toContain("None creates scientific Standing");
    expect(html).toContain("exact source-native objects");
    expect(html).toContain("exact links to local Repository records");
    expect(html).toContain("Erdos505.erdos_505");
    expect(html).toContain("formal-conjectures:Erdos505");
    expect(html).toContain("vcl_1234567890abcdef");
    expect(html).toContain(
      "/sources/source%3Aformal-conjectures?cursor=next-native&amp;binding=current-binding#source-native-records",
    );
    expect(html).toContain(
      "/sources/source%3Aformal-conjectures?cursor=current-native&amp;binding=next-binding#source-repository-bindings",
    );
    expect(html).toContain(root("a"));
    expect(html).toContain(root("e"));
    expect(html).toContain(root("2"));
    expect(html).toContain('<h1 id="source-record-heading"');
    expect(html.match(/<h1(?:\s|>)/gu)).toHaveLength(1);
    expect(html).toContain("2xl:grid-cols-2");
    expect(html).toContain("min-w-0 break-all font-mono text-meta leading-5 line-clamp-none");
    expect(html).toContain("Rights and retention");
    expect(html).toContain("Apache-2.0");
    expect(html).toContain("content root only");
    /* No record here carries a publisher-declared state, so the panel that
       reads one stays away. */
    expect(html).not.toContain("Native API map");
  });

  test("makes native API-map requirements browsable without treating source status as Standing", () => {
    const source = {
      ...registry.sources[0],
      declaration: {
        ...registry.sources[0].declaration,
        source_id: "source:physlib",
        native_namespace: "leanprover-community/physlib:API-map",
        publisher_or_maintainer: "The Physlib community",
      },
      native_record_count: 232,
      repository_binding_count: 0,
    };
    const record = {
      ...registry.native_records[0],
      source_id: "source:physlib",
      native_id: "api-map:Physlib/SpaceAndTime/Time/API-map.yaml#requirement:1",
      native_kind: "api_requirement",
      title: "The key data structure Time is defined.",
      summary: "Time · source reports implemented",
      locators: [{
        locator_id: "native-1",
        kind: "artifact" as const,
        url: "https://github.com/leanprover-community/physlib/blob/example/Physlib/SpaceAndTime/Time/API-map.yaml",
      }],
      metadata: {
        source_declared_done: true,
        source_declared_state: "implemented",
      },
    };
    const html = renderToStaticMarkup(
      <SourceRecordView
        source={source}
        releaseRoot={registry.release_root}
        nativeRecords={[record]}
        repositoryBindings={[]}
      />,
    );

    expect(html).toContain("Native API map");
    expect(html).toContain("232 source-attributed requirements");
    expect(html).toContain("publisher labels, never Vela Standing");
    expect(html).toContain("source: implemented");
    expect(html).toContain("Planned requirements");
    expect(html).toContain("Implemented requirements");
    expect(html).toContain("record_kind=api_requirement");
    expect(html).toContain("sources/source%3Aphyslib?q=source+reports+planned");
    expect(html).toContain("#source-native-records");
    expect(html).toContain("Open source for The key data structure Time is defined.");
  });

  test("keeps source-native filters exact across JSON and pagination", () => {
    const html = renderToStaticMarkup(
      <SourceRecordView
        source={{
          ...registry.sources[0],
          declaration: {
            ...registry.sources[0].declaration,
            source_id: "source:physlib",
          },
        }}
        releaseRoot={registry.release_root}
        nativeRecords={[{
          ...registry.native_records[0],
          source_id: "source:physlib",
          native_kind: "api_requirement",
          metadata: { source_declared_state: "planned" },
        }]}
        repositoryBindings={[]}
        query="source reports planned"
        nativeKind="api_requirement"
        nextCursor="next-native"
      />,
    );

    expect(html).toContain("All requirements");
    expect(html).toContain("q=source+reports+planned&amp;kind=api_requirement");
    expect(html).toContain("q=source+reports+planned&amp;record_kind=api_requirement&amp;cursor=next-native#source-native-records");
  });

  test("filters the registry by URL-backed source fields while preserving exact detail links", () => {
    const html = renderToStaticMarkup(
      <SourceRegistryView
        registry={registry}
        filters={{
          query: "Google",
          kind: "formal_library",
          coverage: "partial",
        }}
      />,
    );

    expect(html).toContain("1 of");
    expect(html).toContain(
      "/sources/source%3Aformal-conjectures",
    );
    expect(html).toContain("Source-native records");
    expect(html).toContain("formal-conjectures:Erdos505");
    /* The binding's own Repository slug, not the source's namespace. A source
       publishes records about a subject; the binding says which repository
       bound one, and those are different names on purpose. */
    expect(html).toContain(`${registry.repository_bindings[0].repository_id} · claim`);
    expect(html).toContain(
      `/sources.json?root=${encodeURIComponent(registry.release_root)}&amp;include=records&amp;q=Google`,
    );
  });

  test("preserves exact native lookup filters and keyset continuation in URLs", () => {
    const html = renderToStaticMarkup(
      <SourceRegistryView
        registry={registry}
        filters={{
          nativeId: "formal-conjectures:Erdos505",
          nativeKind: "formal_theorem",
          repositorySlug: "formal-conjectures",
        }}
      />,
    );

    expect(html).toContain("Source-native records");
    expect(html).toContain("Erdos505.erdos_505");
    expect(html).toContain("Google DeepMind; Formal Conjectures authors");
    expect(html).toContain(
      "native_id=formal-conjectures%3AErdos505&amp;kind=formal_theorem&amp;repository=formal-conjectures",
    );
    expect(html).toContain(
      "native_id=formal-conjectures%3AErdos505&amp;record_kind=formal_theorem&amp;repository=formal-conjectures&amp;cursor=next-native#source-native-results",
    );
  });

  test("scopes global native records to one exact source", () => {
    const html = renderToStaticMarkup(
      <SourceRegistryView
        registry={{
          ...registry,
          next_cursor: "next-native",
        }}
        filters={{
          sourceId: "source:formal-conjectures",
        }}
      />,
    );

    expect(html).toContain("Filter records by source");
    expect(html).toContain("Google DeepMind; Formal Conjectures authors");
    expect(html).toContain("source=source%3Aformal-conjectures");
    expect(html).toContain("cursor=next-native#source-native-results");
  });
});
