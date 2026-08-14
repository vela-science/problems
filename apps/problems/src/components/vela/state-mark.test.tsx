import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { StatusBadge } from "@vela/ui/vela/status-badge";

describe("StatusBadge", () => {
  test.each([
    ["evidence", "replayed"],
    ["progress", "strict pass"],
    ["caution", "pending review"],
    ["conflict", "strict blocked"],
  ] as const)("renders %s state with visible language", (tone, label) => {
    render(<StatusBadge tone={tone}>{label}</StatusBadge>);
    const mark = screen.getByText(label).closest("span");
    expect(mark).toBeVisible();
    expect(mark?.parentElement?.querySelector("svg")).not.toBeNull();
  });

  test("keeps decision, verification, replay, and conformance semantics visually distinct", () => {
    const { container } = render(
      <>
        <StatusBadge state="accepted">accepted</StatusBadge>
        <StatusBadge state="verified">verified</StatusBadge>
        <StatusBadge state="replayed">replayed</StatusBadge>
        <StatusBadge state="strict_pass">strict pass</StatusBadge>
      </>,
    );

    const badges = [...container.querySelectorAll("[data-state]")];
    expect(badges).toHaveLength(4);
    expect(badges[0]).toHaveAttribute("data-tone", "progress");
    expect(badges.slice(1).every((badge) => badge?.getAttribute("data-tone") === "evidence")).toBe(true);
    expect(new Set(badges.map((badge) => badge?.querySelector("svg")?.innerHTML)).size).toBe(4);
  });
});
