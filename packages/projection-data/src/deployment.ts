import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import {
  currentProjectionManifest,
  projectionManifestSchema,
} from "./index";
import { projectionReaderIdentity } from "./projection-reader";

const brandRootSchema = "vela.brand-root.v2" as const;

/**
 * A deployment manifest this build cannot produce because something an operator
 * controls is missing or wrong.
 *
 * `.well-known/vela-site.json` caught every throw into one
 * `503 {error: "current Problems deployment manifest unavailable"}`. At
 * least six causes reach that catch and four of them are permanent: a missing
 * `VELA_SITE_VERSION` or `VELA_SITE_BRAND_ROOT`, a brand root that is not a
 * root, a production deployment carrying no commit or id, and a projection
 * whose manifest this build cannot read — the deadlock `release.ts` describes.
 * 503 asks the reader to come back later, so the four that no amount of waiting
 * fixes were indistinguishable from the one where waiting is exactly right.
 *
 * These three are the ones this module owns. They are the caller's own
 * configuration, so the message is safe to publish; a driver error is not, and
 * the route keeps a fixed sentence for anything it did not author.
 */
export type DeploymentManifestRefusal =
  | "missing_build_value"
  | "malformed_brand_root"
  | "incomplete_deployment_identity";

export class DeploymentManifestError extends Error {
  readonly code: DeploymentManifestRefusal;

  constructor(code: DeploymentManifestRefusal, message: string) {
    super(message);
    this.name = "DeploymentManifestError";
    this.code = code;
  }
}

const commitSchema = z.string().regex(/^[0-9a-f]{40}$/u);
const rootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);

const deploymentSchema = z.object({
  provider: z.enum(["vercel", "local_or_preview"]),
  environment: z.string(),
  id: z.string().nullable(),
});

const problemsDeploymentManifestBase = z.object({
  schema: z.literal("vela.site-deployment.v4"),
  authority: z.literal("read_only_projection"),
  canonical_url: z.literal("https://problems.science/"),
  site: z.object({
    product: z.literal("problems"),
    version: z.string(),
    commit: commitSchema.nullable(),
    brand: z.object({ schema: z.literal("vela.brand-root.v2"), root: rootSchema }),
  }),
  projection: projectionManifestSchema,
  data_source: z.object({
    provider: z.literal("neon"),
    project_id: z.string(),
    database: z.string(),
    access: z.literal("read_only"),
    role: z.literal(projectionReaderIdentity.loginRole),
  }),
  delivery: z.object({ mode: z.literal("immutable_isr") }),
  deployment: deploymentSchema,
});

export const problemsDeploymentManifestSchema = problemsDeploymentManifestBase.superRefine((value, context) => {
  if (value.deployment.provider === "vercel") {
    if (value.site.commit === null) {
      context.addIssue({ code: "custom", path: ["site", "commit"], message: "production Problems commit is missing" });
    }
    if (!value.deployment.id) {
      context.addIssue({ code: "custom", path: ["deployment", "id"], message: "production Problems deployment ID is missing" });
    }
    if (value.deployment.environment !== "production") {
      context.addIssue({ code: "custom", path: ["deployment", "environment"], message: "Vercel Problems deployment is not identified as production" });
    }
  }
});

type Environment = Record<string, string | undefined>;

function deploymentIdentity(environment: Environment, label: string) {
  const production = environment.VERCEL_ENV === "production";
  const commit = environment.VERCEL_GIT_COMMIT_SHA ?? null;
  const id = environment.VERCEL_DEPLOYMENT_ID ?? environment.VERCEL_URL ?? null;
  if (production && (!commitSchema.safeParse(commit).success || !id)) {
    throw new DeploymentManifestError(
      "incomplete_deployment_identity",
      `production ${label} deployment identity is incomplete`,
    );
  }
  return {
    commit: commitSchema.safeParse(commit).success ? commit : null,
    deployment: {
      provider: production ? "vercel" as const : "local_or_preview" as const,
      environment: environment.VERCEL_ENV ?? "local",
      id,
    },
  };
}

export function createProblemsDeploymentManifest(input: {
  version: string;
  brandRoot: `sha256:${string}`;
  projection: unknown;
  environment?: Environment;
}) {
  const identity = deploymentIdentity(input.environment ?? process.env, "Problems");
  return problemsDeploymentManifestSchema.parse({
    schema: "vela.site-deployment.v4",
    authority: "read_only_projection",
    canonical_url: "https://problems.science/",
    site: {
      product: "problems",
      version: input.version,
      commit: identity.commit,
      brand: { schema: brandRootSchema, root: input.brandRoot },
    },
    projection: input.projection,
    data_source: {
      provider: "neon",
      project_id: "lingering-meadow-20929365",
      database: "vela_projection",
      access: "read_only",
      role: "vela_projection_reader_20260813",
    },
    delivery: { mode: "immutable_isr" },
    deployment: identity.deployment,
  });
}

function requiredBuildValue(environment: Environment, name: string): string {
  const value = environment[name];
  if (!value) {
    throw new DeploymentManifestError(
      "missing_build_value",
      `${name} is required for the Problems deployment manifest`,
    );
  }
  return value;
}

function problemsRuntimeEnvironment(): Environment {
  return {
    VELA_SITE_VERSION: process.env.VELA_SITE_VERSION,
    VELA_SITE_BRAND_ROOT: process.env.VELA_SITE_BRAND_ROOT,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID,
    VERCEL_URL: process.env.VERCEL_URL,
  };
}

/** Build the public manifest from immutable site identity and the live head. */
export async function createCurrentProblemsDeploymentManifest(
  environment: Environment = problemsRuntimeEnvironment(),
  projectionReader = currentProjectionManifest,
) {
  const version = requiredBuildValue(environment, "VELA_SITE_VERSION");
  const declaredBrandRoot = requiredBuildValue(environment, "VELA_SITE_BRAND_ROOT");
  if (!rootSchema.safeParse(declaredBrandRoot).success) {
    throw new DeploymentManifestError(
      "malformed_brand_root",
      "VELA_SITE_BRAND_ROOT is not a full lowercase sha256 root",
    );
  }
  const brandRoot = declaredBrandRoot as `sha256:${string}`;
  return createProblemsDeploymentManifest({
    version,
    brandRoot,
    projection: await projectionReader(),
    environment,
  });
}

export function writeDeploymentManifest(path: string, manifest: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
