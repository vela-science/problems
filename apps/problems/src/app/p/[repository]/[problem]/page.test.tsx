import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ canonical: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@vela/projection-data", () => ({ canonicalProblemPath: mocks.canonical }));
vi.mock("next/navigation", () => ({
  permanentRedirect: (href: string) => { mocks.redirect(href); throw new Error(`REDIRECT ${href}`); },
  notFound: () => { mocks.notFound(); throw new Error("NOT_FOUND"); },
}));

import RetiredProblemPath from "./page";

const call = (repository: string, problem: string, searchParams: Record<string, string> = {}) =>
  RetiredProblemPath({
    params: Promise.resolve({ repository, problem }),
    searchParams: Promise.resolve(searchParams as never),
  });

describe("the retired Problem path", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /* It renders nothing. A retired path that still painted a Problem was a
     second Problem surface, which is the thing being retired. */
  it("permanently redirects every addressable Problem", async () => {
    mocks.canonical.mockReturnValue("/problems/erdos-problems/999");
    await expect(call("math", "999")).rejects.toThrow("REDIRECT /problems/erdos-problems/999");
  });

  /* Mode, workspace, object and inspector are URL-backed product state, so
     dropping them lands a reader on a different view of the page they asked
     for. Anything else is not carried. */
  it("carries URL-backed product state and nothing else", async () => {
    mocks.canonical.mockReturnValue("/problems/erdos-problems/321");
    await expect(call("math", "321", { mode: "work", workspace: "w1", tracking: "drop-me" }))
      .rejects.toThrow("REDIRECT /problems/erdos-problems/321?mode=work&workspace=w1");
  });

  it("refuses an address this release cannot compute", async () => {
    mocks.canonical.mockReturnValue(null);
    await expect(call("not-a-repository", "1")).rejects.toThrow("NOT_FOUND");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
