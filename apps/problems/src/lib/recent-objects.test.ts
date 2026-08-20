import { beforeEach, describe, expect, it } from "vitest";
import { forgetObjects, recentObjects, rememberObject } from "./recent-objects";

/* This environment provides no Storage, so the store gets a minimal in-memory
   one. The module only ever calls getItem/setItem/removeItem. */
let store: Record<string, string> = {};
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  },
});

beforeEach(() => window.localStorage.clear());

describe("recently opened objects", () => {
  it("puts the most recently opened first", () => {
    rememberObject({ href: "/problems/erdos-problems/94", title: "Ninety-four" });
    rememberObject({ href: "/problems/erdos-problems/321", title: "Three twenty-one" });
    expect(recentObjects().map((entry) => entry.title)).toEqual(["Three twenty-one", "Ninety-four"]);
  });

  it("moves a revisited object rather than duplicating it", () => {
    rememberObject({ href: "/a", title: "A" });
    rememberObject({ href: "/b", title: "B" });
    rememberObject({ href: "/a", title: "A" });
    expect(recentObjects().map((entry) => entry.href)).toEqual(["/a", "/b"]);
  });

  it("caps the list so the key cannot grow without bound", () => {
    for (let index = 0; index < 20; index += 1) rememberObject({ href: `/p/${index}`, title: `P${index}` });
    expect(recentObjects()).toHaveLength(8);
    expect(recentObjects()[0]?.href).toBe("/p/19");
  });

  it("refuses anything that is not a same-origin path", () => {
    rememberObject({ href: "https://evil.example/x", title: "Off-origin" });
    rememberObject({ href: "//evil.example/x", title: "Protocol-relative" });
    expect(recentObjects()).toEqual([]);
  });

  it("discards a corrupt store rather than throwing at the palette", () => {
    window.localStorage.setItem("vela.recent-objects.v1", "{ not json");
    expect(recentObjects()).toEqual([]);
    window.localStorage.setItem("vela.recent-objects.v1", JSON.stringify([{ href: 5 }, null, "x"]));
    expect(recentObjects()).toEqual([]);
  });

  it("clears on request", () => {
    rememberObject({ href: "/a", title: "A" });
    forgetObjects();
    expect(recentObjects()).toEqual([]);
  });
});
