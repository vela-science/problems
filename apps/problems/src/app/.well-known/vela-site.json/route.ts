import {
  createCurrentProblemsDeploymentManifest,
  DeploymentManifestError,
} from "@vela/projection-data/deployment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

export async function GET() {
  try {
    const manifest = await createCurrentProblemsDeploymentManifest();
    return Response.json(manifest, {
      headers: {
        ...noStoreHeaders,
        "X-Vela-Projection-Root": manifest.projection.release_root,
      },
    });
  } catch (error) {
    /* Two answers, because there are two situations and only one of them is
       worth waiting through.
     *
     * A `DeploymentManifestError` is this build's own configuration: a missing
     * `VELA_SITE_VERSION`, a brand root that is not a root, a production
     * deployment with no commit. No retry fixes any of them, so 503 was the
     * wrong thing to say — it is the status that means "come back later", and
     * the reader who did came back to the same answer. These are 500, with the
     * message this module authored, which names the variable to set.
     *
     * Everything else really may become available: the projection is mid
     * refresh, the database is unreachable, the current release manifest is
     * one this build cannot read. Those keep the fixed sentence rather than the
     * thrown one, because a driver error is not ours to publish on an
     * unauthenticated endpoint. */
    if (error instanceof DeploymentManifestError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 500, headers: noStoreHeaders },
      );
    }
    return Response.json(
      {
        error: "current Problems deployment manifest unavailable",
        code: "projection_unavailable",
      },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
