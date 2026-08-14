import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ProposalSweep } from "./proposal-sweep";
import { sweepFamily } from "@/lib/claim-shape";

function scan(lo: number, hi: number, primes: number, p: number, residue: number) {
  return `An exhaustive bounded search of the ${primes} primes in the inclusive range ${lo}..${hi} found no k=15 witness; the maximum multiplicity observed was 11 at p=${p}, residue ${residue}.`;
}

const ROWS = [
  { proposal_id: "vpr_a", status: "accepted", claim: scan(10429601, 10429800, 13, 10429717, 2060465) },
  { proposal_id: "vpr_b", status: "accepted", claim: scan(10429801, 10430000, 12, 10429973, 7723031) },
  { proposal_id: "vpr_c", status: "accepted", claim: scan(10430001, 10430200, 11, 10430171, 4302968) },
  { proposal_id: "vpr_d", status: "rejected", claim: "Computed the bounded Erdős 1056 k=15 search over primes in 10430001..10430200 and produced a complete negative-range candidate artifact: 11 primes tested, maximum multiplicity 11 at p=10430171 with residue 4302968." },
];

function markup(rows: typeof ROWS) {
  return renderToStaticMarkup(<ProposalSweep slug="erdos" family={sweepFamily(rows)} />);
}

/* Rect geometry is read back out of the markup rather than asserted as a
   pixel, because the contract is "extent decodes to the integers swept", not
   "this rect is 148 units wide". */
function rects(html: string) {
  return [...html.matchAll(/<rect x="([\d.]+)"[^>]*?\swidth="([\d.]+)"/gu)]
    .map(([, x, width]) => ({ x: Number(x), width: Number(width) }));
}

describe("proposal sweep", () => {
  test("width is proportional to interval length and to nothing else", () => {
    /* Three windows of equal length and one of double it. If width encoded the
       prime count or the multiplicity, the first three would differ. */
    const html = markup([
      ROWS[0]!,
      ROWS[1]!,
      { proposal_id: "vpr_wide", status: "accepted", claim: scan(10430001, 10430400, 26, 10430171, 4302968) },
    ]);
    const drawn = rects(html);
    expect(drawn).toHaveLength(3);
    expect(drawn[0]!.width).toBeCloseTo(drawn[1]!.width, 6);
    expect(drawn[2]!.width / drawn[0]!.width).toBeCloseTo(2, 1);
  });

  test("adjacent windows share one lane and an overlapping pair does not", () => {
    const html = markup(ROWS);
    /* Four rects; the lane a rect sits in is its group's translate. Three
       windows tile without touching, so one lane holds them; the duplicate
       window forces the second. */
    expect(rects(html)).toHaveLength(4);
    const lanes = [...html.matchAll(/translate\(0 (\d+)\)/gu)].map(([, y]) => Number(y));
    expect(new Set(lanes).size).toBe(2);
  });

  test("the rejected Proposal keeps its own rect and carries a seam", () => {
    const html = markup(ROWS);
    expect(html).toContain("text-status-conflict");
    /* A seam is a line, drawn nowhere else inside a lane group. */
    expect(html).toMatch(/<line x1="[\d.]+" y1="30" x2="[\d.]+" y2="16"/u);
  });

  test("the axis carries the two endpoints and no cap", () => {
    const html = markup(ROWS);
    expect(html).toContain(">10429601<");
    expect(html).toContain(">10430200<");
    expect(html).not.toContain(">10429801<");
  });

  test("the parameter table is rendered, not hidden, and carries its source", () => {
    const html = markup(ROWS);
    expect(html).toContain("Max multiplicity");
    expect(html).toContain(">2060465<");
    expect(html).toContain("the maximum multiplicity observed was 11 at p=10429717, residue 2060465.");
    expect(html).toContain("/repositories/erdos/proposals/vpr_a");
  });

  test("fewer than three windows draws no axis", () => {
    const html = markup([ROWS[0]!, ROWS[1]!]);
    expect(rects(html)).toHaveLength(0);
    expect(html).not.toContain(">10429601<");
    expect(html).toContain("did not yield a shape to draw");
    /* The table is still the ledger equivalent, so the values survive. */
    expect(html).toContain("10429601..10429800");
  });

  test("a row that states a scan but does not parse is counted, not drawn", () => {
    const family = sweepFamily([
      ...ROWS,
      { proposal_id: "vpr_reworded", status: "accepted", claim: "An exhaustive bounded search found no k=15 witness; the maximum multiplicity observed was 11." },
    ]);
    const html = renderToStaticMarkup(<ProposalSweep slug="erdos" family={family} />);
    expect(rects(html)).toHaveLength(4);
    expect(html).toContain("One further Proposal states");
  });
});
