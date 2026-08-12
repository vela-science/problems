import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "bun:test";
import { RootedArtifactFrame } from "../src/components/vela/rooted-artifact-frame";

describe("RootedArtifactFrame", () => {
  test("renders only exact retained metadata and a local copy affordance", () => {
    const html = renderToStaticMarkup(<RootedArtifactFrame artifact={{
      kind: "proof",
      path: "artifacts/proof.lean",
      contentRoot: `sha256:${"a".repeat(64)}`,
      byteSize: 4217,
      mediaType: "text/plain",
      locator: "git:objects/proof",
    }} />);

    expect(html).toContain("artifacts/proof.lean");
    expect(html).toContain(`sha256:${"a".repeat(64)}`);
    expect(html).toContain("4,217 B");
    expect(html).toContain("text/plain");
    expect(html).not.toContain("Apply");
    expect(html).not.toContain("reasoning");
    expect(html).not.toContain("Standing");
  });
});
