import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StartWorkMenu } from "./start-work-menu";

describe("StartWorkMenu", () => {
  /* `problemWorkbenchHandoff` returns null unless every required public field
     resolves, and a Problem with no retained locator has no source to open. A
     disclosure that opens onto nothing is worse than no disclosure, and a dead
     entry inside one is worse still — so absence is the whole control, not a
     disabled row. */
  it("renders nothing when it has no exit to offer", () => {
    const { container } = render(<StartWorkMenu workbenchHandoff={null} sourceLocator={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders for a single available exit", () => {
    render(<StartWorkMenu workbenchHandoff={null} sourceLocator="https://example.org/source" />);
    expect(screen.getByRole("button", { name: /other ways to work/iu })).toBeVisible();
  });

  /* The handoff is provider-neutral by contract: it names a Problem, a source
     revision and an authority Repository, and nothing about who executes. A
     vendor entry here would need a separate product decision. */
  it("offers no vendor destination", () => {
    const { container } = render(
      <StartWorkMenu workbenchHandoff="vela-workbench://continue?v=1" sourceLocator="https://example.org/source" />,
    );
    expect(container.innerHTML).not.toMatch(/chatgpt|openai|claude|anthropic|copilot|cursor/iu);
  });
});
