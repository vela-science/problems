import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useQueryNavigation } from "./use-query-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/graph",
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push: (href: string) => window.history.pushState(null, "", href) }),
}));

describe("useQueryNavigation", () => {
  beforeEach(() => window.history.replaceState(null, "", "/graph?repository=erdos"));

  test("pushes distinct exact views without duplicating the current history entry", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useQueryNavigation());

    act(() => result.current.push({ node: "erdos:1056" }));
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/graph?repository=erdos&node=erdos%3A1056",
    );
    expect(pushState).toHaveBeenCalledTimes(1);

    act(() => result.current.push({ node: "erdos:1056" }));
    expect(pushState).toHaveBeenCalledTimes(1);
  });
});
