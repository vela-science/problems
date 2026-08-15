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

/* One shape, because only one was ever produced.
 *
 * `artifact.ts` hard-codes v2, every stored release manifest and the live site
 * manifest report v2, and the v1 schema string appeared nowhere on disk except
 * the arm that declared it. A union of one live shape and one that never
 * existed is not compatibility, it is an unexercised branch — and it hid a
 * real defect: `sources:verify` printed `reference.locator`, a field only v1
 * defined, so the value silently dropped out of its own output. */
export const projectionSourceAdapterArtifactReferenceSchema =
  projectionSourceAdapterArtifactReferenceV2Schema;

export type ProjectionSourceAdapterArtifactReference = z.infer<
  typeof projectionSourceAdapterArtifactReferenceSchema
>;
