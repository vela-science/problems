import { describe, expect, test } from "bun:test";
import {
  compareProductionProjection,
  createReconstructionPhaseReporter,
  parseArgs,
  reconstructionDiagnosticPhases,
  reconstructProjection,
  repositoryCommits,
} from "../scripts/reconstruct-projection.mjs";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    schema: "vela.projection-release-manifest",
    vela_version: "vela 0.961.0",
    vela_binary_sha256: root("1"),
    release_root: root("2"),
    table_roots: { claims: root("3") },
    source_repositories: [{
      repository_id: "8138c6da-46c4-47ee-b493-5bbfbec09b1e",
      commit: "a".repeat(40),
    }],
    source_registry: {
      schema: "vela.math-source-registry-release.v1",
      observation_bundle_root: root("4"),
    },
    ...overrides,
  };
}

describe("clean-room production parity", () => {
  test("refuses retired, unknown, duplicate, and incomplete arguments", () => {
    expect(() => parseArgs(["--production-manifest", "https://example.test/manifest.json"])).toThrow(
      "unsupported argument --production-manifest",
    );
    expect(() => parseArgs(["--production-parity", "skip"])).toThrow(
      "unsupported argument --production-parity",
    );
    expect(() => parseArgs(["--unknown-input", "stale.json"])).toThrow(
      "unsupported argument --unknown-input",
    );
    expect(() => parseArgs(["--unknown", "value"])).toThrow("unsupported argument --unknown");
    expect(() => parseArgs(["--output", "one", "--output", "two"])).toThrow(
      "duplicate argument --output",
    );
    expect(() => parseArgs(["--output"])).toThrow("invalid argument near --output");
  });

  test("emits only fixed monotonic reconstruction phase markers", () => {
    const ticks = [100, 106, 104, 112];
    const output: string[] = [];
    const report = createReconstructionPhaseReporter({
      now: () => ticks.shift() ?? 112,
      write: (line: string) => { output.push(line); },
    });

    report("inputs_loaded");
    report("cluster_started", 1);
    report("candidate_activated", 1);

    expect(output).toEqual([
      "reconstruction_phase phase=inputs_loaded attempt=all elapsed_ms=6\n",
      "reconstruction_phase phase=cluster_started attempt=1 elapsed_ms=6\n",
      "reconstruction_phase phase=candidate_activated attempt=1 elapsed_ms=12\n",
    ]);
    expect(reconstructionDiagnosticPhases).not.toContain("task");
    expect(output.join("")).not.toMatch(/sha256|repository_id|claim_id|rubric|task|plan/iu);
    expect(() => report("private_record" as never)).toThrow(
      "unsupported reconstruction diagnostic phase",
    );
    expect(() => report("inputs_loaded", 3 as never)).toThrow("invalid reconstruction attempt");
  });

  test("keys reconstruction inputs by the canonical Repository UUID", () => {
    expect(repositoryCommits(manifest().source_repositories)).toEqual({
      "8138c6da-46c4-47ee-b493-5bbfbec09b1e": "a".repeat(40),
    });
  });

  test("accepts equal semantic data produced by a different platform binary", () => {
    const local = manifest();
    const production = manifest({
      vela_binary_sha256: root("5"),
      release_root: root("6"),
    });

    expect(compareProductionProjection(local, production)).toEqual({
      manifest_schema_equal: true,
      vela_version_equal: true,
      table_roots_equal: true,
      source_repositories_equal: true,
      source_registry_equal: true,
      generator_binary_equal: false,
      release_root_equal: false,
      cross_platform_release_root_expected: true,
    });
  });

  test("detects changed projected data", () => {
    const comparison = compareProductionProjection(
      manifest(),
      manifest({ table_roots: { claims: root("7") } }),
    );
    expect(comparison.table_roots_equal).toBe(false);
    expect(comparison.release_root_equal).toBe(true);
  });
});
