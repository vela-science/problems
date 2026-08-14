import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  root: `sha256:${"a".repeat(64)}`,
  resolverRoot: `sha256:${"b".repeat(64)}`,
  read: vi.fn(),
}));

vi.mock("@vela/projection-data", () => ({
  nativeProblemSourceRead: mocks.read,
  problemResolutionConfigRoot: mocks.resolverRoot,
}));

import { GET } from "./route";

describe("Problem source JSON twin", () => {
  beforeEach(() => {
    mocks.read.mockReset();
    mocks.read.mockResolvedValue({
      schema: "vela.problem-source-read.v1",
      release_root: mocks.root,
      resolver_root: mocks.resolverRoot,
      entity: null,
      canonical_record: { source_id: "source:erdos-problems", native_id: "erdos:999" },
      occurrences: [], statements: [], relations: [], identity_events: [], coverage: [],
    });
  });

  it("serves one exact, current resolver-bound source set without storing deployment-owned bytes", async () => {
    const response = await GET(new NextRequest(
      `https://problems.science/problems.json?root=${encodeURIComponent(mocks.root)}&resolver=${encodeURIComponent(mocks.resolverRoot)}&source=source%3Aerdos-problems&native_id=erdos%3A999&kind=problem`,
    ));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("etag")).toBeNull();
    expect(response.headers.get("x-vela-projection-root")).toBe(mocks.root);
    expect(response.headers.get("x-vela-resolver-root")).toBe(mocks.resolverRoot);
    expect(await response.json()).toMatchObject({ schema: "vela.problem-source-read.v1", entity: null });
    expect(mocks.read).toHaveBeenCalledWith({
      root: mocks.root,
      sourceId: "source:erdos-problems",
      nativeId: "erdos:999",
      nativeKind: "problem",
      candidateLimit: 250,
    });
  });

  it("requires bounded exact identity parameters", async () => {
    for (const url of [
      "https://problems.science/problems.json",
      `https://problems.science/problems.json?root=${encodeURIComponent(mocks.root)}&resolver=${encodeURIComponent(mocks.resolverRoot)}&source=invalid&native_id=erdos%3A999`,
      `https://problems.science/problems.json?root=${encodeURIComponent(mocks.root)}&resolver=${encodeURIComponent(mocks.resolverRoot)}&source=source%3Aerdos-problems&native_id=`,
      `https://problems.science/problems.json?root=${encodeURIComponent(mocks.root)}&resolver=${encodeURIComponent(mocks.resolverRoot)}&source=source%3Aerdos-problems&native_id=erdos%3A999`,
      `https://problems.science/problems.json?root=${encodeURIComponent(mocks.root)}&resolver=${encodeURIComponent(mocks.resolverRoot)}&source=source%3Aerdos-problems&native_id=erdos%3A999&kind=bad%20kind`,
    ]) {
      const response = await GET(new NextRequest(url));
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("refuses resolver drift before the current deployment read", async () => {
    const stale = `sha256:${"c".repeat(64)}`;
    const response = await GET(new NextRequest(
      `https://problems.science/problems.json?root=${encodeURIComponent(mocks.root)}&resolver=${encodeURIComponent(stale)}&source=source%3Aerdos-problems&native_id=erdos%3A999&kind=problem`,
    ));
    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-vela-resolver-root")).toBe(mocks.resolverRoot);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("returns a rooted 404 without falling back to another occurrence", async () => {
    mocks.read.mockResolvedValueOnce(null);
    const response = await GET(new NextRequest(
      `https://problems.science/problems.json?root=${encodeURIComponent(mocks.root)}&resolver=${encodeURIComponent(mocks.resolverRoot)}&source=source%3Aerdos-problems&native_id=erdos%3A404&kind=problem`,
    ));
    expect(response.status).toBe(404);
    expect(response.headers.get("x-vela-projection-root")).toBe(mocks.root);
    expect(await response.json()).toMatchObject({ error: "unknown source occurrence", native_id: "erdos:404" });
  });

  it("does not expose unexpected client, SQL, host, or credential details", async () => {
    mocks.read.mockRejectedValueOnce(new Error("SELECT secret FROM private_table at postgres://user:SENTINEL_SECRET@host.invalid/database"));
    const response = await GET(new NextRequest(
      `https://problems.science/problems.json?root=${encodeURIComponent(mocks.root)}&resolver=${encodeURIComponent(mocks.resolverRoot)}&source=source%3Aerdos-problems&native_id=erdos%3A999&kind=problem`,
    ));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ error: "Problem source read unavailable" });
    expect(body).not.toContain("SENTINEL_SECRET");
  });
});
