import { describe, expect, it } from "vitest";
import { activityStrings } from "./problem-activity-records";

/* The Erdős AI contributions wiki retains these fields as a JSON string, not
   an array. Rendered raw, a row read `MACHINE ["Codex","GPT-5.2 Thinking"]`
   and an empty list read `PEOPLE []` — a bracket pair presented as the name of
   a person. The surface only ever rendered on a Problem with no current
   Result, so nothing caught it until it was shown on Work. */
describe("activityStrings", () => {
  it("parses a JSON array retained as a string", () => {
    expect(activityStrings('["Codex","Seed Prover"]')).toEqual(["Codex", "Seed Prover"]);
  });

  it("treats an empty retained list as absent, not as a value", () => {
    expect(activityStrings("[]")).toEqual([]);
  });

  it("splits a semicolon-joined run into separate names", () => {
    expect(activityStrings('["GPT-5.2 Thinking; Seed Prover"]')).toEqual(["GPT-5.2 Thinking", "Seed Prover"]);
  });

  it("keeps a real array as it is", () => {
    expect(activityStrings(["Codex", "  ", "Sol"])).toEqual(["Codex", "Sol"]);
  });

  it("keeps a plain string as one name", () => {
    expect(activityStrings("Terence Tao")).toEqual(["Terence Tao"]);
  });

  /* A source that writes something bracket-shaped but not JSON should have its
     own text shown rather than be silently dropped. */
  it("falls back to the source text when the brackets are not JSON", () => {
    expect(activityStrings("[unparseable")).toEqual(["[unparseable"]);
  });

  it("has nothing to show for absent or non-string values", () => {
    expect(activityStrings(null)).toEqual([]);
    expect(activityStrings(undefined)).toEqual([]);
    expect(activityStrings(42)).toEqual([]);
  });
});
