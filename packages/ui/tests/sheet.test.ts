import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("Sheet", () => {
  test("keeps its standard close affordance at the 44px interaction floor", () => {
    const source = readFileSync(new URL("../src/components/ui/sheet.tsx", import.meta.url), "utf8");

    expect(source).toMatch(/data-slot="sheet-close"[\s\S]*?size="icon-lg"/u);
    expect(source).toMatch(/data-slot="sheet-close"[\s\S]*?className="absolute top-3 right-3 size-11"/u);
    expect(source).not.toMatch(/data-slot="sheet-close"[\s\S]*?size="icon-sm"/u);
  });
});
