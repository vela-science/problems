import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ScientificText } from "@vela/ui/vela/scientific-text";

describe("ScientificText", () => {
  test("renders stored inline and display notation as server-safe MathML", () => {
    const { container } = render(<p><ScientificText text={"Let $C(x)$ count values. Then \\[C(x) > x^{0.3}.\\]"} /></p>);

    expect(screen.getByText(/Let/)).toBeVisible();
    expect(container.querySelectorAll("math")).toHaveLength(2);
    expect(container.querySelector('[tabindex="0"]')).toContainHTML("<math");
  });

  test("renders citations without treating untrusted TeX as a link", () => {
    const { container } = render(<ScientificText text={"See \\cite{Ha08} and $\\href{javascript:alert(1)}{x}$."} />);

    expect(screen.getByText("[Ha08]")).toBeVisible();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("[href]")).toBeNull();
    expect(container.querySelector("math")).not.toBeNull();
  });
});

describe("ScientificText source-text handling", () => {
  /* A prize amount is an escaped dollar, not an opening delimiter. This is the
     sentence that broke: math opened at `\$` and closed at the real `$`, so
     KaTeX typeset the English and ran the words together as
     `100foranyimprovementoftheconstant`. */
  test("does not open mathematics at an escaped dollar sign", () => {
    const { container } = render(
      <p><ScientificText text={"Erd\\H{o}s offered \\$100 for improving the constant $1/4$ here."} /></p>,
    );

    expect(container.querySelectorAll("math")).toHaveLength(1);
    expect(container.textContent).toContain("offered $100 for improving the constant");
    expect(container.textContent).not.toContain("\\$");
  });

  /* Text-mode accents sit outside the delimiters, so KaTeX never sees them and
     they reached the page verbatim. This corpus is Erdős; the o-double-acute is
     the whole reason the table exists. */
  test("resolves the text-mode accents the retained statements use", () => {
    const { container } = render(
      <p><ScientificText text={"Erd\\H{o}s and Moser; Chebyshev's \\'{e}tude; P\\'olya; Erd\\Hos again."} /></p>,
    );

    expect(container.textContent).toContain("Erdős and Moser");
    expect(container.textContent).toContain("étude");
    expect(container.textContent).toContain("Pólya");
    expect(container.textContent).toContain("Erdős again");
  });

  /* An unknown command stays verbatim rather than being silently dropped: this
     is source text nobody in this repository authored, and inventing a
     rendering for it would be worse than showing what was retained. */
  test("leaves a command it does not know alone", () => {
    const { container } = render(<p><ScientificText text={"A \\textcolor{red}{note} here."} /></p>);
    expect(container.textContent).toContain("\\textcolor{red}{note}");
  });
});
