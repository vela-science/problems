import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createManifest: vi.fn(),
}));

/* The real module, with one function replaced. `DeploymentManifestError` is
   what the route branches on, so a mock that omitted it would make the route
   compare against `undefined` and this file would be testing a different
   program than the one that ships. */
vi.mock("@vela/projection-data/deployment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vela/projection-data/deployment")>()),
  createCurrentProblemsDeploymentManifest: mocks.createManifest,
}));

import { DeploymentManifestError } from "@vela/projection-data/deployment";
import { GET } from "./route";

describe("live Problems deployment manifest", () => {
  beforeEach(() => {
    mocks.createManifest.mockReset();
  });

  test("serves the current projection with no intermediary caching", async () => {
    const root = `sha256:${"c".repeat(64)}`;
    mocks.createManifest.mockResolvedValue({
      schema: "vela.site-deployment.v4",
      projection: { release_root: root },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
    expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
    expect(response.headers.get("x-vela-projection-root")).toBe(root);
    expect(await response.json()).toMatchObject({
      schema: "vela.site-deployment.v4",
      projection: { release_root: root },
    });
  });

  test("fails closed without caching when the projection head is unavailable", async () => {
    mocks.createManifest.mockRejectedValue(new Error("connection terminated unexpectedly"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({
      error: "current Problems deployment manifest unavailable",
      code: "projection_unavailable",
    });
  });

  /* The reader who waits through a 503 and comes back is right to, and the
     reader who waits through a missing environment variable is not. This route
     told both of them the same thing. */
  test("answers a misconfigured build with 500 and names what is missing", async () => {
    mocks.createManifest.mockRejectedValue(new DeploymentManifestError(
      "missing_build_value",
      "VELA_SITE_BRAND_ROOT is required for the Problems deployment manifest",
    ));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({
      error: "VELA_SITE_BRAND_ROOT is required for the Problems deployment manifest",
      code: "missing_build_value",
    });
  });

  /* And a driver error is not published, whatever it says. */
  test("does not echo a failure it did not author", async () => {
    mocks.createManifest.mockRejectedValue(new Error("postgres://user:secret@host/db refused"));
    const body = await (await GET()).json();
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
