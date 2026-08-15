import { describe, expect, it } from "vitest";
import { importErrorMessage } from "./import-errors";

describe("codebase import failures", () => {
  it("renders only bounded recovery copy", () => {
    expect(importErrorMessage("invalid_url")).toContain("public GitHub repository URL");
    expect(importErrorMessage("untrusted provider response")).toBeNull();
  });
});
