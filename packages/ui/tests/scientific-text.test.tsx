import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ScientificText } from "../src/components/vela/scientific-text";

const render = (text: string) => renderToStaticMarkup(<ScientificText text={text} />);

describe("ScientificText", () => {
  test("typesets paired delimiters", () => {
    const markup = render("For every $n > 0$ there is a prime.");
    expect(markup).toContain("<math");
    expect(markup).toContain("there is a prime.");
  });

  /* The exact docstring Formal Conjectures publishes for Erdős 3. It opens
     maths at "$A", never closes it before "has", and the retained bytes are
     what they are — this product quotes sources, it does not repair them. */
  /* Formal Conjectures states Erdős 3 with five dollar signs, one of them
     missing its partner upstream. Verbatim was the old answer and it left the
     reader looking at raw TeX. The notation is now recovered by ignoring the
     delimiters — but the failure the old behaviour guarded against must not
     come back: splitting at the wrong dollar typesets the English word "has"
     as a product of three variables. */
  test("recovers the notation of a statement whose delimiters do not pair", () => {
    const malformed = "If $A \\subset \\mathbb{N} has $\\sum_{n \\in A}\\frac 1 n = \\infty$, then must $A$ contain arbitrarily long arithmetic progressions?";
    const markup = render(malformed);

    expect(markup).toContain("<math");
    /* Every recovered span parsed; nothing fell back to red source text. */
    expect(markup).not.toContain("katex-error");
    /* The sum arrives as one formula rather than as fragments split on the
       spaces inside its own subscript group. */
    expect(markup).toContain("\\sum_{n \\in A}\\frac 1 n = \\infty");

    /* Prose stays prose, and stays outside every formula. */
    expect(markup).toContain("arithmetic progressions?");
    const mathOnly = markup.match(/<math[\s\S]*?<\/math>/gu)?.join("") ?? "";
    for (const word of ["has", "then", "must", "contain", "arbitrarily"]) {
      expect(mathOnly).not.toContain(word);
    }
  });

  /* Of the fifty statements in the projection whose delimiters do not pair,
     most are not malformed maths at all: an unescaped currency sign leaves the
     rest of an otherwise well-formed statement on the wrong side of the count.
     This is the Zhi-Wei Sun prize wording, which appears four times. */
  test("keeps an unescaped prize amount out of the mathematics", () => {
    const markup = render(
      "Any integer $n \\geq 0$ can be written as $x^2 + y^2 + z^2 + w^2$ with $x, y, z, w$ nonnegative integers. Zhi-Wei Sun has offered a $2,400 prize for the first proof.",
    );
    const mathOnly = markup.match(/<math[\s\S]*?<\/math>/gu)?.join("") ?? "";
    expect(mathOnly).not.toContain("prize");
    expect(mathOnly).not.toContain("2,400");
    expect(mathOnly).not.toContain("nonnegative");
    expect(markup).toContain("2,400 prize for the first proof.");
    /* The genuine notation on the other side of the stray sign still renders. */
    expect(markup).toContain("<math");
    expect(markup).not.toContain("katex-error");
  });

  test("leaves a lone variable in prose alone rather than guessing", () => {
    const markup = render("If $A$ and B are sets $");
    const mathOnly = markup.match(/<math[\s\S]*?<\/math>/gu)?.join("") ?? "";
    expect(mathOnly).not.toContain("and");
    expect(mathOnly).not.toContain("sets");
  });

  test("keeps an escaped dollar out of the delimiter count", () => {
    const markup = render("Erd\\H{o}s offered \\$100 for an improvement of $1/4$ here.");
    expect(markup).toContain("<math");
    expect(markup).toContain("$100");
    expect(markup).toContain("Erdős");
  });

  test("treats an unclosed display group as prose", () => {
    expect(render("A bound \\[x < y and nothing closes it.")).not.toContain("<math");
  });
});

describe("ScientificText markdown", () => {
  test("renders emphasis and inline code the source docstrings carry", () => {
    const markup = render("**Erdős Problem 17.** Are there infinitely many `cluster primes`?");
    expect(markup).toContain("<strong>Erdős Problem 17.</strong>");
    expect(markup).toContain("cluster primes</code>");
    expect(markup).not.toContain("**");
    expect(markup).not.toContain("`");
  });

  test("leaves asterisks and backticks inside mathematics untouched", () => {
    const markup = render("The product $a * b$ is fixed.");
    const mathOnly = markup.match(/<math[\s\S]*?<\/math>/gu)?.join("") ?? "";
    expect(mathOnly).not.toBe("");
    expect(markup).not.toContain("<strong>");
  });

  /* A backslash-backtick is the LaTeX grave accent, not a code fence. Reading
     it as one would swallow the rest of the sentence into a code span. */
  test("keeps a grave accent an accent", () => {
    const markup = render("Erd\\`os and Moser both asked this.");
    expect(markup).not.toContain("<code");
    expect(markup).toContain("Erdòs");
  });
});
