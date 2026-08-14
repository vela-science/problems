import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { EvidenceLadder } from "./evidence-ladder";

afterEach(cleanup);

/* Five Claims, all five carrying retained Evidence, one carrying a Proposal. The counts and the
   rung ids come from the same aggregate the page passes in — an Artifact is
   bytes and Evidence is the role those bytes play toward a Claim, and this rung
   counts the second. */
const quantumCodes = [
  { id: "claims", label: "Claim recorded", count: 5 },
  { id: "evidence", label: "Evidence retained", count: 5 },
  { id: "proposal", label: "Proposal recorded", count: 1 },
];

const caption = "Each row counts Claims in this result that reached that stratum.";

const spines = (container: HTMLElement) => container.querySelectorAll(".bg-direction");
const marks = (container: HTMLElement) => [...container.querySelectorAll("circle")];

describe("EvidenceLadder", () => {
  test("prints every label and every count as text beside the bars", () => {
    render(<EvidenceLadder steps={quantumCodes} total={5} caption={caption} />);
    for (const step of quantumCodes) {
      expect(screen.getByText(step.label)).toBeInTheDocument();
    }
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(caption)).toBeInTheDocument();
  });

  test("draws every reached row as a filled disc", () => {
    const { container } = render(<EvidenceLadder steps={quantumCodes} total={5} caption={caption} />);
    const drawn = marks(container);
    expect(drawn).toHaveLength(3);
    expect(drawn.every((mark) => mark.getAttribute("fill") === "currentColor")).toBe(true);
  });

  test("carries the gold rule only as far as standing actually reaches", () => {
    /* Three reached rows means two rules between reached marks. The rule into
       the zero row is not gold: nothing carries forward into it. */
    const { container } = render(<EvidenceLadder steps={quantumCodes} total={5} caption={caption} />);
    expect(spines(container)).toHaveLength(2);
  });

  test("drops the spine entirely when a row exceeds the row above it", () => {
    /* A step larger than its parent is not a subset of it, so the figure stops
       claiming a chain rather than drawing one it cannot support. */
    const { container } = render(
      <EvidenceLadder
        steps={[
          { id: "claims", label: "Claim recorded", count: 5 },
          { id: "evidence", label: "Evidence retained", count: 7 },
          { id: "proposal", label: "Proposal recorded", count: 1 },
        ]}
        total={5}
        caption={caption}
      />,
    );
    expect(spines(container)).toHaveLength(0);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  test("keeps a small reached share at a visible floor", () => {
    const { container } = render(
      <EvidenceLadder
        steps={[
          { id: "claims", label: "Claim recorded", count: 2782 },
          { id: "evidence", label: "Evidence retained", count: 21 },
          { id: "proposal", label: "Proposal recorded", count: 11 },
        ]}
        total={2782}
        caption={caption}
      />,
    );
    const fills = [...container.querySelectorAll<HTMLElement>("li span[style*='min-width']")];
    expect(fills).toHaveLength(3);
    expect(fills.map((fill) => fill.style.minWidth)).toEqual(["2px", "2px", "2px"]);
    expect(Number.parseFloat(fills.at(-1)!.style.width)).toBeLessThan(1);
    expect(screen.getByText("2,782")).toBeInTheDocument();
  });

  test("renders nothing when the result is empty", () => {
    const { container } = render(
      <EvidenceLadder
        steps={quantumCodes.map((step) => ({ ...step, count: 0 }))}
        total={0}
        caption={caption}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
