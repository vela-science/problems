import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Actor } from "./actor";

describe("Actor", () => {
  afterEach(cleanup);

  it("links only an exact performer identity", () => {
    render(<Actor name="Review agent" kind="ai_model" performerId="agent:reviewer" />);
    expect(screen.getByRole("link", { name: "Review agent" })).toHaveAttribute("href", expect.stringMatching(/^\/people\/p-/u));
  });

  it("does not turn a classified display name into an identity link", () => {
    render(<Actor name="agent:reviewer" kind="ai_model" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("agent:reviewer")).toBeVisible();
  });

  it("encodes the retained identity rather than the display label", () => {
    render(<Actor name="Display label" kind="human" performerId="actor:stable-id" />);
    const href = screen.getByRole("link", { name: "Display label" }).getAttribute("href");
    expect(href).toMatch(/^\/people\/p-/u);
    expect(href).not.toContain("Display");
  });

  it("does not infer a public profile from a display name", () => {
    render(<Actor name="GPT-looking human name" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("GPT-looking human name")).toBeVisible();
  });
});
