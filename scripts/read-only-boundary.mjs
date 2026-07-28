import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const sourceExtensions = /\.[cm]?[jt]sx?$/u;
const routeHandler = /(?:^|\/)app(?:\/.*)?\/route\.[cm]?[jt]sx?$/u;
const serverDirective = /^\s*["']use server["'];?/mu;
const requestStateImport = /from\s+["']next\/headers["']/u;
const requestStateCall = /\b(?:cookies|draftMode|headers)\s*\(/u;
const runtimeEnvironment = /\bprocess\.env\b/u;
const authorityDependency = /from\s+["'](?:next-auth|@auth\/|firebase(?:\/|["'])|@supabase\/|@prisma\/|prisma(?:\/|["'])|pg(?:\/|["'])|postgres(?:\/|["'])|mysql(?:2)?(?:\/|["'])|mongoose(?:\/|["']))/u;
const fetchCall = /\bfetch\s*\(/gu;
const searchFetcher = "apps/observatory/src/lib/search-index.ts";
const graphFetcher = "apps/observatory/src/lib/graph-client.ts";
const searchRoute = "apps/observatory/src/app/api/search/route.ts";
const graphRoute = "apps/observatory/src/app/api/graph/route.ts";
const mutationMethod = /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)\b/u;

/* www used to be Astro, which could not express a Server Action or a
   route handler, so the boundary only had to police the Observatory.
   Both apps are Next now and both must be checked. www is additionally a
   static export, so a violation there would fail the build anyway — but
   the point of this gate is to state the boundary, not to rely on a
   bundler flag a later change could relax. */
export const BOUNDARY_SOURCES = ["apps/observatory/src", "apps/www/src"];

/* Throws on a missing source root, deliberately. Every fixture creates
   both roots, so an absent one means an app was renamed or deleted
   without updating BOUNDARY_SOURCES — and a gate that silently scans
   nothing is worse than no gate at all. */
function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function repositoryPath(repository, path) {
  return relative(repository, path).split(sep).join("/");
}

export function inspectReadOnlyBoundary(repository) {
  const sources = BOUNDARY_SOURCES.map((source) => resolve(repository, source));
  const violations = [];

  const candidates = sources.flatMap(filesBelow);
  for (const path of candidates.filter((candidate) => sourceExtensions.test(candidate))) {
    const file = repositoryPath(repository, path);
    const content = readFileSync(path, "utf8");
    const add = (rule, detail) => violations.push({ file, rule, detail });

    if (routeHandler.test(file) && file !== searchRoute && file !== graphRoute) add("route_handler", "Only the rooted read-only search and graph Route Handlers are allowed");
    if (mutationMethod.test(content)) add("mutation_handler", "Mutation methods are outside the read-only product boundary");
    if (serverDirective.test(content)) add("server_action", "Server Actions are outside the read-only product boundary");
    if (requestStateImport.test(content) || requestStateCall.test(content)) {
      add("request_state", "request-scoped headers, cookies, and server helpers are not allowed");
    }
    if (runtimeEnvironment.test(content)) add("runtime_environment", "browser and route source must not depend on runtime secrets");
    if (authorityDependency.test(content)) add("authority_dependency", "authentication and database dependencies are not allowed");

    const fetches = [...content.matchAll(fetchCall)].length;
    if (!fetches) continue;
    const isSearch = file === searchFetcher && content.includes("new URLSearchParams({ root: projectionRoot") && content.includes("`/api/search?${params}`") && content.includes("fetch(href,");
    const isGraph = file === graphFetcher && content.includes("new URLSearchParams({ root: input.root") && content.includes("`/api/graph?${params}`") && content.includes("fetch(`/api/graph?");
    if (fetches !== 1 || (!isSearch && !isGraph)) {
      add("request_time_fetch", "only exact-root same-origin GETs to the search and graph read contracts may be fetched at request time");
    }
  }

  return violations.sort((left, right) => `${left.file}:${left.rule}`.localeCompare(`${right.file}:${right.rule}`));
}

export function assertReadOnlyBoundary(repository) {
  const violations = inspectReadOnlyBoundary(repository);
  if (violations.length) {
    throw new Error([
      "Observatory read-only boundary failed:",
      ...violations.map(({ file, rule, detail }) => `- ${file}: ${rule}: ${detail}`),
    ].join("\n"));
  }
  return { ok: true, schema: "vela.web-read-only-boundary.v1" };
}
