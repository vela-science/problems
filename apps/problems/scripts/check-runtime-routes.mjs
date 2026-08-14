import {
  allRepositories,
  claimsForRepository,
  projectionManifest,
  problemsForRepository,
  slugForRepositoryId,
} from "@vela/projection-data";

const port = process.env.VELA_PROBLEMS_SMOKE_PORT ?? "4333";
const base = `http://127.0.0.1:${port}`;
const server = Bun.spawn(["bun", "x", "next", "start", "-p", port], {
  cwd: new URL("..", import.meta.url).pathname,
  env: process.env,
  stdout: "pipe",
  stderr: "pipe",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${base}/repositories`);
      if (response.ok) return;
    } catch {}
    await Bun.sleep(250);
  }
  throw new Error("Problems runtime did not become ready");
}

async function expectStatus(path, status) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  if (response.status !== status) throw new Error(`${path}: expected ${status}, received ${response.status}`);
  return response;
}

/* A refused rooted read is checked by the code it names, not only by its
   status. The status is a coarse summary — three of the eight refusals answer
   404 — and it was the status alone that let `unknown_root` be served as
   `410 Gone` for as long as the refusal carried nothing but English. */
async function expectRefusal(path, status, code) {
  const response = await expectStatus(path, status);
  const body = await response.json();
  if (body.code !== code) throw new Error(`${path}: expected refusal ${code}, received ${body.code ?? "none"}`);
}

/* Asserts the route renders, not that it renders under some byte count. A
   fixed ceiling cannot distinguish a regression from a surface that carries
   more evidence, and the second is the whole point of this product. What a
   careless change would actually break is checked directly elsewhere: no
   browser-delivered file may embed the full projection. */
async function expectRenderedHtml(path) {
  const response = await expectStatus(path, 200);
  return (await response.arrayBuffer()).byteLength;
}

/*
  Every surface the release actually publishes, rather than a repository named
  here.

  This smoke check spelled `erdos` into eighteen paths and refused to start
  without two projected Erdős Claims. The registry now holds `math`, which was
  re-issued with a fresh genesis and has admitted no Claim, so the check failed
  on a runtime that was serving every one of those routes correctly under a
  different name — and it failed at the top, before starting the server, so none
  of the seventeen route assertions that would have held ever ran.

  A surface that cannot exist without a record the release does not hold is
  skipped and reported as skipped. Every 404 assertion below holds at any
  cardinality and none of them is conditional: what the release does not have,
  it must refuse.
*/
try {
  const [repositories, manifest] = await Promise.all([
    allRepositories(),
    projectionManifest(),
  ]);
  const published = repositories[0];
  if (!published) throw new Error("the projection publishes no Repository to smoke");
  const slug = published.slug;
  /* The manifest names repositories, the reader names handles, and this is the
     one place the smoke test crosses between them. */
  const declared = manifest.source_repositories.find(
    (entry) => slugForRepositoryId(entry.repository_id) === slug,
  );
  if (!declared) throw new Error(`${slug} is published without a manifest entry`);

  const claims = (await claimsForRepository(slug, { limit: 2 })).items;
  const problems = (await problemsForRepository(slug, { limit: 1 })).items;
  const skipped = [];

  const routes = [
    "/repositories",
    `/repositories/${slug}`,
    `/repositories/${slug}/contribute`,
    `/repositories/${slug}/proposals`,
    `/repositories/${slug}/reproduce`,
    /* The ledger renders at any cardinality — a repository that retains no
       Problem says so there rather than resolving to nothing. */
    `/repositories/${slug}/problems`,
    "/work",
    "/proposals",
    "/decisions",
    "/search",
    "/graph",
    "/sources",
  ];
  if (!problems.length) skipped.push("problem record route: the release publishes no Problem");
  if (!claims.length) skipped.push("claim record routes: the release publishes no Claim");

  await waitForServer();

  for (const claim of new Set([claims[0], claims.at(-1)].filter(Boolean))) {
    const response = await expectStatus(`/repositories/${slug}/claims/${encodeURIComponent(claim.id)}`, 200);
    if (!(await response.text()).includes(claim.id)) throw new Error(`${claim.id}: Claim identity missing from rendered response`);
  }
  await expectStatus(`/repositories/${slug}/claims/vf_not-a-real-finding`, 404);
  const missingRepository = await expectStatus("/repositories/not-a-repository", 404);
  const missingRepositoryHtml = await missingRepository.text();
  if (
    !missingRepositoryHtml.includes("not-a-repository")
    || !missingRepositoryHtml.includes("Repository “")
    || !missingRepositoryHtml.includes("” is not published here.")
  ) {
    throw new Error("unknown Repository did not render the scoped recovery heading and named route parameter");
  }
  if (!missingRepositoryHtml.includes('\\"href\\":\\"/repositories\\"') || !missingRepositoryHtml.includes("Read published repositories")) {
    throw new Error("unknown Repository did not render its published-state recovery action");
  }
  if (!missingRepositoryHtml.includes('name="robots" content="noindex"')) {
    throw new Error("unknown Repository response omitted Next's noindex metadata");
  }
  if (problems.length) {
    const rendered = await expectRenderedHtml(`/repositories/${slug}/problems/${problems[0].problem}`);
    if (rendered <= 0) throw new Error("problem record response was empty");
  }
  await expectStatus(`/repositories/${slug}/problems/999999`, 404);
  await expectStatus("/repositories/not-a-repository/problems/1", 404);
  for (const path of routes) {
    await expectRenderedHtml(path);
  }
  const sourcesResponse = await expectStatus(
    `/sources.json?root=${encodeURIComponent(manifest.release_root)}`,
    200,
  );
  const sources = await sourcesResponse.json();
  if (
    sources.schema !== "vela.math-source-registry-read.v1"
    || sources.release_root !== manifest.release_root
    || sourcesResponse.headers.get("x-vela-projection-root") !== manifest.release_root
  ) {
    throw new Error("Math Source Registry JSON twin is not bound to the deployed release");
  }
  const firstSourceId = sources.sources?.[0]?.declaration?.source_id;
  if (!firstSourceId) throw new Error("Math Source Registry exposes no source record");
  await expectRenderedHtml(`/sources/${encodeURIComponent(firstSourceId)}`);
  await expectStatus("/sources/source%3Anot-a-source", 404);
  /* A root of sixty-four zeros was never activated, so the answer is that this
     reader has none — not that it once served this projection and stopped. */
  const absent = encodeURIComponent(`sha256:${"0".repeat(64)}`);
  await expectRefusal(`/api/search?root=${absent}`, 404, "unknown_root");
  await expectRefusal("/api/search?root=not-a-root", 400, "malformed_root");
  const search = await expectStatus(`/api/search?root=${encodeURIComponent(manifest.release_root)}`, 200);
  await expectRefusal(`/api/graph?root=${absent}&repository=${slug}`, 404, "unknown_root");
  await expectRefusal(
    `/api/graph?root=${encodeURIComponent(manifest.release_root)}&repository=not-a-repository`,
    404,
    "unknown_repository",
  );
  const graphResponse = await expectStatus(`/api/graph?root=${encodeURIComponent(manifest.release_root)}&repository=${slug}&view=canvas&lens=all`, 200);
  const graph = await graphResponse.json();
  if (graph.nodes?.length !== declared.graph_node_count || graph.edges?.length !== declared.graph_edge_count) {
    throw new Error(`complete ${slug} graph mismatch: ${graph.nodes?.length ?? 0} nodes / ${graph.edges?.length ?? 0} edges against ${declared.graph_node_count} / ${declared.graph_edge_count}`);
  }
  if (search.headers.get("x-vela-projection-root") !== manifest.release_root) throw new Error("search response root header drift");

  console.log(JSON.stringify({
    ok: true,
    schema: "vela.projection-runtime-smoke.v1",
    projection_root: manifest.release_root,
    repository: slug,
    routes_checked: routes.length,
    claims_checked: claims.length,
    skipped,
  }));
} finally {
  server.kill();
  await server.exited;
}
