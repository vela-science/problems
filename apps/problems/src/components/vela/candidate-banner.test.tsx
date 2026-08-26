import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CandidateBanner } from "./candidate-banner";

const draft = {
  id: "draft_1",
  payloadRoot: `sha256:${"8".repeat(64)}`,
  version: 2,
  updatedAt: "2026-08-26T12:00:00.000Z",
};

describe("the unsigned candidate says what it is not", () => {
  it("shows the Standing it did not change, beside the Claim it targets", () => {
    render(<CandidateBanner
      draft={draft}
      exportHref="/drafts/draft_1/export?workspace=ws_1"
      workbenchHandoff="vela-workbench://continue?v=1"
      target={{ claimId: `vcl_${"b".repeat(64)}`, standing: "accepted" }}
    />);
    const banner = screen.getByRole("region", { name: /unsigned candidate/iu });
    expect(within(banner).getByText(/accepted/iu)).toBeTruthy();
    expect(within(banner).getByText("unchanged")).toBeTruthy();
    expect(within(banner).getByText("unsigned")).toBeTruthy();
    expect(within(banner).getByText(/authority effect · none/iu)).toBeTruthy();
  });

  it("names the four steps, and puts the Decision last", () => {
    render(<CandidateBanner
      draft={draft}
      exportHref="/drafts/draft_1/export?workspace=ws_1"
      target={{ claimId: null, standing: null }}
    />);
    const steps = screen.getByRole("list", { name: /what has to happen next/iu });
    const items = within(steps).getAllByRole("listitem").map((node) => node.textContent ?? "");
    expect(items).toHaveLength(4);
    expect(items[1]).toMatch(/sign it locally with a key only you hold/iu);
    expect(items[3]).toMatch(/Only that moves Standing/iu);
  });

  it("offers the download, and Workbench only when a handoff exists", () => {
    const { rerender } = render(<CandidateBanner
      draft={draft}
      exportHref="/drafts/draft_1/export?workspace=ws_1"
      workbenchHandoff="vela-workbench://continue?v=1"
      target={{ claimId: null, standing: null }}
    />);
    expect(screen.getByRole("link", { name: /download unsigned candidate/iu })).toBeTruthy();
    expect(screen.getByRole("link", { name: /open in workbench/iu })).toBeTruthy();

    rerender(<CandidateBanner
      draft={draft}
      exportHref="/drafts/draft_1/export?workspace=ws_1"
      workbenchHandoff={null}
      target={{ claimId: null, standing: null }}
    />);
    expect(screen.queryByRole("link", { name: /open in workbench/iu })).toBeNull();
  });

  it("says No bound Claim rather than inventing a target", () => {
    render(<CandidateBanner
      draft={draft}
      exportHref="/drafts/draft_1/export?workspace=ws_1"
      target={{ claimId: null, standing: null }}
    />);
    expect(screen.getByText("No bound Claim")).toBeTruthy();
    expect(screen.queryByText(/^Targets$/u)).toBeNull();
  });

  /* The banner must never read as an achievement. A "ready to submit" tick or a
     progress bar would tell a reader that something has been established, and
     nothing has. */
  it("congratulates nobody", () => {
    const { container } = render(<CandidateBanner
      draft={draft}
      exportHref="/drafts/draft_1/export?workspace=ws_1"
      target={{ claimId: `vcl_${"b".repeat(64)}`, standing: "accepted" }}
    />);
    const text = container.textContent ?? "";
    for (const word of ["ready to submit", "complete", "success", "approved", "verified"]) {
      expect(text.toLowerCase()).not.toContain(word);
    }
    expect(container.querySelector("progress")).toBeNull();
  });
});
