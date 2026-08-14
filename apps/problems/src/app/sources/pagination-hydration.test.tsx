import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
} from "@vela/ui/components/pagination";

function Fixture() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationNext href="/sources/source%3Afixture?cursor=next" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

describe("Pagination hydration", () => {
  let root: Root | undefined;

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
      root = undefined;
    }
    vi.restoreAllMocks();
  });

  test("keeps the composed link slot stable across server and client renders", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Fixture />);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      root = hydrateRoot(container, <Fixture />);
      await Promise.resolve();
    });

    expect(
      container.querySelector('a[data-slot="pagination-link"]'),
    ).not.toBeNull();
    expect(
      consoleError.mock.calls.flat().join(" "),
    ).not.toContain("hydrated but some attributes");
  });
});
