import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CloneMenu } from "@/components/vela/clone-menu";

afterEach(cleanup);

describe("public Repository source acquisition", () => {
  it("emits the exact anonymous checkout recipe", async () => {
    const user = userEvent.setup();
    render(
      <CloneMenu
        remote="https://github.com/vela-science/math.git"
        cloneCommand="git clone https://github.com/vela-science/math.git"
        commit={"a".repeat(40)}
        reproduceHref="/repositories/math/reproduce"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Get source/u }));

    expect(screen.getByText("Checkout at this release")).toBeInTheDocument();
    const command = screen.getByText(/git clone https:/u).closest("pre");
    expect(command).toHaveTextContent("git clone https://github.com/vela-science/math.git");
    expect(command).toHaveTextContent(`git checkout ${"a".repeat(40)}`);
    expect(screen.getByText(/Pinned to the exact commit/u)).toBeInTheDocument();
  });
});
