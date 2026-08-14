import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { SourceBindings, type SourceBindingRow } from "@/components/vela/source-bindings";

function source(overrides: Partial<SourceBindingRow> & { sourceId: string }): SourceBindingRow {
  return { publisher: "A maintainer", bindings: 12, coverage: "complete", ...overrides };
}

/* The suite is not run with vitest globals, so the library's own teardown is
   never registered and a `screen` query would otherwise read every earlier
   render in the file. */
afterEach(cleanup);

describe("SourceBindings", () => {
  test("draws nothing when the registry declares no source for this Repository", () => {
    const { container } = render(<SourceBindings slug="sidon-sets" sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("gives a row to every source that binds, with its exact count", () => {
    render(
      <SourceBindings
        slug="erdos"
        sources={[
          source({ sourceId: "source:erdos-problems", publisher: "Thomas Bloom", bindings: 2435 }),
          source({ sourceId: "source:gpt-erdos", publisher: "Neel Somani", bindings: 57 }),
        ]}
      />,
    );
    const rows = screen.getAllByRole("link");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("2,435")).toBeVisible();
    expect(screen.getByText("Thomas Bloom")).toBeVisible();
    expect(rows[0]).toHaveAttribute("href", "/sources?repository=erdos&source=source%3Aerdos-problems");
  });

  test("names a declared source that binds nothing instead of dropping it", () => {
    render(
      <SourceBindings
        slug="quantum-codes"
        sources={[
          source({ sourceId: "source:quantum-retained-certificate", bindings: 5 }),
          source({ sourceId: "source:physlib", bindings: 0 }),
        ]}
      />,
    );
    expect(screen.getByText("source:physlib")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  test("marks a source whose observation is not complete, and only that source", () => {
    const { container } = render(
      <SourceBindings
        slug="quantum-codes"
        sources={[
          source({ sourceId: "source:quantum-retained-certificate", bindings: 5, coverage: "complete" }),
          source({ sourceId: "source:codetables-stabilizer", bindings: 0, coverage: "unobserved" }),
        ]}
      />,
    );
    const badges = [...container.querySelectorAll("[data-tone]")];
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent("unobserved");
  });
});
