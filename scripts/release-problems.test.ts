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
  parseOperatorEnvFile,
  parsePruneResult,
  releaseChildEnvironment,
  releaseLookupState,
  releaseOrder,
  releaseWorkDirectory,
} from "./release-problems.mjs";

describe("direct Problems release", () => {
  test("classifies only a present release or an exact GitHub 404", () => {
    expect(releaseLookupState({ status: 0 })).toBe("present");
    expect(releaseLookupState({ status: 1, stdout: "HTTP/2.0 404 Not Found\n" })).toBe("missing");
    expect(releaseLookupState({ status: 1, stderr: "HTTP/2.0 404 Not Found\n" })).toBe("missing");
    expect(releaseLookupState({ status: 1, stderr: "HTTP/2.0 503 Service Unavailable\n" })).toBeNull();
  });

  test("is independent of GitHub Actions", () => {
    const source = readFileSync(resolve(import.meta.dir, "release-problems.mjs"), "utf8");
    expect(source).not.toContain("GITHUB_ACTIONS");
    expect(source).not.toContain("workflow_dispatch");
    expect(source).toContain("source-adapter-set-");
    expect(source).toContain("refresh-neon-projection.mjs");
    expect(source).toContain("refs/heads/ops/problems-release-lock");
    expect(source).toContain("--force-with-lease=");
    expect(source).toContain("VELA_GITHUB_CLI");
    expect(source).toContain("auth git-credential");
    expect(source).toContain("githubCli, [\"auth\", \"token\"");
    expect(source).toContain("origin/main advanced before publication");
    expect(source).toContain("rollback-checkpoint.json");
    expect(source).toContain('["observatory", "problems"].includes(manifest.site?.product)');
    expect(source).toContain('manifest?.site?.product !== "problems"');
    expect(source).toContain('/problems/erdos-problems/321?view=history');
    expect(source).toContain('"/problems/erdos-problems/999999"');
    expect(source).not.toContain('"/problems/erdos-problems/887"');
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

  test("parses the operator .env.local shape exactly", () => {
    expect(parseOperatorEnvFile([
      "# Local Problems development. Ignored by Git; mode 0600.",
      "",
      "VELA_PROJECTION_DATABASE_URL=postgresql://reader@example.test/db?sslmode=require",
      'VELA_ACTIVITY_DATABASE_URL="postgresql://activity@example.test/db"',
      "COOKIE_PASSWORD='pad=with=separators'",
      "EMPTY_QUOTED=\"\"",
      "MISMATCHED=\"left-double-right-single'",
      "INNER=pre\"served\"",
      "not-an-assignment",
      "=missing-name",
    ].join("\n"))).toEqual({
      VELA_PROJECTION_DATABASE_URL: "postgresql://reader@example.test/db?sslmode=require",
      VELA_ACTIVITY_DATABASE_URL: "postgresql://activity@example.test/db",
      COOKIE_PASSWORD: "pad=with=separators",
      EMPTY_QUOTED: "",
      MISMATCHED: "\"left-double-right-single'",
      INNER: 'pre"served"',
    });
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

  test("private-origin Git uses only the scoped GitHub credential helper", () => {
    const directory = mkdtempSync(join(tmpdir(), "vela-release-git-auth-"));
    const fakeGh = join(directory, "native gh");
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
        VELA_GITHUB_CLI: fakeGh,
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

  test("canonicalizes release custody before creating retained evidence", () => {
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

  test("parses one exact prune result without package-runner output", () => {
    const result = {
      schema: "vela.projection-prune-result.v1",
      ok: true,
      authority_effect: "none",
      retention: "current_and_two_predecessors",
      removed_releases: [`sha256:${"1".repeat(64)}`],
      removed_observations: [],
      removed_declarations: [],
    };
    expect(parsePruneResult(JSON.stringify(result))).toEqual(result);
    expect(() => parsePruneResult(`@vela/projection-data: ${JSON.stringify(result)}`))
      .toThrow();
    expect(() => parsePruneResult(`${JSON.stringify(result)}\ntrailing output`)).toThrow();
    expect(() => parsePruneResult(JSON.stringify({ ...result, retention: "all" })))
      .toThrow("projection prune returned an invalid result");
    expect(() => parsePruneResult(JSON.stringify({ ...result, authority: "accept" })))
      .toThrow("projection prune returned an invalid result");
    expect(() => parsePruneResult(JSON.stringify({ ...result, schema: "wrong" })))
      .toThrow("projection prune returned an invalid result");
    expect(() => parsePruneResult(JSON.stringify({
      ...result,
      removed_releases: [result.removed_releases[0], result.removed_releases[0]],
    }))).toThrow("projection prune returned an invalid result");
    expect(() => parsePruneResult(JSON.stringify({
      ...result,
      removed_observations: [7],
    }))).toThrow("projection prune returned an invalid result");
  });
});
