import { describe, expect, it } from "vitest";
import { isJustTheName } from "@/lib/problem-label";

/* Nine of the first fifty-five rows carry the generated name as their label,
   so the Question column read "Erdős problem 2" as though that were the
   question. Testing the statement field was not enough — these rows hold the
   name in `label`, and `statement_kind` is "formal" — so the test is whether
   the text on offer is the Problem's own name. */
describe("isJustTheName", () => {
  it("recognises the collection's generated name", () => {
    expect(isJustTheName("Erdős problem 2", "2")).toBe(true);
    expect(isJustTheName("Problem 2", "2")).toBe(true);
  });

  it("accepts the unaccented spelling a source may use", () => {
    expect(isJustTheName("Erdos problem 94", "94")).toBe(true);
  });

  it("ignores case and collapsed whitespace", () => {
    expect(isJustTheName("  erdős   problem   5 ", "5")).toBe(true);
  });

  /* The number has to match: a real statement that merely mentions another
     Problem's name is still a statement. */
  it("does not match a different Problem's name", () => {
    expect(isJustTheName("Erdős problem 3", "2")).toBe(false);
  });

  it("leaves a real statement alone", () => {
    expect(isJustTheName("Is there a covering system all of whose moduli are odd?", "7")).toBe(false);
    expect(isJustTheName("Erdős problem 2 is disproved by Smith", "2")).toBe(false);
  });
});
