import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("geist/font/sans", () => ({ GeistSans: { variable: "font-geist" } }));
vi.mock("@vela/projection-data", () => ({
  allRepositories: async () => [],
  /* The sidebar's record gate reads the manifest's per-repository counts, so
     the stub carries them rather than a bare root. */
  projectionManifest: async () => ({ release_root: "sha256:test", source_repositories: [] }),
  /* Null is the honest stub: a release nothing has confirmed yet is a real
     state, and it is the one where the footer falls back to activation. */
  projectionConfirmedAt: async () => null,
}));
vi.mock("@/components/vela/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/auth", () => ({
  authConfiguration: () => ({ enabled: false, reason: "missing" }),
}));
vi.mock("@/lib/published-problem-collections", () => ({
  publishedProblemCollections: [{ namespace: "erdos-problems", name: "Erdős Problems" }],
}));

import RootLayout, { themeScript } from "@/app/layout";

function productionAppComponents(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionAppComponents(path);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

describe("root hydration boundary", () => {
  it("keeps deterministic document defaults and tolerates extension-owned body attributes", async () => {
    const tree = await RootLayout({ children: <main>state</main> });
    expect(isValidElement(tree)).toBe(true);
    expect(tree.props["data-theme"]).toBe("light");
    expect(tree.props["data-contrast"]).toBe("standard");
    expect(tree.props.suppressHydrationWarning).toBe(true);

    const body = tree.props.children.find((child: unknown) => isValidElement(child) && child.type === "body");
    expect(isValidElement(body)).toBe(true);
    expect(body.props.suppressHydrationWarning).toBe(true);
  });

  it("leaves the shared SidebarInset as the only main landmark", () => {
    const appDirectory = join(process.cwd(), "src/app");
    for (const path of productionAppComponents(appDirectory)) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(/<\/?main(?:\s|>)/u);
    }
  });

  it.each([
    { name: "stored dark and high contrast", storedTheme: "dark", storedContrast: "high", systemDark: false, theme: "dark", contrast: "high" },
    { name: "stored light over a dark system", storedTheme: "light", storedContrast: null, systemDark: true, theme: "light", contrast: "standard" },
    { name: "system dark with no stored choice", storedTheme: null, storedContrast: null, systemDark: true, theme: "dark", contrast: "standard" },
    { name: "corrupt values as system and standard contrast", storedTheme: "sepia", storedContrast: "maximum", systemDark: false, theme: "light", contrast: "standard" },
  ])("boots $name before paint", ({ storedTheme, storedContrast, systemDark, theme, contrast }) => {
    const values = new Map<string, string>();
    if (storedTheme) values.set("vela-theme", storedTheme);
    if (storedContrast) values.set("vela-contrast", storedContrast);
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null });
    vi.stubGlobal("matchMedia", () => ({ matches: systemDark }));

    Function(themeScript)();

    expect(document.documentElement.dataset.theme).toBe(theme);
    expect(document.documentElement.dataset.contrast).toBe(contrast);
    expect(document.documentElement.classList.contains("dark")).toBe(theme === "dark");
    vi.unstubAllGlobals();
  });

  it("falls back to deterministic light and standard contrast when storage is unavailable", () => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.contrast = "high";
    document.documentElement.classList.add("dark");
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("storage unavailable"); } });
    vi.stubGlobal("matchMedia", () => ({ matches: true }));

    Function(themeScript)();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.contrast).toBe("standard");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    vi.unstubAllGlobals();
  });
});
