import { describe, expect, test } from "bun:test";
import { YAML } from "bun";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { releaseOrder } from "../../../scripts/release-problems.mjs";
import { assertVelaGeneratorIdentity } from "../scripts/projection-builder.mjs";
import { velaGeneratorBinaryRootForPlatform, velaRelease } from "../src/release";

describe("projection refresh Vela identity", () => {
  test("accepts only the released binary root for each supported platform", () => {
    expect(velaGeneratorBinaryRootForPlatform("linux")).toBe(
      velaRelease.generator_binary_sha256,
    );
    expect(velaGeneratorBinaryRootForPlatform("darwin")).toBe(
      velaRelease.macos_generator_binary_sha256,
    );
    expect(() => assertVelaGeneratorIdentity({
      version: `vela ${velaRelease.version}`,
      binaryRoot: velaRelease.generator_binary_sha256,
      platform: "linux",
    })).not.toThrow();
    expect(() => assertVelaGeneratorIdentity({
      version: `vela ${velaRelease.version}`,
      binaryRoot: velaRelease.macos_generator_binary_sha256,
      platform: "darwin",
    })).not.toThrow();
  });

  test("rejects unrecorded, cross-platform, and unsupported binaries", () => {
    expect(() => assertVelaGeneratorIdentity({
      version: `vela ${velaRelease.version}`,
      binaryRoot: `sha256:${"f".repeat(64)}`,
      platform: "linux",
    })).toThrow("expected released Vela binary");
    expect(() => assertVelaGeneratorIdentity({
      version: `vela ${velaRelease.version}`,
      binaryRoot: velaRelease.macos_generator_binary_sha256,
      platform: "linux",
    })).toThrow("expected released Vela binary");
    expect(() => velaGeneratorBinaryRootForPlatform("win32")).toThrow(
      "does not support platform win32",
    );
  });
});

describe("projection release ownership", () => {
  const mirror = readFileSync(
    resolve(import.meta.dir, "../../../.github/workflows/mirror-replicas.yml"),
    "utf8",
  );
  const refresh = readFileSync(
    resolve(import.meta.dir, "../scripts/refresh-neon-projection.mjs"),
    "utf8",
  );
  const store = readFileSync(
    resolve(import.meta.dir, "../scripts/projection-store.mjs"),
    "utf8",
  );
  const selection = readFileSync(
    resolve(import.meta.dir, "../scripts/select-projection-release.mjs"),
    "utf8",
  );

  test("mirrors Core while leaving Math on its canonical public host", () => {
    const parsed = YAML.parse(mirror) as {
      jobs: { mirror: { strategy: { matrix: { repository: string[] } } } };
    };
    expect(parsed.jobs.mirror.strategy.matrix.repository).toEqual(["vela"]);
    expect(mirror).not.toContain("vela-science/math");
    expect(mirror).not.toContain("VELA_MATH_READ_TOKEN");
  });

  test("the direct operator owns the complete release transaction", () => {
    expect(releaseOrder()).toEqual([
      "exact_checkout",
      "release_lock",
      "static_qualification",
      "neon_production_identity",
      "vela_generator_identity",
      "repository_acquisition",
      "adapter_prepare",
      "adapter_retain",
      "rollback_floor",
      "projection_schema_initialize",
      "projection_activate",
      "activity_qualification",
      "postactivation_product",
      "provider_loss_reconstruction",
      "site_publish",
      "production_deploy",
      "production_readiness",
      "projection_prune",
      "qualification_retain",
    ]);
  });

  test("moves current only after stored-root verification", () => {
    expect(refresh.match(/acquireProjectionSourceAdapters\(/gu)).toHaveLength(1);
    expect(refresh).toContain("storedRelease(sql, candidate.manifest.release_root)");
    expect(refresh.indexOf("if (!stored) await insertCandidate(sql, candidate)")).toBeLessThan(
      refresh.indexOf("verifyCandidate(sql, candidate)"),
    );
    expect(refresh.indexOf("verifyCandidate(sql, candidate)")).toBeLessThan(
      refresh.indexOf("activateCandidate(sql, candidate.manifest, { expectedCurrentRoot })"),
    );
    expect(store).toContain("pg_advisory_xact_lock($1::bigint)");
    expect(store).toContain("isolation level serializable read write");
    expect(store).toContain("await verifyStoredRelease(tx, targetRoot)");
    expect(refresh).not.toContain("currentReleaseConfirmedAt");
    expect(refresh).toContain("confirmation = await activateCandidate");
    expect(refresh).toContain("confirmation = await confirmCurrentRelease");
    expect(refresh).toContain("new Date(confirmation.confirmed_at).toISOString()");
  });

  test("keeps exact rollback explicit and separate from refresh", () => {
    const packageJson = readFileSync(resolve(import.meta.dir, "../package.json"), "utf8");
    expect(packageJson).toContain('"releases:select": "bun scripts/select-projection-release.mjs"');
    expect(selection).toContain("--expected-current");
    expect(selection).toContain("--target");
    expect(selection).not.toMatch(/insertCandidate|activateCandidate|prune/iu);
    expect(refresh).not.toContain("selectStoredRelease");
  });

  test("retains current plus two rollback predecessors", () => {
    const prune = readFileSync(resolve(import.meta.dir, "../scripts/prune-releases.mjs"), "utf8");
    const reads = ["../src/read-contracts.ts", "../src/index.ts"]
      .map((path) => readFileSync(resolve(import.meta.dir, path), "utf8"))
      .join("\n");
    expect(prune).toContain('retention: "current_and_two_predecessors"');
    expect(prune).toContain("projection.current_release");
    expect(prune).toContain("sql.transaction");
    expect(reads).toContain("projection.current_release");
  });
});
