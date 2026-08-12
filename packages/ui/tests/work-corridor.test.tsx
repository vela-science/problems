import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkCorridor } from "../src/components/vela/work-corridor";

describe("WorkCorridor", () => {
  it("orients across the four public Work concepts without inventing progress", () => {
    const html = renderToStaticMarkup(<WorkCorridor />);
    expect(html).toContain("Target");
    expect(html).toContain("Workspace");
    expect(html).toContain("Research Block");
    expect(html).toContain("Unsigned handoff");
    expect(html).toContain("Local authority remains local");
    expect(html).toContain('data-slot="work-corridor"');
    expect(html).not.toMatch(/complete|approved|success|%|eta/iu);
  });
});
