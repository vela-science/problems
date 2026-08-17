import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContributionStepper } from "./contribution-stepper";

describe("ContributionStepper", () => {
  it("shows the complete Problem-first path and marks the current step", () => {
    render(<ContributionStepper current={2} />);
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("Choose a Problem")).toBeInTheDocument();
    expect(screen.getByText("Attach work and evidence").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Review scope and checks")).toBeInTheDocument();
    expect(screen.getByText("Submit the handoff")).toBeInTheDocument();
  });
});
