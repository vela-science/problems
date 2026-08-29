import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Reach } from "@/components/vela/reach";

const STOPS = [
  { label: "Source", reached: true, detail: "erdos-problems" },
  { label: "Statement", reached: true, detail: "Retained" },
  { label: "Formal", reached: false, detail: "None associated" },
  { label: "Work", reached: true, detail: "2 checks" },
];

describe("Reach", () => {
  /* The record is not monotone: a Problem can retain a formal declaration and
     no statement text. A single fill bar would have painted over that gap, so
     each segment is coloured by its own stage. */
  it("keeps an unreached stage visible between two reached ones", () => {
    const html = renderToStaticMarkup(<Reach stops={STOPS} endpoint="Answer" caption="c" />);
    const segments = [...html.matchAll(/w-auto (bg-primary|bg-border)/gu)].map((match) => match[1]);
    /* Source→Statement is travelled. Statement→Formal and Formal→Work are not,
       because a stretch needs both of its ends. Work→the question is never
       travelled, on any Problem. */
    expect(segments).toEqual(["bg-primary", "bg-border", "bg-border", "bg-border"]);
  });

  /* The sail is a position, not a status: it rides the furthest stage the
     record actually reaches, which is not the same as the last one. */
  it("puts the mark on the furthest reached stage, not the last stage", () => {
    const html = renderToStaticMarkup(<Reach stops={STOPS} endpoint="Answer" caption="c" />);
    expect(html.indexOf("<svg")).toBeGreaterThan(html.indexOf("None associated"));
    expect([...html.matchAll(/<svg/gu)]).toHaveLength(1);
  });

  /* An open Problem is exactly one whose question has not been reached, so the
     terminal node can never be filled — including when every stage is. */
  it("never fills the terminal node", () => {
    const all = STOPS.map((stop) => ({ ...stop, reached: true }));
    const html = renderToStaticMarkup(<Reach stops={all} endpoint="Answer" caption="c" />);
    expect(html).toContain("border-dashed border-muted-foreground");
    expect(html).toContain("Not established");
    expect(html).not.toMatch(/border-dashed[^"]*bg-primary/u);
    /* Every stage reached, and the last stretch is still grey. */
    expect([...html.matchAll(/w-auto (bg-primary|bg-border)/gu)].at(-1)?.[1]).toBe("bg-border");
  });

  /* Colour and geometry are reinforcement. Every stage prints its own state as
     ordinary text, so the instrument survives forced colours and greyscale. */
  it("prints every stage as text", () => {
    const html = renderToStaticMarkup(<Reach stops={STOPS} endpoint="Answer" caption="A caption." />);
    for (const stop of STOPS) {
      expect(html).toContain(stop.label);
      expect(html).toContain(stop.detail);
    }
    expect(html).toContain("A caption.");
  });
});
