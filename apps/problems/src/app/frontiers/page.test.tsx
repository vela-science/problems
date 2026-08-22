import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import FrontiersPage from "./page";

describe("Frontiers reference demonstration", () => {
  test("separates exact local Decisions, Local Standing, and the synthetic correction seam", () => {
    const html = renderToStaticMarkup(<FrontiersPage />);
    expect(html).toContain("One portable Submission");
    expect(html).toContain("Two local outcomes");
    expect(html).toContain("accepted");
    expect(html).toContain("rejected");
    expect(html).toContain("unassessed");
    expect(html).toContain("synthetic reference fixture");
    expect(html).toContain("authority effect: none");
    expect(html).toContain("persistence: none");
    expect(html).not.toContain("Global Standing");
    expect(html).not.toContain("global consensus");
  });
});
