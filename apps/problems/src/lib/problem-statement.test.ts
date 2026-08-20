import { describe, expect, it } from "vitest";
import { statementPlainText } from "./problem-statement";

/* `statementPlainText` has one consumer: the accessible name of a Problem row.
   Its whole job is to be readable when spoken, so every assertion here is about
   what a screen reader would announce. */
describe("statementPlainText", () => {
  it("speaks the notation of the Erdős 94 question instead of its markup", () => {
    const name = statementPlainText(
      "Suppose $n$ points in $\\mathbb{R}^2$ determine a convex polygon and the set of distances is $\\{u_1,\\ldots,u_t\\}$.",
    );
    /* The defect this replaced: "backslash mathbb brace R brace caret 2". */
    expect(name).not.toContain("\\");
    expect(name).not.toContain("{");
    expect(name).not.toContain("}");
    expect(name).not.toContain("^");
    expect(name).toContain("Suppose n points in R 2 determine");
    expect(name).toContain("…");
  });

  it("maps the relations and constants a spoken label needs", () => {
    expect(statementPlainText("$\\sum_{n \\in A} 1/n = \\infty$")).toContain("∑");
    expect(statementPlainText("$\\sum_{n \\in A} 1/n = \\infty$")).toContain("∈");
    expect(statementPlainText("$\\sum_{n \\in A} 1/n = \\infty$")).toContain("∞");
    expect(statementPlainText("$a \\leq b$ and $c \\geq d$")).toBe("a ≤ b and c ≥ d");
    expect(statementPlainText("$A \\subseteq \\mathbb{N}$")).toBe("A ⊆ N");
  });

  it("says a fraction the way it is written", () => {
    expect(statementPlainText("$\\frac{1}{n}$")).toBe("1/n");
  });

  it("leaves a named operator as the word it already is", () => {
    /* `\log` needs no table entry — without the backslash it is the word. */
    expect(statementPlainText("$\\log n$")).toBe("log n");
    expect(statementPlainText("$\\max(a,b)$")).toBe("max (a,b)");
  });

  it("keeps prose untouched and still resolves a citation", () => {
    expect(statementPlainText("Is every such set finite? \\cite{Erdos1950}")).toBe(
      "Is every such set finite? [Erdos1950]",
    );
  });

  it("says the letter under a text-mode accent", () => {
    /* The corpus is Erdős, and it spells him four different ways. */
    expect(statementPlainText('Erd\\H{o}s and S\u00e1rk\\"ozi proved')).toBe("Erdos and S\u00e1rkozi proved");
  });

  it("keeps a prize amount, which is money and not a delimiter", () => {
    /* 48 statements carry an unescaped currency sign, which makes the `$` count
       odd so nothing is unwrapped. What is left is then either money \u2014 digits
       that end there \u2014 or a delimiter whose partner the source never wrote.
       Keeping the first and dropping the second is the difference between
       "offered 50" and a label that says "dollar" four times. */
    expect(statementPlainText("Erd\u0151s offered $50 for a solution to $n > 1$.")).toBe(
      "Erd\u0151s offered $50 for a solution to n > 1.",
    );
    /* A formula opening with a digit is notation, not money. */
    expect(statementPlainText("A bound of $2^n$ and a prize of $100 offered.")).toBe(
      "A bound of 2 n and a prize of $100 offered.",
    );
    /* Escaped, the amount is not counted, the delimiters pair, and the
       notation unwraps as usual. */
    expect(statementPlainText("A prize of \\$50 for $n > 1$.")).toBe("A prize of $50 for n > 1 .");
  });

  it("leaves a statement with no notation exactly as written", () => {
    const prose = "Is there a covering system all of whose moduli are odd?";
    expect(statementPlainText(prose)).toBe(prose);
  });
});
