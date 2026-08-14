import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertPublicQualification,
  releaseChildEnvironment,
  releaseCommitEnvironment,
  releaseOrder,
} from "./refresh-observatory.mjs";

describe("direct Observatory release", () => {
  test("is independent of GitHub Actions", () => {
    const source = readFileSync(resolve(import.meta.dir, "refresh-observatory.mjs"), "utf8");
    expect(source).not.toContain("GITHUB_ACTIONS");
    expect(source).not.toContain("workflow_dispatch");
    expect(source).toContain("source-adapter-set-");
    expect(source).toContain("refresh-neon-projection.mjs");
    expect(source).toContain("projection:snapshot");
    expect(source).toContain("refs/heads/ops/observatory-release-lock");
    expect(source).toContain("--force-with-lease=");
    expect(source).toContain("!gh auth git-credential");
    expect(source).toContain("origin/main advanced after qualification");
    expect(source).toContain("rollback-checkpoint.json");
  });

  test("executes the complete release transaction in one order", () => {
    expect(releaseOrder()).toEqual([
      "exact_checkout",
      "release_lock",
      "static_qualification",
      "neon_production_identity",
      "vela_generator_identity",
      "repository_acquisition",
      "preactivation_product",
      "activity_qualification",
      "carrier_verify",
      "adapter_prepare",
      "adapter_retain",
      "rollback_floor",
      "projection_activate",
      "snapshot_stage",
      "snapshot_static_requalification",
      "postactivation_product",
      "provider_loss_reconstruction",
      "site_publish",
      "production_deploy",
      "production_readiness",
      "projection_prune",
      "qualification_retain",
    ]);
  });

  test("refuses credentials and private paths in the retained public record", () => {
    expect(() => assertPublicQualification({ source: "/Users/operator/repository" }))
      .toThrow("credential or private path");
    expect(() => assertPublicQualification({ source: "postgresql://reader:secret@example.test/db" }))
      .toThrow("credential or private path");
    expect(() => assertPublicQualification({ VERCEL_TOKEN: "not-public" }))
      .toThrow("credential or private path");
    expect(assertPublicQualification({ source: "https://github.com/vela-science/math.git" }))
      .toBeUndefined();
  });

  test("children receive a closed environment and a private release home", () => {
    const child = releaseChildEnvironment({
      PATH: "/bin",
      HOME: "/operator",
      VELA_RELEASE_HOME: "/release/home",
      GH_CONFIG_DIR: "/operator/.config/gh",
      NEON_API_KEY: "neon-secret",
      NODE_OPTIONS: "--require=/operator/inject.js",
      PGPASSFILE: "/operator/.pgpass",
      VELA_PROJECTION_DATABASE_URL: "postgresql://secret",
    });
    expect(child).toEqual({
      PATH: "/bin",
      HOME: "/release/home",
      XDG_CONFIG_HOME: "/release/home/.config",
      XDG_CACHE_HOME: "/release/home/.cache",
    });
  });

  test("Git commits have one fixed identity inside the private release home", () => {
    const environment = releaseCommitEnvironment({
      PATH: process.env.PATH,
      HOME: "/operator",
      VELA_RELEASE_HOME: "/release/home",
      NODE_OPTIONS: "--require=/operator/inject.js",
    });
    const result = spawnSync("git", ["var", "GIT_AUTHOR_IDENT"], {
      encoding: "utf8",
      env: environment,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Vela Observatory release <release@vela.space>");
    expect(environment.NODE_OPTIONS).toBeUndefined();
    expect(environment.HOME).toBe("/release/home");
  });
});
