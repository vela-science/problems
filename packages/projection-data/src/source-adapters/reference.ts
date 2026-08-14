import { z } from "zod";

const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);

function setDigest(setRoot: string): string {
  if (!hashRootSchema.safeParse(setRoot).success) {
    throw new Error(`invalid projection source-adapter set root ${setRoot}`);
  }
  return setRoot.slice("sha256:".length);
}

export function projectionSourceAdapterArtifactFilename(setRoot: string): string {
  return `vela-projection-source-adapters-${setDigest(setRoot)}.json`;
}

export function projectionSourceAdapterArtifactReleaseTag(setRoot: string): string {
  return `source-adapter-set-${setDigest(setRoot)}`;
}

function legacyArtifactLocator(setRoot: string): string {
  return `https://github.com/vela-science/vela-web/releases/download/${projectionSourceAdapterArtifactReleaseTag(setRoot)}/${projectionSourceAdapterArtifactFilename(setRoot)}`;
}

const projectionSourceAdapterArtifactReferenceV1Schema = z.object({
  schema: z.literal("vela.projection-source-adapter-artifact-reference.v1"),
  set_root: hashRootSchema,
  artifact_root: hashRootSchema,
  locator: z.string().url(),
}).strict().superRefine((value, context) => {
  if (value.locator !== legacyArtifactLocator(value.set_root)) {
    context.addIssue({
      code: "custom",
      path: ["locator"],
      message: "legacy source-adapter artifact locator does not match its set root",
    });
  }
});

const projectionSourceAdapterArtifactReferenceV2Schema = z.object({
  schema: z.literal("vela.projection-source-adapter-artifact-reference.v2"),
  set_root: hashRootSchema,
  artifact_root: hashRootSchema,
  retrieval: z.object({
    type: z.literal("github_release_asset"),
    repository: z.literal("vela-science/vela-web"),
    release_tag: z.string(),
    filename: z.string(),
    authentication: z.literal("required"),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (value.retrieval.release_tag !== projectionSourceAdapterArtifactReleaseTag(value.set_root)) {
    context.addIssue({ code: "custom", path: ["retrieval", "release_tag"], message: "release tag does not match the set root" });
  }
  if (value.retrieval.filename !== projectionSourceAdapterArtifactFilename(value.set_root)) {
    context.addIssue({ code: "custom", path: ["retrieval", "filename"], message: "filename does not match the set root" });
  }
});

export const projectionSourceAdapterArtifactReferenceSchema = z.union([
  projectionSourceAdapterArtifactReferenceV1Schema,
  projectionSourceAdapterArtifactReferenceV2Schema,
]);

export type ProjectionSourceAdapterArtifactReference = z.infer<
  typeof projectionSourceAdapterArtifactReferenceSchema
>;
