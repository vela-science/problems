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

const projectionSourceAdapterArtifactReferenceV3Schema = z.object({
  schema: z.literal("vela.projection-source-adapter-artifact-reference.v3"),
  set_root: hashRootSchema,
  artifact_root: hashRootSchema,
  retrieval: z.object({
    type: z.literal("github_release_asset"),
    repository: z.literal("vela-science/problems"),
    release_tag: z.string(),
    filename: z.string(),
    authentication: z.literal("none"),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (value.retrieval.release_tag !== projectionSourceAdapterArtifactReleaseTag(value.set_root)) {
    context.addIssue({ code: "custom", path: ["retrieval", "release_tag"], message: "release tag does not match the set root" });
  }
  if (value.retrieval.filename !== projectionSourceAdapterArtifactFilename(value.set_root)) {
    context.addIssue({ code: "custom", path: ["retrieval", "filename"], message: "filename does not match the set root" });
  }
});

/* v2 remains readable because activated historical releases bind its private
 * `vela-web` locator. New artifacts are v3: the same content-addressed release
 * asset contract under public Problems custody, with no authentication. This
 * is history compatibility rather than a fallback: the writer emits only v3. */
export const projectionSourceAdapterArtifactReferenceSchema = z.union([
  projectionSourceAdapterArtifactReferenceV3Schema,
  projectionSourceAdapterArtifactReferenceV2Schema,
]);

export type ProjectionSourceAdapterArtifactReference = z.infer<
  typeof projectionSourceAdapterArtifactReferenceSchema
>;
