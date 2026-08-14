import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle, VELA_CONTRAST_STORAGE_KEY, applyContrast, applyTheme } from "./theme-toggle";

describe("ThemeToggle contrast preference", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    } satisfies Storage);
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.contrast = "standard";
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("stores high contrast independently from the light or dark choice", () => {
    applyContrast(true);
    expect(document.documentElement.dataset.contrast).toBe("high");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(VELA_CONTRAST_STORAGE_KEY)).toBe("high");

    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.contrast).toBe("high");
    expect(localStorage.getItem(VELA_CONTRAST_STORAGE_KEY)).toBe("high");

    applyContrast(false);
    expect(document.documentElement.dataset.contrast).toBe("standard");
    expect(localStorage.getItem(VELA_CONTRAST_STORAGE_KEY)).toBeNull();
  });

  it("restores and toggles the persisted contrast choice through the menu", async () => {
    const user = userEvent.setup();
    localStorage.setItem(VELA_CONTRAST_STORAGE_KEY, "high");
    document.documentElement.dataset.contrast = "high";
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Choose appearance" }));
    const contrast = await screen.findByRole("menuitemcheckbox", { name: "High contrast" });
    await waitFor(() => expect(contrast).toHaveAttribute("aria-checked", "true"));
    await user.click(contrast);

    expect(document.documentElement.dataset.contrast).toBe("standard");
    expect(localStorage.getItem(VELA_CONTRAST_STORAGE_KEY)).toBeNull();
  });
});
