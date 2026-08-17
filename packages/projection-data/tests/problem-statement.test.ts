import { describe, expect, test } from "bun:test";
import { problemFromRow, resolveStatement } from "../src/index";

/* The precedence is the contract both readers implement — one in SQL, one in
   JS — so it is pinned here once, against the JS implementation, with the
   label branch carrying the catalogue record's own retained title rather than
   anything a component synthesizes. */
describe("resolveStatement", () => {
  const retained = { prose: "Is every even number the sum of two primes?", formal: "theorem erdos_94 : …" };

  test("a record's own summary wins as prose", () => {
    expect(resolveStatement("Own question text.", retained, "Erdős problem 94"))
      .toEqual({ statement: "Own question text.", kind: "prose" });
  });

  test("retained prose outranks a retained formal statement", () => {
    expect(resolveStatement("  ", retained, "Erdős problem 94"))
      .toEqual({ statement: retained.prose, kind: "prose" });
  });

  test("a formal statement stands when no prose is retained", () => {
    expect(resolveStatement("", { prose: null, formal: retained.formal }, "Erdős problem 94"))
      .toEqual({ statement: retained.formal, kind: "formal" });
  });

  test("the catalogue's label is the resolved statement when nothing is retained", () => {
    expect(resolveStatement("", { prose: null, formal: null }, "Erdős problem 94"))
      .toEqual({ statement: "Erdős problem 94", kind: "label" });
    expect(resolveStatement("", undefined, "Erdős problem 94"))
      .toEqual({ statement: "Erdős problem 94", kind: "label" });
  });

  test("whitespace-only retention falls through rather than resolving empty", () => {
    expect(resolveStatement("", { prose: " \n", formal: "\t" }, "Erdős problem 94"))
      .toEqual({ statement: "Erdős problem 94", kind: "label" });
  });
});

describe("problemFromRow statement kind", () => {
  const row = {
    problem: "94",
    node_id: "erdos:94",
    source_id: "source:erdos-problems",
    content_root: `sha256:${"0".repeat(64)}`,
    declared_status: "open",
    statement: "Erdős problem 94",
  };

  test("an unrecognised kind narrows to label rather than to whatever it spells", () => {
    expect(problemFromRow({ ...row, statement_kind: "poem" }).statement_kind).toBe("label");
    expect(problemFromRow({ ...row, statement_kind: "formal" }).statement_kind).toBe("formal");
    expect(problemFromRow({ ...row, statement_kind: "prose" }).statement_kind).toBe("prose");
  });
});
