import { describe, expect, test } from "bun:test";
import { recordHref } from "../src/read-contracts";

/* The projection still emits the retired Sheet query for Proposal nodes. The
   read boundary is the last place that can turn it into the record route
   before it reaches the graph canvas, the search results and the command
   palette, so these cases pin the rewrite and its limits. */
describe("recordHref", () => {
  test("rewrites the retired Proposal query to the record route", () => {
    expect(recordHref("/repositories/erdos/proposals?proposal=vpr_4fa1a06ca64e36e4"))
      .toBe("/repositories/erdos/proposals/vpr_4fa1a06ca64e36e4");
  });

  test("rewrites the older /review form to the same record route", () => {
    expect(recordHref("/repositories/formal-conjectures/review?proposal=vpr_8715dbb5e2a12442"))
      .toBe("/repositories/formal-conjectures/proposals/vpr_8715dbb5e2a12442");
  });

  test("leaves a href that already names the record alone", () => {
    const href = "/repositories/erdos/proposals/vpr_4fa1a06ca64e36e4";
    expect(recordHref(href)).toBe(href);
  });

  test("leaves every other retained href alone", () => {
    for (const href of [
      "/repositories/erdos/claims/vcl_2f52fe736670aff8",
      "/repositories/erdos/problems/1056",
      "/graph?repository=erdos&node=artifact%3A9fa90a8b9074",
    ]) expect(recordHref(href)).toBe(href);
  });

  /* A query carrying more than the Proposal id is not the retired selection,
     and guessing at it would drop whatever else the generator meant. */
  test("leaves a Proposal query that carries a second parameter alone", () => {
    const href = "/repositories/erdos/proposals?proposal=vpr_exact&standing=accepted";
    expect(recordHref(href)).toBe(href);
  });
});
