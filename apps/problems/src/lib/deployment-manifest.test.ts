import { describe, expect, test } from "vitest";
import { computeBrandRoot } from "@vela/brand/integrity";
import {
  createCurrentProblemsDeploymentManifest,
  createProblemsDeploymentManifest,
  problemsDeploymentManifestSchema,
} from "@vela/projection-data/deployment";
import { repositoryRegistry } from "@vela/projection-data/registry";
import { resolve } from "node:path";
import { projectionManifestFixture } from "@/test/repository-fixtures";

describe("Problems deployment identity", () => {
  test("binds the exact Neon projection without a copied snapshot", () => {
    const projection = projectionManifestFixture();
    expect(projection.schema).toBe("vela.projection-release-manifest");
    expect(projection.release_root).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(projection.source_repositories).toHaveLength(repositoryRegistry.repositories.length);
  });

  test("rejects predecessor manifest markers", () => {
    const projection = projectionManifestFixture() as Record<string, unknown>;
    projection.read_model_schema = "projection.v9";
    expect(() => problemsDeploymentManifestSchema.shape.projection.parse(projection))
      .toThrow("Unrecognized key");
    delete projection.read_model_schema;
    projection.schema = "vela.projection-release-manifest.v9";
    expect(() => problemsDeploymentManifestSchema.shape.projection.parse(projection))
      .toThrow("vela.projection-release-manifest");
  });

  test("builds the public manifest from the current projection reader", async () => {
    const repository = resolve(import.meta.dirname, "../../../..");
    const current = projectionManifestFixture();
    const staleBuildRoot = `sha256:${"f".repeat(64)}`;
    current.release_root = `sha256:${"c".repeat(64)}`;
    const manifest = await createCurrentProblemsDeploymentManifest({
      VELA_SITE_VERSION: "0.430.0",
      VELA_SITE_BRAND_ROOT: computeBrandRoot(repository),
      VELA_PROJECTION_RELEASE_ROOT: staleBuildRoot,
    }, async () => current);

    expect(manifest.projection.release_root).toBe(current.release_root);
    expect(manifest.projection.release_root).not.toBe(staleBuildRoot);
    expect(manifest.deployment.provider).toBe("local_or_preview");
  });

  test("keeps the Problems projection non-authoritative", () => {
    const repository = resolve(import.meta.dirname, "../../../..");
    const manifest = createProblemsDeploymentManifest({
      version: "0.380.0",
      brandRoot: computeBrandRoot(repository),
      projection: projectionManifestFixture(),
      environment: {},
    });
    expect(problemsDeploymentManifestSchema.parse(manifest).authority).toBe("read_only_projection");
    expect(manifest.canonical_url).toBe("https://problems.science/");
    expect(manifest.delivery.mode).toBe("immutable_isr");
    expect(manifest.data_source).toEqual({
      provider: "neon",
      project_id: "lingering-meadow-20929365",
      database: "vela_projection",
      access: "read_only",
      role: "vela_projection_reader_20260813",
    });
  });

  test("uses commit identity instead of inventing a release tag", () => {
    const repository = resolve(import.meta.dirname, "../../../..");
    const brandRoot = computeBrandRoot(repository);
    const problems = createProblemsDeploymentManifest({
      version: "0.430.0",
      brandRoot,
      projection: projectionManifestFixture(),
      environment: {},
    });
    expect(problems.site).not.toHaveProperty("tag");
  });

  test("publishes exact current repository and origin roots", () => {
    const repository = resolve(import.meta.dirname, "../../../..");
    const projection = projectionManifestFixture();
    const source = projection.source_repositories[0];
    const manifest = createProblemsDeploymentManifest({
      version: "0.380.0",
      brandRoot: computeBrandRoot(repository),
      projection,
      environment: {},
    });
    expect(manifest.projection.source_repositories[0]).toMatchObject({
      origin_id: source.origin_id,
      origin_root: source.origin_root,
      repository_root: source.repository_root,
    });
  });

  test("rejects incomplete repository roots and Claim standing counts", () => {
    const repository = resolve(import.meta.dirname, "../../../..");
    const missingRepository = projectionManifestFixture();
    delete (missingRepository.source_repositories[0] as {
      repository_root?: string;
    }).repository_root;
    expect(() => createProblemsDeploymentManifest({
      version: "0.380.0",
      brandRoot: computeBrandRoot(repository),
      projection: missingRepository,
      environment: {},
    })).toThrow("repository_root");

    const mismatchedCounts = projectionManifestFixture();
    mismatchedCounts.source_repositories[0].pending_claim_count = 1;
    expect(() => createProblemsDeploymentManifest({
      version: "0.380.0",
      brandRoot: computeBrandRoot(repository),
      projection: mismatchedCounts,
      environment: {},
    })).toThrow("Claim standing counts do not partition");
  });

  test("rejects a projection generated by a binary outside the checked release record", () => {
    const repository = resolve(import.meta.dirname, "../../../..");
    const projection = projectionManifestFixture();
    projection.vela_binary_sha256 = `sha256:${"a".repeat(64)}`;
    expect(() => createProblemsDeploymentManifest({
      version: "0.380.0",
      brandRoot: computeBrandRoot(repository),
      projection,
      environment: {},
    })).toThrow("projection generator binary is not a checked platform binary for this Vela release");
  });

  test("fails production generation before writing an incomplete identity", () => {
    const repository = resolve(import.meta.dirname, "../../../..");
    const projection = projectionManifestFixture();
    expect(() => createProblemsDeploymentManifest({
      version: "0.380.0",
      brandRoot: computeBrandRoot(repository),
      projection,
      environment: { VERCEL_ENV: "production" },
    })).toThrow("production Problems deployment identity is incomplete");
  });
});
