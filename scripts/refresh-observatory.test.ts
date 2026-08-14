import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  assertPublicQualification,
  githubGitEnvironment,
  releaseChildEnvironment,
  releaseCommitEnvironment,
  releaseOrder,
  releaseWorkDirectory,
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
    expect(source).toContain("gh\", [\"auth\", \"token\"");
    expect(source).toContain("origin/main advanced after qualification");
    expect(source).toContain("rollback-checkpoint.json");
    const activation = source.indexOf("context.refresh = JSON.parse");
    const checkpoint = source.indexOf(
      "writeRollbackCheckpoint(context, \"projection_activated\")",
      activation,
    );
    const postActivationCheck = source.indexOf('run("bun", ["run", "db:check"]', activation);
    expect(activation).toBeGreaterThan(-1);
    expect(checkpoint).toBeGreaterThan(activation);
    expect(postActivationCheck).toBeGreaterThan(checkpoint);
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

  test("private-origin Git uses only the scoped GitHub credential helper", () => {
    const directory = mkdtempSync(join(tmpdir(), "vela-release-git-auth-"));
    const fakeGh = join(directory, "gh");
    writeFileSync(fakeGh, `#!/bin/sh
if [ "$1 $2" != "auth git-credential" ]; then exit 64; fi
operation="$3"
if [ "$operation" = "get" ]; then
  printf 'protocol=https\\nhost=github.com\\nusername=x-access-token\\npassword=%s\\n' "$GH_TOKEN"
fi
`);
    chmodSync(fakeGh, 0o700);
    try {
      const environment = githubGitEnvironment({
        PATH: `${directory}:${process.env.PATH}`,
        VELA_RELEASE_HOME: directory,
        GH_CONFIG_DIR: join(directory, "gh"),
        GH_TOKEN: "scoped-test-token",
      });
      const result = spawnSync("git", ["credential", "fill"], {
        encoding: "utf8",
        env: environment,
        input: "protocol=https\nhost=github.com\n\n",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("username=x-access-token");
      expect(result.stdout).toContain("password=scoped-test-token");
      expect(environment.HOME).toBe(directory);
      expect(environment.GH_TOKEN).toBe("scoped-test-token");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("canonicalizes release custody before creating carrier output", () => {
    const automatic = releaseWorkDirectory({});
    expect(automatic.ephemeral).toBe(true);
    expect(automatic.path).toBe(realpathSync(automatic.path));
    rmSync(automatic.path, { recursive: true, force: true });

    const supplied = mkdtempSync(join(tmpdir(), "vela-release-custody-"));
    chmodSync(supplied, 0o700);
    try {
      const selected = releaseWorkDirectory({ VELA_RELEASE_WORKDIR: supplied });
      expect(selected).toEqual({ path: realpathSync(supplied), ephemeral: false });
    } finally {
      rmSync(supplied, { recursive: true, force: true });
    }
  });
});
