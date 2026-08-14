import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SourceRegistryFilters } from "./source-registry-filters";

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/sources",
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.params,
}));

describe("Source registry URL state", () => {
  beforeEach(() => {
    cleanup();
  });

  test("writes source discovery queries into a shareable URL", () => {
    navigation.params = new URLSearchParams("kind=formal_library");
    navigation.push.mockReset();
    render(
      <SourceRegistryFilters
        filters={{ kind: "formal_library" }}
        kinds={["formal_library"]}
        sources={[{ id: "source:formal-conjectures", label: "Formal Conjectures" }]}
        coverageStates={["partial"]}
        repositories={["formal-conjectures"]}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Search source-native records" }),
      { target: { value: "DeepMind" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(navigation.push).toHaveBeenCalledWith(
      "/sources?kind=formal_library&q=DeepMind",
      { scroll: false },
    );
  });

  test("clears query state without leaving stale detail or cursor parameters", () => {
    navigation.params = new URLSearchParams(
      "q=DeepMind&source=source%3Aformal-conjectures&cursor=next",
    );
    navigation.push.mockReset();
    render(
      <SourceRegistryFilters
        filters={{ query: "DeepMind" }}
        kinds={["formal_library"]}
        sources={[{ id: "source:formal-conjectures", label: "Formal Conjectures" }]}
        coverageStates={["partial"]}
        repositories={["formal-conjectures"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(navigation.push).toHaveBeenCalledWith("/sources", {
      scroll: false,
    });
  });
});
