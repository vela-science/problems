import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssertionText } from "./assertion-text";

vi.mock("server-only", () => ({}));

afterEach(cleanup);

describe("AssertionText", () => {
  it("elides an exact digest while keeping the whole value reachable", () => {
    const commit = "423344341fbfdf4f8f684a302c5d05379125e7dc";
    const { container } = render(<AssertionText text={`At lean-proofs commit ${commit}, the identity holds.`} />);

    expect(container).toHaveTextContent("At lean-proofs commit");
    expect(container).toHaveTextContent("the identity holds.");
    /* Elided on screen, complete in the accessibility tree and in a copy — the
       same contract every other exact value on these surfaces keeps. */
    const completions = container.querySelectorAll("span.sr-only");
    expect(completions).toHaveLength(1);
    expect(completions[0]!.textContent).toBe(commit);
    expect(container.textContent).toContain(commit);
  });

  it("elides a prefixed root", () => {
    const root = `sha256:${"a".repeat(64)}`;
    const { container } = render(<AssertionText text={`Retained at ${root} exactly.`} />);
    expect(container).toHaveTextContent("Retained at");
    expect(container).toHaveTextContent("exactly.");
    expect(container.textContent).toContain("a".repeat(64));
  });

  /* A sixty-four character hex run is legal inside `$…$`. Splitting there
     would hand KaTeX two unbalanced fragments and lose the formula, so the
     whole string goes through scientific text untouched instead. */
  it("does not split a digest out of a math span", () => {
    const inside = `$x = ${"b".repeat(64)}$`;
    const { container } = render(<AssertionText text={inside} />);
    /* `RecordId` is what an elision renders as, and it emits exactly one
       sr-only completion per digest. None here means the string went through
       scientific text whole, which is the point. */
    expect(container.querySelectorAll("span.sr-only")).toHaveLength(0);
  });

  it("leaves an assertion with no digest alone", () => {
    render(<AssertionText text="The sum over distinct distances equals P.card.choose 2." />);
    expect(screen.getByText(/The sum over distinct distances/u)).toBeVisible();
  });
});
