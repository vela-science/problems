import { describe, expect, test } from "bun:test";
import { gzipSync } from "node:zlib";
import { projectionManifest } from "../src/index";
import { assertReadableRelease, graphRead, searchRead } from "../src/read-contracts";
import { projectionRefusal } from "../src/refusal";
import { slugForRepositoryId } from "../src/registry";

/* The manifest names repositories; the reads take the handle a URL carries.
   Falling back to the id keeps a failure legible: an unregistered repository
   then fails on the read rather than on an undefined handle here. */
function handleFor(repositoryId: string): string {
  return slugForRepositoryId(repositoryId) ?? repositoryId;
}

const hasDatabase = Boolean(process.env.VELA_PROJECTION_DATABASE_URL);
if (process.env.VELA_REQUIRE_PROJECTION_TESTS === "1" && !hasDatabase) {
  throw new Error("projection integration tests require VELA_PROJECTION_DATABASE_URL");
}
const describeProjection = hasDatabase ? describe : describe.skip;

/*
  Every repository the release publishes, not one named one. These four asked
  for `erdos` by slug, and the registry now holds `math`, so all four failed on
  "unknown repository" — a read contract that works perfectly reported as broken,
  which is the same defect in the opposite direction as a broken one reporting
  as fine. The contracts under test are about the release agreeing with itself
  and refusing what it does not hold; neither has anything to do with a name.
*/
describeProjection("root-bound Problems read contracts", () => {
  test("serves every published graph within the canvas budget", async () => {
    const manifest = await projectionManifest();
    expect(manifest.source_repositories.length).toBeGreaterThan(0);
    for (const published of manifest.source_repositories) {
      const graph = await graphRead({
        root: manifest.release_root,
        repository: handleFor(published.repository_id),
        view: "canvas",
        lens: "all",
        limit: 5000,
      });
      expect(graph.nodes).toHaveLength(published.graph_node_count);
      expect(graph.edges).toHaveLength(published.graph_edge_count);
      expect(gzipSync(JSON.stringify(graph)).byteLength).toBeLessThanOrEqual(500 * 1024);
    }
  });

  /* What the release does not hold, it refuses. This half holds at any
     cardinality, including a repository with no graph at all, which is why it
     is separate from the half that needs a node to select. */
  test("rejects a repository, a node, and a limit the release cannot serve", async () => {
    const manifest = await projectionManifest();
    const published = handleFor(manifest.source_repositories[0]!.repository_id);
    await expect(graphRead({ root: manifest.release_root, repository: "missing", view: "canvas", lens: "all" })).rejects.toThrow("unknown repository");
    await expect(graphRead({ root: manifest.release_root, repository: published, view: "node", lens: "all", node: "missing" })).rejects.toThrow("unknown graph node");
    await expect(graphRead({ root: manifest.release_root, repository: published, view: "ledger", lens: "all", limit: Number.NaN })).rejects.toThrow("invalid result limit");
  });

  /* A refusal says which refusal it is, in a field, against the live retention
     window rather than against a fixture of it.
   *
   * The case that matters is the last one. A root no release carries used to
   * come back through the same string as a retired one, and the HTTP layer read
   * `expired` before `unknown`, so the Problems answered `410 Gone` for a
   * projection it had never held — asserting it had retained this state and
   * removed it. The distinction is only real against a real database, which is
   * why this test is here and not in the unit suite. */
  test("names which refusal a rooted read is", async () => {
    const manifest = await projectionManifest();
    await expect(assertReadableRelease(manifest.release_root)).resolves.toBe(manifest.release_root);

    const refusalOf = async (root: string) => {
      try {
        await assertReadableRelease(root);
        return null;
      } catch (error) {
        return projectionRefusal(error);
      }
    };
    expect(await refusalOf("not-a-root")).toBe("malformed_root");
    expect(await refusalOf(`sha256:${"0".repeat(64)}`)).toBe("unknown_root");
  });

  test("returns the relationships of a node the release publishes", async () => {
    const manifest = await projectionManifest();
    const withGraph = manifest.source_repositories.find(
      ({ graph_node_count }) => graph_node_count > 0,
    );
    if (!withGraph) {
      console.info("skipped: the release publishes no graph node to select");
      return;
    }
    const canvas = await graphRead({
      root: manifest.release_root,
      repository: handleFor(withGraph.repository_id),
      view: "canvas",
      lens: "all",
      limit: 5000,
    });
    /* A node with at least one edge, because a node's relationships are what
       this reads. An isolated node is a legitimate graph and a useless probe. */
    const connected = canvas.nodes.find(({ id }) => canvas.edges.some(
      ({ source_id, target_id }) => source_id === id || target_id === id,
    ));
    if (!connected) {
      console.info("skipped: the release publishes no connected graph node");
      return;
    }
    const graph = await graphRead({
      root: manifest.release_root,
      repository: handleFor(withGraph.repository_id),
      view: "node",
      lens: "all",
      node: connected.id,
    });
    expect(graph.selected?.id).toBe(connected.id);
    expect(graph.neighbors.length).toBeGreaterThan(0);
  });

  test("projects a published Claim as grouped object context", async () => {
    const manifest = await projectionManifest();
    const withClaims = manifest.source_repositories.find(
      ({ graph_claim_count }) => graph_claim_count > 0,
    );
    if (!withClaims) {
      console.info("skipped: the release publishes no Claim to project");
      return;
    }
    const matches = await graphRead({
      root: manifest.release_root,
      repository: handleFor(withClaims.repository_id),
      view: "ledger",
      lens: "research",
      kind: "claim",
      limit: 10,
    });
    const claim = matches.nodes.find(({ id }) => id.startsWith("vcl_"));
    expect(claim).toBeDefined();
    const graph = await graphRead({
      root: manifest.release_root,
      repository: handleFor(withClaims.repository_id),
      view: "node",
      lens: "research",
      node: claim!.id,
    });
    const context = graph.object_context;
    expect(context?.schema).toBe("site.object-context.v1");
    expect(context?.object.id).toBe(claim!.id);
    expect(context?.relationship_count).toBeGreaterThan(0);
    expect(context?.groups.length).toBeGreaterThan(0);
    expect(context?.groups.flatMap(({ relationships }) => relationships).every(({ source_root }) => source_root?.startsWith("sha256:"))).toBe(true);
  });

  test("queries normalized search documents with release identity", async () => {
    const manifest = await projectionManifest();
    const published = handleFor(manifest.source_repositories[0]!.repository_id);
    const unfiltered = await searchRead({ root: manifest.release_root, repository: published, limit: 250 });
    /* Every published repository indexes itself, so this floor holds at any
       cardinality — asking for the literal "erdos" tested the epoch, not the
       search. */
    expect(unfiltered.records.length).toBeGreaterThan(0);
    expect(unfiltered.generated_at).toBe(manifest.generated_at);
    /* `%` is a term, not a pattern. A projection that passed it through to LIKE
       would return everything. */
    const literalWildcard = await searchRead({ root: manifest.release_root, repository: published, q: "%", limit: 1 });
    expect(literalWildcard.total).toBeLessThan(unfiltered.total);
    expect(gzipSync(JSON.stringify(unfiltered)).byteLength).toBeLessThanOrEqual(250 * 1024);
    await expect(searchRead({ root: manifest.release_root, repository: "missing" })).rejects.toThrow("unknown repository");
  });
});
