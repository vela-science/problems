import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { WorkAction } from "./work-action";

describe("WorkAction", () => {
  it("keeps optional work controls behind one accessible disclosure", async () => {
    const user = userEvent.setup();
    render(<WorkAction title="Prepare a draft" description="Only when ready"><label>Assertion<input /></label></WorkAction>);

    const trigger = screen.getByRole("button", { name: /Prepare a draft/u });
    expect(screen.queryByLabelText("Assertion")).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByLabelText("Assertion")).toBeInTheDocument();
  });
});
