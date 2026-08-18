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
  test("refuses to typeset a statement whose delimiters do not pair", () => {
    const malformed = "If $A \\subset \\mathbb{N} has $\\sum_{n \\in A}\\frac 1 n = \\infty$, then must $A$ contain arbitrarily long arithmetic progressions?";
    const markup = render(malformed);
    expect(markup).not.toContain("<math");
    expect(markup).toContain("has");
    expect(markup).toContain("arithmetic progressions?");
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
