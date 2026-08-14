import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import type { ClaimSummary } from "@vela/projection-data";

import { ClaimRow } from "./claim-row";

afterEach(cleanup);

/* A quantum-codes Claim as the projection returns it: accepted by a Decision,
   carrying conditions, and — like all but fifteen Claims in the release — with
   no Verification Record of its own. */
const claim = (overrides: Partial<ClaimSummary> = {}): ClaimSummary => ({
  id: "vcl_cdd52df280c6249b97daa2ce544a8ed260cae6a31d33fd519917bb33c51faa59",
  standing: "accepted",
  assertion:
    "The Steane code [[7,1,3]] (CSS from the [7,4,3] Hamming code) encodes 1 logical qubit in 7 physical qubits with distance 3.",
  assertion_type: "computational",
  conditions: ["family:CSS; n:7; k:1; d:3; base_code:hamming_7_4_3"],
  created: "2026-06-16T23:28:04.000Z",
  source_title: "cap_a1b2c3d4e5f60718 · vc_qc7130000000001",
  source_path: "records/claims/sha256/cdd52df280c6249b97daa2ce544a8ed260cae6a31d33fd519917bb33c51faa59.json",
  source_type: "model_output",
  has_proposal: false,
  contested: false,
  retracted: false,
  evidence_count: 1,
  revision: 1,
  relation_count: 0,
  ...overrides,
});

const href = "/repositories/quantum-codes/claims/vcl_cdd52df280c6249b97daa2ce544a8ed260cae6a31d33fd519917bb33c51faa59";
const glyph = (container: HTMLElement) => container.querySelector("svg[data-standing]")!;

describe("ClaimRow", () => {
  test("fills the core only where a Verification Record reported a pass", () => {
    /* The defect this row exists to close: standing drove the verification
       axis, so every accepted Claim in the release drew a passing check it did
       not have. An accepted Claim with no Record gets no core. */
    const { container } = render(<ClaimRow claim={claim()} href={href} verified={false} />);
    expect(glyph(container).getAttribute("data-verification")).toBe("not_attempted");

    cleanup();
    const withRecord = render(<ClaimRow claim={claim()} href={href} verified />);
    expect(glyph(withRecord.container).getAttribute("data-verification")).toBe("pass");
  });

  test("writes out both axes the glyph draws, and the glyph itself stays hidden", () => {
    const { container } = render(<ClaimRow claim={claim()} href={href} verified={false} />);
    expect(glyph(container).getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("accepted")).toBeInTheDocument();
    expect(screen.getByText("no Verification Record")).toBeInTheDocument();

    cleanup();
    render(<ClaimRow claim={claim()} href={href} verified />);
    expect(screen.getByText("verification passed")).toBeInTheDocument();
  });

  test("keeps a Claim's own conditions off the standing axis", () => {
    /* The conditions come from the Submission that made the Claim, not from a
       Decision, so a half core would say an authority accepted with conditions
       that no authority wrote. The row still reports them as conditions. */
    const { container } = render(<ClaimRow claim={claim()} href={href} verified={false} />);
    expect(glyph(container).getAttribute("data-standing")).toBe("accepted");
    expect(screen.getByText("1 condition")).toBeInTheDocument();

    cleanup();
    const unconditional = render(
      <ClaimRow claim={claim({ conditions: [] })} href={href} verified={false} />,
    );
    expect(glyph(unconditional.container).getAttribute("data-standing")).toBe("accepted");
  });

  test("keeps the source's own flags off the standing axis", () => {
    /* `contested` and `retracted` are import flags on the legacy record. Drawn
       as `corrected` and `retracted` they put a Decision's seam on the glyph. */
    const { container } = render(<ClaimRow claim={claim({ contested: true })} href={href} verified={false} />);
    expect(glyph(container).getAttribute("data-standing")).toBe("accepted");
    expect(screen.getByText("contested source flag")).toBeInTheDocument();

    cleanup();
    const retracted = render(<ClaimRow claim={claim({ retracted: true })} href={href} verified={false} />);
    expect(glyph(retracted.container).getAttribute("data-standing")).toBe("accepted");
    expect(screen.getByText("retracted source flag")).toBeInTheDocument();
  });

  /* The row used to be handed `pending_review` and translate it. It is now
     handed the standing itself, and the ring has to be the dashed one — a Claim
     no ruling stands over must not draw the accepted mark. */
  test("draws the unruled mark where no Decision has ruled", () => {
    const { container } = render(<ClaimRow claim={claim({ standing: "unassessed" })} href={href} verified={false} />);
    expect(glyph(container).getAttribute("data-standing")).toBe("unassessed");
  });

  test("offers the Claim exactly one destination of its own", () => {
    /* Two buttons per row went where the row's own title went. One link. */
    const { container } = render(
      <ClaimRow claim={claim()} href={href} verified={false} kindHref="/repositories/quantum-codes/claims?kind=computational" />,
    );
    const own = [...container.querySelectorAll("a")].filter((link) => link.getAttribute("href") === href);
    expect(own).toHaveLength(1);
    expect(own[0]).toHaveTextContent("[[7,1,3]]");
  });

  test("drops the assertion-kind chip when the result set cannot be narrowed by it", () => {
    render(<ClaimRow claim={claim()} href={href} verified={false} />);
    expect(screen.queryByText("computational")).not.toBeInTheDocument();

    cleanup();
    render(<ClaimRow claim={claim()} href={href} verified={false} kindHref="/repositories/quantum-codes/claims?kind=computational" />);
    expect(screen.getByRole("link", { name: "computational" })).toBeInTheDocument();
  });

  test("prints the count the Evidence sort orders by", () => {
    render(<ClaimRow claim={claim({ evidence_count: 0 })} href={href} verified={false} />);
    expect(screen.getByText("no evidence span")).toBeInTheDocument();

    cleanup();
    render(<ClaimRow claim={claim({ evidence_count: 3 })} href={href} verified={false} />);
    expect(screen.getByText("3 evidence spans")).toBeInTheDocument();
  });

  test("leads with the promoted lead where the domain has no notation for the record", () => {
    render(
      <ClaimRow
        claim={claim({
          assertion: "Ruzsa covering lemma: if |A+B| <= K|A|, then B is contained in the sumset A - A translated by at most K elements.",
          conditions: [],
          source_title: "Ruzsa covering lemma 1999",
        })}
        href={href}
        verified={false}
      />,
    );
    expect(screen.getByRole("link", { name: "Ruzsa covering lemma" })).toHaveAttribute("href", href);
  });

  test("recovers the source adapter's fields without dropping the mathematics", () => {
    /* The flattened Erdős metadata and a real problem statement in one string.
       The row shows the values as values and keeps the statement. */
    render(
      <ClaimRow
        claim={claim({
          assertion:
            "Erdős Problem #404: declared status 'open'. Formalized: no. Let $h_t(d)$ be minimal such that every graph $G$ with $h_t(d)$ edges contains two far edges.",
          conditions: [],
          source_type: "database_record",
          source_title: "erdos_deep:404",
        })}
        href={href}
        verified={false}
      />,
    );
    expect(screen.getByRole("link", { name: "#404" })).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("not formalized")).toBeInTheDocument();
    expect(screen.getByText(/minimal such that every graph/u)).toBeInTheDocument();
  });
});
