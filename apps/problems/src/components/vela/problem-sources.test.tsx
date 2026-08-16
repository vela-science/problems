import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProblemSourceReadResult } from "@vela/projection-data";
import { afterEach, describe, expect, it } from "vitest";
import { ProblemSources } from "./problem-sources";

const root = (digit: string): `sha256:${string}` => `sha256:${digit.repeat(64)}`;

const sources = {
  schema: "vela.problem-source-read.v1",
  release_root: root("1"),
  resolver_root: root("2"),
  resolution_namespace: "erdos-problems",
  semantics: {
    authority_effect: "none",
    entity_effect: "navigation_group_only",
    candidate_effect: "shared_namespace_and_source_number_only",
    statement_identity: "not_established",
    equivalence: "not_established",
  },
  problem_number: 321,
  candidate_limit: 250,
  canonical_record: {
    schema: "vela.math-native-record.v1",
    source_id: "source:erdos-problems",
    observation_root: root("3"),
    native_id: "erdos:321",
    native_kind: "problem",
    native_revision: null,
    title: "Erdős Problem 321",
    summary: null,
    locators: [{ locator_id: "problem", kind: "homepage", url: "https://example.test/erdos/321" }],
    metadata: { problem_number: 321 },
    metadata_root: root("4"),
    content_root: root("5"),
    availability: "available",
    row_root: root("6"),
  },
  entity: {
    entity_id: "problem:erdos:321",
    resolution_namespace: "erdos-problems",
    label: "Erdős Problem 321",
    problem_number: 321,
    canonical_occurrence: {
      source_id: "source:erdos-problems",
      native_id: "erdos:321",
      native_kind: "problem",
      content_root: root("5"),
    },
    authority_effect: "none",
    identity_claim: "navigation_group_only",
  },
  occurrences: [
    {
      occurrence_key: "source:erdos-problems\u0000problem\u0000erdos:321",
      source_id: "source:erdos-problems",
      source_label: "Erdős Problems",
      source_role: "problem_catalog",
      native_id: "erdos:321",
      native_kind: "problem",
      title: "Erdős Problem 321",
      summary: null,
      locators: [{ locator_id: "problem", kind: "homepage", url: "https://example.test/erdos/321" }],
      row_root: root("6"),
      occurrence_status: "canonical_anchor",
      relation_kind: null,
      statement_identity: "not_established",
      authority_effect: "none",
    },
    {
      occurrence_key: "source:formal-conjectures\u0000formal_conjecture\u0000Erdos321.erdos_321",
      source_id: "source:formal-conjectures",
      source_label: "Formal Conjectures",
      source_role: "formal_statement_library",
      native_id: "Erdos321.erdos_321",
      native_kind: "formal_conjecture",
      title: "Erdős 321 formal statement",
      summary: "A Lean declaration with an unfilled proof body.",
      locators: [{ locator_id: "git", kind: "git", url: "https://example.test/formal/321" }],
      row_root: root("7"),
      occurrence_status: "reviewed_reference",
      relation_kind: "formal_statement_reference",
      statement_identity: "not_established",
      authority_effect: "none",
    },
    {
      occurrence_key: "source:vibemathed\u0000attributed_activity\u0000vibemathed:erdos-321",
      source_id: "source:vibemathed",
      source_label: "VibeMathed",
      source_role: "attributed_activity_catalog",
      native_id: "vibemathed:erdos-321",
      native_kind: "attributed_activity",
      title: "Source contributor labels this solved",
      summary: "An attributed activity record, not a Vela Decision.",
      locators: [{ locator_id: "activity", kind: "homepage", url: "https://example.test/vibe/321" }],
      row_root: root("8"),
      occurrence_status: "candidate_number_link",
      relation_kind: null,
      statement_identity: "not_established",
      authority_effect: "none",
    },
  ],
  statements: [
    {
      statement_id: "statement:formal:321",
      occurrence_key: "source:formal-conjectures\u0000formal_conjecture\u0000Erdos321.erdos_321",
      source_id: "source:formal-conjectures",
      source_role: "formal_statement_library" as const,
      statement_form: "formal" as const,
      text: "A Lean declaration with an unfilled proof body.",
      locator_url: "https://example.test/formal/321",
      row_root: root("7"),
      statement_identity: "not_established",
      authority_effect: "none",
    },
    {
      statement_id: "statement:vibe:321",
      occurrence_key: "source:vibemathed\u0000attributed_activity\u0000vibemathed:erdos-321",
      source_id: "source:vibemathed",
      source_role: "attributed_activity_catalog" as const,
      statement_form: "prose" as const,
      text: "An attributed activity record, not a Vela Decision.",
      locator_url: null,
      row_root: root("8"),
      statement_identity: "not_established",
      authority_effect: "none",
    },
  ],
  coverage: [
    { source_id: "source:erdos-problems", resolution_namespace: "erdos-problems", label: "Erdős Problems", source_role: "problem_catalog", source_occurrences: 1, reviewed_occurrences: 1, statement_occurrences: 0 },
    { source_id: "source:formal-conjectures", resolution_namespace: "erdos-problems", label: "Formal Conjectures", source_role: "formal_statement_library", source_occurrences: 1, reviewed_occurrences: 1, statement_occurrences: 1 },
    { source_id: "source:vibemathed", resolution_namespace: "erdos-problems", label: "VibeMathed", source_role: "attributed_activity_catalog", source_occurrences: 1, reviewed_occurrences: 0, statement_occurrences: 1 },
    { source_id: "source:gpt-erdos", resolution_namespace: "erdos-problems", label: "GPT Erdős", source_role: "attributed_classification_catalog", source_occurrences: 0, reviewed_occurrences: 0, statement_occurrences: 0 },
  ],
  relations: [{
    relation_id: root("9"),
    entity_id: "problem:erdos:321",
    occurrence_key: "source:formal-conjectures\u0000formal_conjecture\u0000Erdos321.erdos_321",
    kind: "formal_statement_reference",
    statement_identity: "not_established",
    equivalence: "not_established",
    authority_effect: "none",
  }],
  identity_events: [{
    kind: "reviewed_resolver_config",
    resolver_root: root("2"),
    reviewed_occurrence_count: 2,
    identity_claim: "navigation_group_only",
    authority_effect: "none",
  }],
} satisfies ProblemSourceReadResult;

afterEach(cleanup);

describe("ProblemSources", () => {
  it("renders a responsive semantic coverage matrix and every retained statement", () => {
    const { container } = render(<ProblemSources sources={sources} />);

    expect(screen.getByRole("heading", { name: "Source coverage" })).toBeInTheDocument();
    expect(screen.getByText(/source family, shared numbers are candidate navigation only/u)).toBeVisible();
    expect(screen.getByText(/do not establish occurrence or statement identity, implication, or equivalence/u)).toBeVisible();
    expect(screen.getByText(/no authority effect/u)).toBeVisible();

    const table = screen.getByRole("table", { name: "Problem source coverage" });
    expect(table).toHaveClass("table-fixed");
    expect(table.closest("[data-source-coverage]")).toHaveClass("min-w-0");
    expect(table.closest("[data-source-coverage]")).not.toHaveClass("overflow-x-auto");
    expect(within(table).getByRole("columnheader", { name: "Source occurrences" })).toHaveAttribute("scope", "col");
    expect(within(table).getByRole("columnheader", { name: "Reviewed occurrences" })).toHaveAttribute("scope", "col");

    const formal = within(table).getByRole("rowheader", { name: /Formal Conjectures/u }).closest("tr");
    expect(formal).not.toBeNull();
    expect(within(formal as HTMLElement).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["1", "1", "1"]);
    /* A Source with no record for this Problem is a true coverage fact and is
       still disclosed, but it is not a table row: on a Problem with one
       occurrence those rows outnumbered the one that matters. */
    expect(within(table).queryByRole("rowheader", { name: /GPT Erdős/u })).toBeNull();
    const withheld = screen.getByText(/Sources? retains? no record for this Problem/u);
    expect(withheld).toBeVisible();
    expect(within(withheld.closest("details") as HTMLElement).getByText(/GPT Erdős/u)).toBeInTheDocument();

    const statementLedger = screen.getByRole("list", { name: "Retained source statements" });
    expect(within(statementLedger).getAllByRole("listitem")).toHaveLength(2);
    expect(within(statementLedger).getByText(/Lean declaration with an unfilled proof body/u)).toBeVisible();
    expect(within(statementLedger).getByText(/attributed activity record, not a Vela Decision/u)).toBeVisible();
    expect(container.querySelector("[data-slot='card']")).toBeNull();
  });

  it("keeps Formal Conjectures and VibeMathed records off the Standing axis", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProblemSources sources={sources} />);

    expect(screen.queryByText(/Standing/u)).not.toBeInTheDocument();
    expect(container.querySelector("[data-tone]")).toBeNull();

    const trigger = screen.getByRole("button", { name: /All exact occurrences/u });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const ledger = screen.getByRole("list", { name: "Exact source occurrences" });
    expect(within(ledger).getAllByRole("listitem")).toHaveLength(3);
    expect(within(ledger).getByText("Formal statement reference")).toBeVisible();
    expect(within(ledger).getByText("Canonical source occurrence")).toBeVisible();
    expect(within(ledger).getAllByText("Number candidate")).toHaveLength(1);
    expect(within(ledger).getAllByText(/Statement identity not established · no authority effect/u)).toHaveLength(3);
    expect(within(ledger).getByText("Source contributor labels this solved")).toBeVisible();
    expect(within(ledger).queryByText(/Standing accepted|Standing solved/u)).not.toBeInTheDocument();
  });

  it("keeps an unreviewed canonical anchor distinct from same-number candidates", async () => {
    const user = userEvent.setup();
    render(<ProblemSources sources={{
      ...sources,
      entity: null,
      occurrences: [sources.occurrences[0]!, sources.occurrences[2]!],
      statements: [],
    }} />);

    expect(screen.getByText(/No reviewed navigation grouping covers this source record/u)).toBeVisible();
    expect(screen.getByText(/canonical occurrence remains exact/u)).toBeVisible();
    expect(screen.getByText(/every other same-number record below remains candidate navigation only/u)).toBeVisible();
    expect(screen.getByText(/No statement text is retained in this reviewed source set/u)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /All exact occurrences/u }));
    const ledger = screen.getByRole("list", { name: "Exact source occurrences" });
    expect(within(ledger).getByText("Canonical source occurrence")).toBeVisible();
    expect(within(ledger).getByText("Number candidate")).toBeVisible();
    expect(within(ledger).queryByText("Reviewed reference")).not.toBeInTheDocument();
  });
});
