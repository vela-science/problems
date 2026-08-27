import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";
import { canonicalJson, sha256 } from "../canonical";
import {
  loadProjectionSourceAdapterSet,
  type PreparedProjectionSourceAdapters,
} from "./refresh";
import {
  projectionSourceAdapterArtifactFilename,
  projectionSourceAdapterArtifactReferenceSchema,
  projectionSourceAdapterArtifactReleaseTag,
  type ProjectionSourceAdapterArtifactReference,
} from "./reference";

export {
  projectionSourceAdapterArtifactFilename,
  projectionSourceAdapterArtifactReleaseTag,
} from "./reference";

const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);
const artifactPathSchema = z.string().refine((value) => (
  value === "source-adapters.json"
  || /^[a-z0-9]+(?:-[a-z0-9]+)*\/manifest\.json$/u.test(value)
  || /^[a-z0-9]+(?:-[a-z0-9]+)*\/chunks\/[0-9]{6}\.ndjson$/u.test(value)
), "unsupported source-adapter artifact path");

const artifactFileSchema = z.object({
  path: artifactPathSchema,
  byte_length: z.number().int().nonnegative(),
  content_root: hashRootSchema,
  content_base64: z.string(),
}).strict().superRefine((value, context) => {
  const bytes = Buffer.from(value.content_base64, "base64");
  if (bytes.toString("base64") !== value.content_base64) {
    context.addIssue({
      code: "custom",
      path: ["content_base64"],
      message: "artifact file is not canonical base64",
    });
  }
  if (bytes.byteLength !== value.byte_length) {
    context.addIssue({
      code: "custom",
      path: ["byte_length"],
      message: "artifact file byte length does not match its payload",
    });
  }
  if (sha256(bytes) !== value.content_root) {
    context.addIssue({
      code: "custom",
      path: ["content_root"],
      message: "artifact file root does not match its payload",
    });
  }
});

const sourceAdapterArtifactBodySchema = z.object({
  schema: z.literal("vela.projection-source-adapter-artifact.v1"),
  set_root: hashRootSchema,
  file_count: z.number().int().positive(),
  payload_byte_length: z.number().int().nonnegative(),
  files: z.array(artifactFileSchema).min(1),
}).strict().superRefine((value, context) => {
  const paths = value.files.map(({ path }) => path);
  if (new Set(paths).size !== paths.length) {
    context.addIssue({
      code: "custom",
      path: ["files"],
      message: "source-adapter artifact paths must be unique",
    });
  }
  if (paths.some((path, index) => index > 0 && path <= paths[index - 1])) {
    context.addIssue({
      code: "custom",
      path: ["files"],
      message: "source-adapter artifact files are not in canonical path order",
    });
  }
  if (value.file_count !== value.files.length) {
    context.addIssue({
      code: "custom",
      path: ["file_count"],
      message: "source-adapter artifact file count does not match",
    });
  }
  const byteLength = value.files.reduce(
    (total, file) => total + file.byte_length,
    0,
  );
  if (value.payload_byte_length !== byteLength) {
    context.addIssue({
      code: "custom",
      path: ["payload_byte_length"],
      message: "source-adapter artifact payload size does not match",
    });
  }
});

export const projectionSourceAdapterArtifactSchema =
  sourceAdapterArtifactBodySchema.extend({
    artifact_root: hashRootSchema,
  }).strict().superRefine((value, context) => {
    const { artifact_root: _root, ...body } = value;
    if (value.artifact_root !== sha256(canonicalJson(body))) {
      context.addIssue({
        code: "custom",
        path: ["artifact_root"],
        message: "source-adapter artifact root does not match its canonical content",
      });
    }
  });

export type ProjectionSourceAdapterArtifact = z.infer<
  typeof projectionSourceAdapterArtifactSchema
>;

export interface LoadedProjectionSourceAdapterArtifact
  extends PreparedProjectionSourceAdapters {
  artifact: ProjectionSourceAdapterArtifact;
  reference: ProjectionSourceAdapterArtifactReference;
}

function artifactReference(
  artifact: ProjectionSourceAdapterArtifact,
): ProjectionSourceAdapterArtifactReference {
  return projectionSourceAdapterArtifactReferenceSchema.parse({
    schema: "vela.projection-source-adapter-artifact-reference.v3",
    set_root: artifact.set_root,
    artifact_root: artifact.artifact_root,
    retrieval: {
      type: "github_release_asset",
      repository: "vela-science/problems",
      release_tag: projectionSourceAdapterArtifactReleaseTag(artifact.set_root),
      filename: projectionSourceAdapterArtifactFilename(artifact.set_root),
      authentication: "none",
    },
  });
}

function withinDirectory(directory: string, relativePath: string): string {
  const root = resolve(directory);
  const candidate = resolve(root, relativePath);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    throw new Error(`source-adapter artifact path escapes its directory: ${relativePath}`);
  }
  return candidate;
}

async function artifactFile(
  directory: string,
  path: string,
): Promise<z.input<typeof artifactFileSchema>> {
  const bytes = await readFile(withinDirectory(directory, path));
  return {
    path,
    byte_length: bytes.byteLength,
    content_root: sha256(bytes),
    content_base64: bytes.toString("base64"),
  };
}

export async function writeProjectionSourceAdapterArtifact(
  manifestPath: string,
  outputPath: string,
): Promise<{
  artifact: ProjectionSourceAdapterArtifact;
  reference: ProjectionSourceAdapterArtifactReference;
}> {
  const absoluteManifest = resolve(manifestPath);
  const prepared = await loadProjectionSourceAdapterSet(absoluteManifest);
  const directory = dirname(absoluteManifest);
  const paths = ["source-adapters.json"];
  for (const source of prepared.manifest.sources) {
    const verified = prepared.bundles.get(source.source_id);
    if (!verified) throw new Error(`${source.source_id}: verified bundle is missing`);
    paths.push(`${source.directory}/manifest.json`);
    paths.push(...verified.bundle.output.chunks.map(
      ({ path }) => `${source.directory}/${path}`,
    ));
  }
  const files = await Promise.all(
    [...paths].sort().map((path) => artifactFile(directory, path)),
  );
  const body = sourceAdapterArtifactBodySchema.parse({
    schema: "vela.projection-source-adapter-artifact.v1",
    set_root: prepared.manifest.set_root,
    file_count: files.length,
    payload_byte_length: files.reduce(
      (total, file) => total + file.byte_length,
      0,
    ),
    files,
  });
  const artifact = projectionSourceAdapterArtifactSchema.parse({
    ...body,
    artifact_root: sha256(canonicalJson(body)),
  });
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(resolve(outputPath), `${canonicalJson(artifact)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return { artifact, reference: artifactReference(artifact) };
}

export async function loadProjectionSourceAdapterArtifact(
  artifactPath: string,
): Promise<LoadedProjectionSourceAdapterArtifact> {
  const artifactBytes = await readFile(resolve(artifactPath), "utf8");
  const parsed = JSON.parse(artifactBytes) as unknown;
  if (`${canonicalJson(parsed)}\n` !== artifactBytes) {
    throw new Error("projection source-adapter artifact is not canonical JSON");
  }
  const artifact = projectionSourceAdapterArtifactSchema.parse(parsed);
  const staging = await mkdtemp(join(tmpdir(), "vela-source-adapter-artifact-"));
  try {
    for (const file of artifact.files) {
      const path = withinDirectory(staging, file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, Buffer.from(file.content_base64, "base64"), {
        flag: "wx",
      });
    }
    for (const file of artifact.files.filter(({ path }) => (
      path.endsWith("/manifest.json")
    ))) {
      await mkdir(join(staging, dirname(file.path), "chunks"), {
        recursive: true,
      });
    }
    const prepared = await loadProjectionSourceAdapterSet(
      join(staging, "source-adapters.json"),
    );
    if (prepared.manifest.set_root !== artifact.set_root) {
      throw new Error("source-adapter artifact does not reconstruct its declared set root");
    }
    return {
      ...prepared,
      artifact,
      reference: artifactReference(artifact),
    };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
