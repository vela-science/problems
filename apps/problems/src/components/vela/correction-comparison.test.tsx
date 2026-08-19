import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { CorrectionComparison } from "@/components/vela/correction-comparison";

afterEach(cleanup);

describe("CorrectionComparison", () => {
  test("compares two retained statements behind a closed disclosure", () => {
    render(<CorrectionComparison kind="corrects" before="The original bound holds." after="The corrected bound holds." />);
    const disclosure = screen.getByText("Compare retained statements").closest("details");
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
