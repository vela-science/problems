import { describe, expect, test } from "bun:test";
import {
  normalizeProjectionManifest,
  projectionRefusal,
  velaGeneratorBinaryRootForPlatform,
  velaReadableVersions,
} from "../src/index";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    schema: "vela.projection-release-manifest",
    generated_at: "2026-08-17T12:00:00Z",
    activation_time: "2026-08-17T12:01:00Z",
    vela_binary_sha256: velaGeneratorBinaryRootForPlatform("darwin"),
    release_root: root("1"),
    table_roots: { repositories: root("2") },
    source_repositories: [],
    source_registry: {
      schema: "vela.math-source-registry-release.v1",
      declaration_root: root("3"),
      observation_bundle_root: root("4"),
      source_count: 0,
      observation_count: 0,
      native_record_count: 0,
      release_source_count: 0,
      repository_binding_count: 0,
    },
    vela_version: velaReadableVersions[0],
    ...overrides,
  };
}

describe("current projection compatibility", () => {
  test("loads the one exact supported Vela release", () => {
    expect(normalizeProjectionManifest(manifest()).vela_version).toBe("vela 0.977.2");
  });

  test("refuses an older local projection with safe repair guidance", () => {
    try {
      normalizeProjectionManifest(manifest({ vela_version: "vela 0.976.1" }));
      throw new Error("expected the retired projection to be refused");
    } catch (error) {
      expect(projectionRefusal(error)).toBe("foreign_manifest");
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("requires vela 0.977.2");
      expect((error as Error).message).toContain("serves vela 0.976.1");
      expect((error as Error).message).toContain("SELECT-only exact supported projection");
      expect((error as Error).message).not.toMatch(/postgres(?:ql)?:\/\//u);
    }
  });
});
