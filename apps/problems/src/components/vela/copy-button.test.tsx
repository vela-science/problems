import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { CopyButton } from "@vela/ui/vela/copy-button";

test("copies the exact supplied bytes and reports success", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(<CopyButton value={"vela reproduce ."} />);

  await userEvent.click(screen.getByRole("button", { name: "Copy commands" }));

  expect(writeText).toHaveBeenCalledWith("vela reproduce .");
  expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
});
