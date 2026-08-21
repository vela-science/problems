import { describe, expect, it } from "vitest";
import { essayDestination } from "./page";

/* The essay this address was published for was removed from vela.space on
   2026-08-21. The address survives because it was published; it now lands on
   the site root. */
describe("legacy Endless Frontiers route", () => {
  it("targets the canonical editorial origin", () => {
    expect(essayDestination({})).toBe("https://vela.space/");
  });

  it("preserves repeated query values without accepting a destination override", () => {
    expect(essayDestination({
      ref: ["archive", "notes"],
      next: "https://evil.example",
    })).toBe("https://vela.space/?ref=archive&ref=notes&next=https%3A%2F%2Fevil.example");
  });
});
