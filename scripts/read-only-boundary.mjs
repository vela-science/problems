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
const allowedSearchFetch = /\bfetch\s*\(\s*`\/api\/search\?root=\$\{encodeURIComponent\([A-Za-z_$][\w$]*\)\}`\s*,/gu;
const searchFetcher = "apps/observatory/src/lib/search-index.ts";
const searchRoute = "apps/observatory/src/app/api/search/route.ts";
const mutationMethod = /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)\b/u;

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
  const source = resolve(repository, "apps/observatory/src");
  const violations = [];

  for (const path of filesBelow(source).filter((candidate) => sourceExtensions.test(candidate))) {
    const file = repositoryPath(repository, path);
    const content = readFileSync(path, "utf8");
    const add = (rule, detail) => violations.push({ file, rule, detail });

    if (routeHandler.test(file) && file !== searchRoute) add("route_handler", "Only the bounded read-only search Route Handler is allowed");
    if (mutationMethod.test(content)) add("mutation_handler", "Mutation methods are outside the read-only product boundary");
    if (serverDirective.test(content)) add("server_action", "Server Actions are outside the read-only product boundary");
    if (requestStateImport.test(content) || requestStateCall.test(content)) {
      add("request_state", "request-scoped headers, cookies, and server helpers are not allowed");
    }
    if (runtimeEnvironment.test(content)) add("runtime_environment", "browser and route source must not depend on runtime secrets");
    if (authorityDependency.test(content)) add("authority_dependency", "authentication and database dependencies are not allowed");

    const fetches = [...content.matchAll(fetchCall)].length;
    if (!fetches) continue;
    const allowed = file === searchFetcher ? [...content.matchAll(allowedSearchFetch)].length : 0;
    if (file !== searchFetcher || fetches !== 1 || allowed !== 1) {
      add("request_time_fetch", "only the rooted same-origin read-only search endpoint may be fetched at request time");
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
