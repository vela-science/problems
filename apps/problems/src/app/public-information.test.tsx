import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AboutPage from "./about/page";
import AccessibilityPage from "./accessibility/page";
import ContactPage from "./contact/page";
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("public trust surfaces", () => {
  it("explains the product without granting checks or signatures scientific authority", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: /Science should remember the route/ })).toBeVisible();
    expect(screen.getByText(/scoped review records what it observed/iu)).toBeVisible();
    expect(screen.getByText(/signature proves attribution and integrity, not truth/iu)).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse Problems" })).toHaveAttribute("href", "/problems");
    expect(screen.getByRole("link", { name: "Learn about Vela" })).toHaveAttribute("href", "https://vela.space");
/* The essay was removed from vela.space on 2026-08-21, so neither the
       About action nor the information nav offers it any more. */
    expect(screen.queryByRole("link", { name: "Read Endless Frontiers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Essay" })).not.toBeInTheDocument();
  });

  it("states current privacy, terms, and accessibility boundaries", () => {
    const { rerender } = render(<PrivacyPage />);
    expect(screen.getByText(/read-only contents and metadata access/iu)).toBeVisible();
    expect(screen.getByText(/does not store a Repository authority key/iu)).toBeVisible();
    /* The pilot-telemetry item must describe what the endpoint accepts, not
       assert a client property the server cannot verify, and must enumerate
       every stored field including the per-record deduplication identifier. */
    expect(screen.getByText(/The endpoint accepts only these five fields and rejects anything else/iu)).toBeVisible();
    expect(screen.getByText(/random per-record identifier used to discard duplicate sends/iu)).toBeVisible();
    expect(screen.getByText(/accepts no scientific contents, repository files, prompts, credentials, or signatures/iu)).toBeVisible();
    expect(screen.getByText(/deleted after 90 days/iu)).toBeVisible();

    rerender(<TermsPage />);
    expect(screen.getByText(/hosted draft is unsigned/iu)).toBeVisible();
    expect(screen.getByText(/Nothing on the site is medical, legal, financial/iu)).toBeVisible();

    rerender(<AccessibilityPage />);
    expect(screen.getByText(/aims to meet WCAG 2.2 Level AA/iu)).toBeVisible();
    expect(screen.getByText(/target and an ongoing practice, not a claim/iu)).toBeVisible();
  });

  it("fails closed when a monitored private support channel is absent", () => {
    vi.stubEnv("VELA_SUPPORT_EMAIL", "");
    render(<ContactPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Private support is not configured for this release");
    expect(screen.queryByRole("link", { name: /@/u })).not.toBeInTheDocument();
  });

  it("publishes the configured monitored address", () => {
    vi.stubEnv("VELA_SUPPORT_EMAIL", "help@example.org");
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: "help@example.org" })).toHaveAttribute("href", "mailto:help@example.org");
    expect(screen.queryByText(/Private support is not configured/iu)).not.toBeInTheDocument();
  });
});
