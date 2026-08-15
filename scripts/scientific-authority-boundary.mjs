import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { filesBelow } from "./fs.mjs";

const sourceExtensions = /\.[cm]?[jt]sx?$/u;
const routeHandler = /(?:^|\/)app(?:\/.*)?\/route\.[cm]?[jt]sx?$/u;
const serverDirective = /^\s*["']use server["'];?/mu;
const requestStateCall = /\b(?:cookies|draftMode|headers)\s*\(/u;
const runtimeEnvironment = /\bprocess\.env\b/u;
const fetchCall = /\bfetch\s*\(/gu;
const mutationMethods = /export\s+(?:(?:async\s+)?function\s+|(?:const|let|var)\s+)(POST|PUT|PATCH|DELETE)\b/gu;
const exportedSymbols = /export\s+(?:(default)|(?:async\s+)?(?:function|const|let|var)\s+([A-Za-z0-9_$]+))/gu;
const activityImport = /(?:from\s*|import\s*\(\s*)["']@vela\/activity-data(?:\/[^"']*)?["']/u;
const forbiddenScientificSchema = /["']vela\.(?:decision|event|standing|verification-record|repository)(?:\.[^"']*)?["']/iu;
const forbiddenAuthoritySymbol = /\b(?:create|emit|issue|record|sign|write|accept|reject|decide)[A-Za-z0-9_$]*(?:Decision|Standing|ScientificEvent|Verification|Proposal)\b/iu;
const forbiddenSigningCall = /\b(?:createPrivateKey|generateKeyPair|generateKeyPairSync|sign)\s*\(/u;
const forbiddenSigningImport = /(?:from\s*|import\s*\(\s*)["'](?:@noble\/ed25519|tweetnacl|libsodium|sodium-native|node:child_process|node:crypto)(?:\/[^"']*)?["']/u;
const forbiddenSecretEnvironment = /\bprocess\.env\.(?:[A-Z0-9_]*(?:AUTHORITY|PRIVATE|SIGNING)[A-Z0-9_]*KEY[A-Z0-9_]*|[A-Z0-9_]*SEED[A-Z0-9_]*)\b/u;
const localSigningModule = "packages/activity-data/src/local-signing.ts";

const searchFetcher = "apps/problems/src/lib/search-index.ts";
const graphFetcher = "apps/problems/src/lib/graph-client.ts";
const accountMenu = "apps/problems/src/components/vela/account-menu.tsx";
const problemsReadRoutes = new Set([
  "apps/problems/src/app/api/search/route.ts",
  "apps/problems/src/app/api/graph/route.ts",
  "apps/problems/src/app/sources.json/route.ts",
  "apps/problems/src/app/problems.json/route.ts",
  "apps/problems/src/app/.well-known/vela-site.json/route.ts",
]);

const problemsAccountRoute = "apps/problems/src/app/api/account/route.ts";
const problemsAuthCallbackRoute = "apps/problems/src/app/auth/callback/route.ts";
const problemsSignInRoute = "apps/problems/src/app/sign-in/route.ts";
const problemsSignOutAction = "apps/problems/src/app/actions/auth.ts";
const problemsActivityAction = "apps/problems/src/app/actions/activity.ts";
const problemsActivityDraftRoute = "apps/problems/src/app/drafts/[id]/export/route.ts";
const problemsActivityWorkbench = "apps/problems/src/components/vela/workbench.tsx";
const problemsAuthLibrary = "apps/problems/src/lib/auth.ts";
const problemsIdentityProxy = "apps/problems/src/proxy.ts";

export const PROBLEMS_IDENTITY_FILES = [
  problemsAccountRoute,
  problemsAuthCallbackRoute,
  problemsSignInRoute,
  problemsSignOutAction,
  problemsAuthLibrary,
  problemsIdentityProxy,
];

/* Kept as an export while the Problems ESLint config migrates with this
   boundary. It is the Problems list, not a workspace-wide identity list. */
export const PRODUCT_IDENTITY_FILES = PROBLEMS_IDENTITY_FILES;

const PROBLEMS_IDENTITY_ROUTES = new Set([
  problemsAccountRoute,
  problemsAuthCallbackRoute,
  problemsSignInRoute,
]);

const PROBLEMS_ACTIVITY_FILES = new Set([
  problemsActivityAction,
  problemsActivityDraftRoute,
  problemsActivityWorkbench,
]);

const ALLOWED_IDENTITY_ACTIONS = new Map([
  [problemsSignOutAction, [{ name: "signOutAccount", pin: "await signOut({ returnTo })" }]],
]);

export const BOUNDARY_PROFILES = Object.freeze([
  { name: "vela_app", root: "apps/problems/src" },
  { name: "activity_data_owner", root: "packages/activity-data/src" },
]);

export const BOUNDARY_SOURCES = BOUNDARY_PROFILES.map(({ root }) => root);

function boundedIdentityActions(file, content) {
  const allowed = ALLOWED_IDENTITY_ACTIONS.get(file);
  if (!allowed) return false;
  const exported = [...content.matchAll(exportedSymbols)].map((match) => match[1] ?? match[2]);
  const names = new Set(exported);
  return exported.length === allowed.length
    && names.size === allowed.length
    && allowed.every(({ name, pin }) => names.has(name) && content.includes(pin));
}

function repositoryPath(repository, path) {
  return relative(repository, path).split(sep).join("/");
}

function importedSpecifiers(content) {
  return [...content.matchAll(/(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)["']([^"']+)["']/gu)]
    .map((match) => match[1]);
}

function importsPackage(specifiers, name) {
  return specifiers.some((specifier) => specifier === name || specifier.startsWith(`${name}/`));
}

function profileFor(file) {
  return BOUNDARY_PROFILES.find(({ root }) => file === root || file.startsWith(`${root}/`));
}

function exactProblemsFetch(file, content, fetches) {
  if (fetches !== 1) return false;
  if (file === searchFetcher) {
    return content.includes("new URLSearchParams({ root: projectionRoot")
      && content.includes("`/api/search?${params}`")
      && content.includes("fetch(href,");
  }
  if (file === graphFetcher) {
    return content.includes("new URLSearchParams({ root: input.root")
      && content.includes("`/api/graph?${params}`")
      && content.includes("fetch(`/api/graph?");
  }
  return file === accountMenu
    && content.includes('fetch("/api/account", { cache: "no-store", credentials: "same-origin" })');
}

function inspectProblems(file, content, add) {
  const allowedRoute = problemsReadRoutes.has(file)
    || PROBLEMS_IDENTITY_ROUTES.has(file)
    || file === problemsActivityDraftRoute;
  if (routeHandler.test(file) && !allowedRoute) {
    add("app_route_handler", "Vela Route Handlers are confined to declared exact reads, identity, and draft export");
  }
  const methods = [...content.matchAll(mutationMethods)].map((match) => match[1]);
  if (methods.length) add("app_mutation", "Vela may not expose arbitrary product or scientific mutation handlers");
  if (
    serverDirective.test(content)
    && !boundedIdentityActions(file, content)
    && !(file === problemsActivityAction && activityImport.test(content))
  ) {
    add("problems_server_action", "Vela app Server Actions are confined to identity and the declared activity owner");
  }
  if (requestStateCall.test(content)) add("app_request_state", "Vela scientific reads may not depend on request state");
  if (
    runtimeEnvironment.test(content)
    && file !== problemsAuthLibrary
  ) {
    add("app_runtime_environment", "Vela runtime secrets are confined to its identity adapter");
  }
  const fetches = [...content.matchAll(fetchCall)].length;
  if (fetches && !exactProblemsFetch(file, content, fetches)) {
    add("app_request_fetch", "Vela fetches are confined to exact-root reads and its account session");
  }
}

function inspectActivityAuthority(file, content, add) {
  if (forbiddenScientificSchema.test(content)) {
    add("scientific_object_emission", "Activity code may emit only the public Submission draft payload");
  }
  if (forbiddenAuthoritySymbol.test(content)) {
    add("scientific_authority_symbol", "Activity code may not expose Proposal, Verification, Decision, Event, or Standing write operations");
  }
  if (
    file !== localSigningModule
    && (forbiddenSigningCall.test(content) || forbiddenSigningImport.test(content))
  ) {
    add("server_signing", "Hosted activity code may hash roots but may not hold or use signing machinery");
  }
  if (forbiddenSecretEnvironment.test(content)) {
    add("authority_secret", "Hosted activity code may not read authority, signing, private-key, or seed secrets");
  }
}

function inspectDependencyDirection(file, content, add) {
  const imports = importedSpecifiers(content);
  if (
    file.startsWith("apps/problems/")
    && importsPackage(imports, "@vela/activity-data")
    && !PROBLEMS_ACTIVITY_FILES.has(file)
  ) {
    add("activity_plane_dependency", "only the Vela app's declared Work boundary may depend on mutable activity data");
  }
  if (
    file.startsWith("apps/")
    && importsPackage(imports, "@vela/activity-data/local-signing")
  ) {
    add("hosted_signing_dependency", "applications may export a handoff but may not import the local signing helper");
  }
  if (
    file.startsWith("packages/activity-data/")
    && imports.some((specifier) => (
      importsPackage([specifier], "@vela/projection-data")
      && specifier !== "@vela/projection-data/canonical"
      && specifier !== "@vela/projection-data/read-contracts"
    ))
  ) {
    add("data_plane_dependency", "activity-data may reuse only problems-data canonical and read contracts");
  }
  if (
    file.startsWith("packages/projection-data/")
    && importsPackage(imports, "@vela/activity-data")
  ) {
    add("data_plane_cycle", "problems-data may not depend on mutable activity-data");
  }
}

function inspectActivitySchema(repository, violations) {
  const sqlRoot = resolve(repository, "packages/activity-data");
  if (!existsSync(sqlRoot)) return;
  const sqlFiles = filesBelow(sqlRoot).filter((path) => /\.sql$/u.test(path));
  for (const path of sqlFiles) {
    const file = repositoryPath(repository, path);
    const content = readFileSync(path, "utf8");
    const add = (rule, detail) => violations.push({
      file,
      profile: "activity_data_owner",
      rule,
      detail,
    });
    const forbiddenRelations = [...content.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+activity\.([a-z_]+)/giu)]
      .map((match) => match[1])
      .filter((name) => /(?:decision|event|standing|verification|proposal)/u.test(name));
    if (forbiddenRelations.length) {
      add("scientific_state_relation", `activity schema defines forbidden relations: ${forbiddenRelations.join(", ")}`);
    }
    const forbiddenFunctions = [...content.matchAll(/CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+activity(?:_api)?\.([a-z_]+)/giu)]
      .map((match) => match[1])
      .filter((name) => /(?:decision|event|standing|verification|proposal)/u.test(name));
    if (forbiddenFunctions.length) {
      add("scientific_state_function", `activity schema defines forbidden functions: ${forbiddenFunctions.join(", ")}`);
    }
    if (forbiddenScientificSchema.test(content)) {
      add("scientific_object_emission", "activity SQL may not construct Vela Event, Decision, Verification, Standing, or Repository objects");
    }
    if (/\b(?:authority_(?:private_)?key|private_key|signing_key|seed)\b/iu.test(content)) {
      add("authority_key_storage", "activity schema may store public roots and signer metadata, but no authority or private keys");
    }
    const allowedBoundedCrdtBytes = file === "packages/activity-data/schema/workspace-crdt.sql"
      && content.includes("update_bytes bytea NOT NULL CHECK (octet_length(update_bytes) BETWEEN 1 AND 262144)")
      && !/\b(?:artifact_bytes|content_bytes|transcript_bytes)\b/iu.test(content);
    if (/\b(?:bytea|artifact_bytes|content_bytes|transcript_bytes)\b/iu.test(content) && !allowedBoundedCrdtBytes) {
      add("artifact_byte_storage", "activity schema stores artifact roots, metadata, and locators only");
    }
  }
}

export function inspectScientificAuthorityBoundary(repository) {
  const violations = [];
  const candidates = [];
  for (const { name, root } of BOUNDARY_PROFILES) {
    const absolute = resolve(repository, root);
    if (!existsSync(absolute)) {
      violations.push({ file: root, profile: name, rule: "missing_profile_root", detail: "declared boundary root is missing" });
      continue;
    }
    candidates.push(...filesBelow(absolute));
  }

  /* Include the projection package only for the dependency-direction check.
     Its reader/projector authority checks remain in its own exact-root suite. */
  const problemsData = resolve(repository, "packages/projection-data/src");
  if (existsSync(problemsData)) candidates.push(...filesBelow(problemsData));

  for (const path of candidates.filter((candidate) => sourceExtensions.test(candidate))) {
    const file = repositoryPath(repository, path);
    const content = readFileSync(path, "utf8");
    const profile = profileFor(file)?.name ?? "dependency_direction";
    const add = (rule, detail) => violations.push({ file, profile, rule, detail });

    inspectDependencyDirection(file, content, add);
    if (profile === "vela_app") {
      inspectProblems(file, content, add);
      if (PROBLEMS_ACTIVITY_FILES.has(file)) {
      inspectActivityAuthority(file, content, add);
      }
    }
    if (profile === "activity_data_owner") inspectActivityAuthority(file, content, add);
  }

  inspectActivitySchema(repository, violations);
  return violations.sort((left, right) => (
    `${left.file}:${left.rule}`.localeCompare(`${right.file}:${right.rule}`)
  ));
}

export function assertScientificAuthorityBoundary(repository) {
  const violations = inspectScientificAuthorityBoundary(repository);
  if (violations.length) {
    throw new Error([
      "Vela scientific-authority boundary failed:",
      ...violations.map(({ file, profile, rule, detail }) => (
        `- ${file}: ${profile}:${rule}: ${detail}`
      )),
    ].join("\n"));
  }
  return { ok: true, schema: "vela.web-scientific-authority-boundary.v1" };
}
