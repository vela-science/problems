import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const vercel = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../vercel.json"), "utf8"),
) as {
  headers: Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;
};

describe("production security headers", () => {
  it("allows the retained Loro WASM runtime without allowing JavaScript eval", () => {
    const policy = vercel.headers
      .flatMap((entry) => entry.headers)
      .find(({ key }) => key === "Content-Security-Policy")?.value;

    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("connect-src 'self'");
  });
});
