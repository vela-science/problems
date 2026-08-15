import { describe, expect, it } from "vitest";
import { githubInstallUrlForSlug } from "./github-install-url";

describe("GitHub App installation URL", () => {
  it("uses GitHub's installation flow without a browser-carried authorization token", () => {
    expect(githubInstallUrlForSlug("vela-science")).toBe("https://github.com/apps/vela-science/installations/new");
  });
});
