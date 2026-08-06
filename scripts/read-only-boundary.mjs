import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { filesBelow } from "./fs.mjs";

const sourceExtensions = /\.[cm]?[jt]sx?$/u;
const routeHandler = /(?:^|\/)app(?:\/.*)?\/route\.[cm]?[jt]sx?$/u;
const serverDirective = /^\s*["']use server["'];?/mu;
/* The call, not the import. Which packages a file may reach for is now decided
   by `no-restricted-imports` / `no-restricted-syntax` in eslint.bans.mjs, where
   `await import("next/headers")` is the same fact as `from "next/headers"`; a
   regex here saw only the second. What is left is the other half of the same
   rule: a request-scoped helper reached through some other name. */
const requestStateCall = /\b(?:cookies|draftMode|headers)\s*\(/u;
const runtimeEnvironment = /\bprocess\.env\b/u;
const fetchCall = /\bfetch\s*\(/gu;
const searchFetcher = "apps/observatory/src/lib/search-index.ts";
const graphFetcher = "apps/observatory/src/lib/graph-client.ts";
const searchRoute = "apps/observatory/src/app/api/search/route.ts";
const graphRoute = "apps/observatory/src/app/api/graph/route.ts";
const sourceRegistryRoute = "apps/observatory/src/app/sources.json/route.ts";
const deploymentManifestRoute = "apps/observatory/src/app/.well-known/vela-site.json/route.ts";
const resultDossierRoute = /^apps\/observatory\/src\/app\/frontiers\/[^/]+\/dossiers\/[^/]+\.json\/route\.[cm]?[jt]sx?$/u;
const readOnlyRoutes = new Set([searchRoute, graphRoute, sourceRegistryRoute, deploymentManifestRoute]);
const accountRoute = "apps/observatory/src/app/api/account/route.ts";
const authCallbackRoute = "apps/observatory/src/app/auth/callback/route.ts";
const signInRoute = "apps/observatory/src/app/sign-in/route.ts";
const signOutAction = "apps/observatory/src/app/actions/auth.ts";
const authLibrary = "apps/observatory/src/lib/auth.ts";
const accountMenu = "apps/observatory/src/components/vela/account-menu.tsx";
const identityProxy = "apps/observatory/src/proxy.ts";
const identityRoutes = new Set([accountRoute, authCallbackRoute, signInRoute]);
/* The account boundary: the only files that may reach the maintained identity
   provider. Exported because apps/observatory/eslint.config.mjs needs the same
   list to scope the import ban, and two lists of the same six files would be
   one list and one stale list. */
export const PRODUCT_IDENTITY_FILES = [
  ...identityRoutes,
  signOutAction,
  authLibrary,
  identityProxy,
];
const mutationMethods = /export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/gu;

/* www used to be Astro, which could not express a Server Action or a
   route handler, so the boundary only had to police the Observatory.
   Both apps are Next now and both must be checked. www is additionally a
   static export, so a violation there would fail the build anyway — but
   the point of this gate is to state the boundary, not to rely on a
   bundler flag a later change could relax. */
export const BOUNDARY_SOURCES = ["apps/observatory/src", "apps/www/src"];

function repositoryPath(repository, path) {
  return relative(repository, path).split(sep).join("/");
}

export function inspectReadOnlyBoundary(repository) {
  const sources = BOUNDARY_SOURCES.map((source) => resolve(repository, source));
  const violations = [];

  /* Every fixture creates both roots, so an absent one means an app was
     renamed or deleted without updating BOUNDARY_SOURCES. filesBelow throws
     on it rather than scanning nothing. */
  const candidates = sources.flatMap(filesBelow);
  for (const path of candidates.filter((candidate) => sourceExtensions.test(candidate))) {
    const file = repositoryPath(repository, path);
    const content = readFileSync(path, "utf8");
    const add = (rule, detail) => violations.push({ file, rule, detail });

    if (routeHandler.test(file) && !readOnlyRoutes.has(file) && !identityRoutes.has(file) && !resultDossierRoute.test(file)) add("route_handler", "Only declared read projections and isolated product-identity Route Handlers are allowed");
    const methods = [...content.matchAll(mutationMethods)].map((match) => match[1]);
    if (methods.length) add("mutation_handler", "Mutation Route Handlers are outside the read-only product boundary");
    const boundedSignOutAction = file === signOutAction
      && content.includes("export async function signOutAccount()")
      && content.includes("await signOut({ returnTo })");
    if (serverDirective.test(content) && !boundedSignOutAction) add("server_action", "Only the isolated AuthKit sign-out action is allowed; scientific Server Actions remain outside the read-only product boundary");
    if (requestStateCall.test(content)) {
      add("request_state", "request-scoped headers, cookies, and server helpers are not allowed");
    }
    if (runtimeEnvironment.test(content) && file !== authLibrary) add("runtime_environment", "runtime secrets are confined to the server-only product-identity adapter");

    const fetches = [...content.matchAll(fetchCall)].length;
    if (!fetches) continue;
    const isSearch = file === searchFetcher && content.includes("new URLSearchParams({ root: projectionRoot") && content.includes("`/api/search?${params}`") && content.includes("fetch(href,");
    const isGraph = file === graphFetcher && content.includes("new URLSearchParams({ root: input.root") && content.includes("`/api/graph?${params}`") && content.includes("fetch(`/api/graph?");
    const isAccount = file === accountMenu
      && content.includes('fetch("/api/account", { cache: "no-store", credentials: "same-origin" })');
    if (fetches !== 1 || (!isSearch && !isGraph && !isAccount)) {
      add("request_time_fetch", "request-time fetches are confined to exact-root read contracts and the minimal same-origin account session contract");
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
