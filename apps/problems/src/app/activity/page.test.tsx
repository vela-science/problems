import { beforeEach, describe, expect, test, vi } from "vitest";

const navigation = vi.hoisted(() => ({ permanentRedirect: vi.fn() }));

vi.mock("next/navigation", () => ({
  permanentRedirect: (href: string) => {
    navigation.permanentRedirect(href);
    throw new Error("NEXT_REDIRECT");
  },
}));

import LegacyActivityPage from "./page";

describe("legacy activity route", () => {
  beforeEach(() => navigation.permanentRedirect.mockClear());

  test("redirects to the canonical Updates route", async () => {
    await expect(LegacyActivityPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(navigation.permanentRedirect).toHaveBeenCalledWith("/updates");
  });

  test("preserves supported views and drops unknown query values", async () => {
    await expect(LegacyActivityPage({ searchParams: Promise.resolve({ view: "transitions" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(navigation.permanentRedirect).toHaveBeenLastCalledWith("/updates?view=transitions");

    await expect(LegacyActivityPage({ searchParams: Promise.resolve({ view: "anything-else" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(navigation.permanentRedirect).toHaveBeenLastCalledWith("/updates");
  });
});
