import { z } from "zod";
import releaseJson from "../config/vela-release.v1.json";

const root = z.string().regex(/^sha256:[0-9a-f]{64}$/u);

/**
 * A release this code can still READ a projection from, distinct from the one
 * it generates with.
 *
 * The record used to state one version and the reader asserted equality against
 * it, which made a version bump unperformable. Code lands first; the projection
 * is generated afterwards, by the workflow whose own gate runs that reader. So
 * for the whole window between the two, every projection-reading check failed —
 * including the gate on the refresh that would have closed the window. Bumping
 * to 0.966.3 deadlocked exactly there, and the only reason production stayed up
 * is that it was serving pages prerendered before the bump.
 *
 * Projection selection and pruning retain exact roots, not version labels. A
 * predecessor belongs here only while one of those retained manifests still
 * carries it; remove the entry in the same release tranche once no retained
 * root does. This is temporary compatibility, not a permanent reader mode.
 */
const readablePredecessorSchema = z.object({
  version: z.string().regex(/^0\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u),
  generator_binary_sha256: root,
  macos_generator_binary_sha256: root,
});

export const velaReleaseSchema = z.object({
  schema: z.literal("vela.release-record.v1"),
  version: z.string().regex(/^0\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u),
  tag: z.string().regex(/^v0\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u),
  commit: z.string().regex(/^[0-9a-f]{40}$/u),
  release_url: z.string().url(),
  docs_url: z.string().url(),
  generator_binary_sha256: root,
  macos_generator_binary_sha256: root,
  linux_archive_sha256: root,
  macos_archive_sha256: root,
  readable_predecessors: z.array(readablePredecessorSchema).default([]),
})
  /* Each field above is well-formed on its own; these two say the record
     agrees with itself. They were asserted by the bespoke installer that used
     to fetch the release asset, and outlived it: the tag is what CI asks
     install.sh for while the version is what it holds `vela --version` to, and
     release_url is the link the site puts in front of a reader. A record whose
     three names for one release disagree sends someone to the wrong page. */
  .refine((record) => record.tag === `v${record.version}`, {
    message: "tag must be the version with a leading v",
    path: ["tag"],
  })
  .refine((record) => record.release_url.endsWith(`/releases/tag/${record.tag}`), {
    message: "release_url must point at the tag this record names",
    path: ["release_url"],
  });

export type VelaReleaseRecord = z.infer<typeof velaReleaseSchema>;
export const velaRelease: VelaReleaseRecord = velaReleaseSchema.parse(releaseJson);

/** Every `vela_version` string a stored projection may carry and still be read. */
export const velaReadableVersions: readonly string[] = [
  `vela ${velaRelease.version}`,
  ...velaRelease.readable_predecessors.map((entry) => `vela ${entry.version}`),
];

/* Reading is the widened set. GENERATING is not: the refresh resolves its
   binary through velaGeneratorBinaryRootForPlatform below, which knows only the
   pinned release, so a predecessor can never produce a new projection. */
export const velaGeneratorBinaryRoots = new Set([
  velaRelease.generator_binary_sha256,
  velaRelease.macos_generator_binary_sha256,
  ...velaRelease.readable_predecessors.flatMap((entry) => [
    entry.generator_binary_sha256,
    entry.macos_generator_binary_sha256,
  ]),
]);

export type VelaGeneratorPlatform = "darwin" | "linux";

/**
 * Returns the one released generator binary root for the host executing a
 * projection refresh. The release record is the only source of these roots;
 * unsupported hosts fail closed rather than accepting a same-version binary.
 */
export function velaGeneratorBinaryRootForPlatform(
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform === "linux") return velaRelease.generator_binary_sha256;
  if (platform === "darwin") return velaRelease.macos_generator_binary_sha256;
  throw new Error(`Vela projection refresh does not support platform ${platform}`);
}
