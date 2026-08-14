import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ObservedSourceCorpusMap } from "@/lib/scientific-state";
import { SourceCorpusMap } from "./source-corpus-map";

const root = (digit: string): `sha256:${string}` => `sha256:${digit.repeat(64)}`;

const corpus = {
  schema: "vela.source-corpus-map-read.v1",
  release_root: root("1"),
  profile_root: root("2"),
  semantics: {
    authority_effect: "none",
    identity_effect: "none",
    equivalence: "not_established",
    standing_effect: "none",
    classification_basis: "explicit_source_profile",
    record_count_effect: "inventory_only",
    source_values: "source_authored",
    unprofiled_sources: "inventory_only",
  },
  coverage_complete: true,
  inventory: {
    source_count: 4,
    observation_count: 4,
    observed_source_count: 3,
    unobserved_source_count: 1,
    native_record_count: 7,
    repository_binding_count: 0,
    source_kinds: [
      { source_kind: "formal_library", source_count: 1, native_record_count: 2 },
      { source_kind: "problem_collection", source_count: 2, native_record_count: 5 },
      { source_kind: "proof_manifest", source_count: 1, native_record_count: 0 },
    ],
    sources: [
      { source_id: "source:erdos-problems", source_kind: "problem_collection", declaration_root: root("3"), observation_root: root("4"), coverage_status: "complete", native_record_count: 3, repository_binding_count: 0 },
      { source_id: "source:formal-conjectures", source_kind: "formal_library", declaration_root: root("5"), observation_root: root("6"), coverage_status: "complete", native_record_count: 2, repository_binding_count: 0 },
      { source_id: "source:vibemathed", source_kind: "problem_collection", declaration_root: root("7"), observation_root: root("8"), coverage_status: "complete", native_record_count: 2, repository_binding_count: 0 },
      { source_id: "source:unprofiled-proof", source_kind: "proof_manifest", declaration_root: root("9"), observation_root: root("a"), coverage_status: "unobserved", native_record_count: 0, repository_binding_count: 0 },
    ],
  },
  corpora: [
    {
      source_id: "source:erdos-problems",
      source_label: "Erdős Problems",
      source_kind: "problem_collection",
      native_kind: "problem",
      corpus_role: "problem_catalog",
      role_label: "Problem catalogue",
      declaration_root: root("3"),
      observation_root: root("4"),
      source_record_count: 3,
      record_count: 3,
      facet: {
        kind: "metadata_string_array",
        key: "tags",
        label: "Source topics",
        multi_valued: true,
        records_with_value: 2,
        missing_records: 1,
        assignment_count: 3,
        values: [
          { value: "graph theory", record_count: 1 },
          { value: "number theory", record_count: 2 },
        ],
      },
    },
    {
      source_id: "source:formal-conjectures",
      source_label: "Formal Conjectures",
      source_kind: "formal_library",
      native_kind: "formal_conjecture",
      corpus_role: "formal_statement_library",
      role_label: "Formal statement library",
      declaration_root: root("5"),
      observation_root: root("6"),
      source_record_count: 2,
      record_count: 2,
      facet: {
        kind: "metadata_scalar",
        key: "collection",
        label: "Source collections",
        multi_valued: false,
        records_with_value: 2,
        missing_records: 0,
        assignment_count: 2,
        values: [
          { value: "Erdős Problems", record_count: 1 },
          { value: "Wikipedia", record_count: 1 },
        ],
      },
    },
    {
      source_id: "source:vibemathed",
      source_label: "VibeMathed",
      source_kind: "problem_collection",
      native_kind: "attributed_activity",
      corpus_role: "attributed_activity_catalog",
      role_label: "Attributed activity catalogue",
      declaration_root: root("7"),
      observation_root: root("8"),
      source_record_count: 2,
      record_count: 2,
      facet: {
        kind: "metadata_scalar",
        key: "field_group",
        label: "Source field groups",
        multi_valued: false,
        records_with_value: 2,
        missing_records: 0,
        assignment_count: 2,
        values: [
          { value: "Algebra", record_count: 1 },
          { value: "Combinatorics", record_count: 1 },
        ],
      },
    },
  ],
} satisfies ObservedSourceCorpusMap;

afterEach(cleanup);

describe("SourceCorpusMap", () => {
  it("orients across every retained Source without presenting record volume as rank", () => {
    const { container } = render(<SourceCorpusMap corpus={corpus} />);
    expect(screen.getByRole("heading", { name: "7 source-native records across 4 exact Sources" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Inspect Source registry" })).toHaveAttribute("href", "/sources");
    expect(screen.getByText(/Problem directory admits only explicitly profiled problem catalogues/u)).toBeVisible();
    expect(screen.getByText(/Counts are inventory, not scientific rank/u)).toBeVisible();
    expect(screen.getByText(/does not establish shared Problem identity, equivalence, Verification, Decision, or Standing/u)).toBeVisible();

    const sourceKinds = screen.getByRole("table", { name: "Retained Source kinds" });
    expect(within(sourceKinds).getByRole("rowheader", { name: "Formal library" })).toBeVisible();
    expect(within(sourceKinds).getByRole("rowheader", { name: "Problem collection" })).toBeVisible();
    expect(screen.getByRole("img", { name: /Retained record volume by declared Source kind: 7 total/u })).toBeVisible();
    expect(container.querySelector("[data-slot='card']")).toBeNull();
    expect(container.querySelector("[data-tone]")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("keeps every source-authored bucket and missing count in one semantic table per corpus", () => {
    render(<SourceCorpusMap corpus={corpus} />);
    const erdosRegion = screen.getByRole("region", { name: "Erdős Problems complete source topics table" });
    const erdosTable = within(erdosRegion).getByRole("table", { name: "Erdős Problems complete source topics" });
    expect(within(erdosTable).getByRole("rowheader", { name: "graph theory" })).toBeVisible();
    expect(within(erdosTable).getByRole("rowheader", { name: "number theory" })).toBeVisible();
    expect(within(erdosTable).getByRole("rowheader", { name: "Missing or not supplied" }).closest("tr")).toHaveTextContent("1");
    expect(screen.getByText("3 source assignments; values remain source-authored.")).toBeVisible();

    const formalRegion = screen.getByRole("region", { name: "Formal Conjectures complete source collections table" });
    expect(within(formalRegion).getByRole("rowheader", { name: "Wikipedia" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Formal Conjectures" })).toHaveAttribute("href", "/sources/source%3Aformal-conjectures");
    expect(screen.getByRole("link", { name: "VibeMathed" })).toHaveAttribute("href", "/sources/source%3Avibemathed");
  });

  it("discloses exact roots and retains the complete inventory table", () => {
    render(<SourceCorpusMap corpus={corpus} />);
    expect(screen.getByText(root("1"))).toBeVisible();
    expect(screen.getByText(root("2"))).toBeVisible();
    expect(screen.getByText("All 4 exact Sources and observation roots")).toBeInTheDocument();

    const inventory = screen.getByRole("table", { name: "All retained Sources in this exact release", hidden: true });
    expect(within(inventory).getAllByRole("row", { hidden: true })).toHaveLength(5);
    expect(within(inventory).getByRole("link", { name: "source:unprofiled-proof", hidden: true })).toHaveAttribute("href", "/sources/source%3Aunprofiled-proof");
    expect(within(inventory).getByText("unobserved", { exact: true })).toBeInTheDocument();
    expect(within(inventory).getByText(root("a"))).toBeInTheDocument();
  });

  it("recomposes three corpus lanes structurally without duplicating tables", () => {
    const { container } = render(<SourceCorpusMap corpus={corpus} />);
    const laneGrid = container.querySelector(".lg\\:grid-cols-3");
    expect(laneGrid).not.toBeNull();
    expect(screen.getAllByRole("region", { name: /complete source .* table/u })).toHaveLength(3);
    expect(container.querySelectorAll("[data-corpus-segment]")).toHaveLength(8);
  });
});
