import { describe, expect, it } from "vitest";
import { essayDestination } from "./page";

describe("legacy Endless Frontiers route", () => {
  it("targets the canonical editorial origin", () => {
    expect(essayDestination({})).toBe("https://vela.space/constellations");
  });

  it("preserves repeated query values without accepting a destination override", () => {
    expect(essayDestination({
      ref: ["archive", "notes"],
      next: "https://evil.example",
    })).toBe("https://vela.space/constellations?ref=archive&ref=notes&next=https%3A%2F%2Fevil.example");
  });
});
