import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { CorrectionComparison } from "@/components/vela/correction-comparison";

afterEach(cleanup);

describe("CorrectionComparison", () => {
  /* Both statements stay available, but they are no longer what the reader
     meets first: an assertion runs to ninety words and a correction usually
     revises one clause, so the changed span leads and the full pair sits
     behind the disclosure. */
  test("leads with the changed words and keeps both statements behind a closed disclosure", () => {
    render(<CorrectionComparison kind="corrects" before="The original bound holds." after="The corrected bound holds." />);

    /* Exactly the words that differ are marked, and nothing else: marking a
       shared word would report an edit that did not happen. */
    expect([...document.querySelectorAll("del")].map((node) => node.textContent?.trim())).toEqual(["original"]);
    expect([...document.querySelectorAll("ins")].map((node) => node.textContent?.trim())).toEqual(["corrected"]);

    const disclosure = screen.getByText("Read both in full").closest("details");
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute("open");
    expect(screen.getByLabelText("Statement before change")).toHaveTextContent("The original bound holds.");
    expect(screen.getByLabelText("Statement after change")).toHaveTextContent("The corrected bound holds.");
  });

  test("states a byte-identical correction as one sentence instead of twin panes", () => {
    /* The live Erdős 94 correction keeps the statement bytes and revises the
       record's relations; two identical panes read as a rendering bug. */
    render(<CorrectionComparison kind="corrects" before="The bound holds." after="The bound holds." />);
    expect(screen.getByText(
      "The retained statement is identical before and after: this correction revised the record’s relations, not the statement text.",
    )).toBeInTheDocument();
    expect(screen.queryByText("Compare retained statements")).toBeNull();
    expect(screen.queryByLabelText("Statement before change")).toBeNull();
  });

  test("names a byte-identical supersession as a supersession", () => {
    render(<CorrectionComparison kind="supersedes" before="The bound holds." after="The bound holds." />);
    expect(screen.getByText(/this supersession revised the record’s relations/u)).toBeInTheDocument();
  });
});
