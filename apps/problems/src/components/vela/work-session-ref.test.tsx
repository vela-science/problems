import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkSessionRef, workSessionScheme } from "./work-session-ref";

vi.mock("server-only", () => ({}));

describe("WorkSessionRef", () => {
  it("names the scheme a retained reference declares", () => {
    expect(workSessionScheme("entire:checkpoint:01KZSESSION")).toBe("Entire");
    render(<WorkSessionRef reference="entire:checkpoint:01KZSESSION" />);
    expect(screen.getByText("Entire session")).toBeVisible();
  });

  /* An unrecognised scheme is still a work session; it is not guessed at. */
  it("does not invent a name for a scheme it does not know", () => {
    expect(workSessionScheme("some-tool:run:9")).toBeNull();
    render(<WorkSessionRef reference="some-tool:run:9" />);
    expect(screen.getByText("work session")).toBeVisible();
  });

  /* Only the reference is retained — no transcript, no checkpoint contents,
     and nothing that would imply this product can show what is behind it. */
  it("does not link out", () => {
    const { container } = render(<WorkSessionRef reference="entire:checkpoint:01KZSESSION" />);
    expect(container.querySelector("a")).toBeNull();
  });
});
