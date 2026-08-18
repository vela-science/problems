import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { Actor } from "./actor";

describe("performer provenance", () => {
  afterEach(cleanup);

  test("uses only retained kind instead of guessing from the display name", () => {
    const view = render(<Actor name="agent:reviewer" />);
    expect(screen.getByText("A")).toBeVisible();
    expect(screen.queryByText("AI")).toBeNull();

    view.rerender(<Actor name="Ada Lovelace" kind="agent" />);
    expect(screen.getByText("AI")).toBeVisible();

    view.rerender(<Actor name="release[bot]" kind="human" />);
    expect(screen.getByText("R")).toBeVisible();
    expect(screen.queryByText("AI")).toBeNull();
  });
});
