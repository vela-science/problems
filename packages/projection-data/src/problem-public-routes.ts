import { z } from "zod";
import routesJson from "../config/problem-public-routes.v1.json";
import { canonicalJson, sha256, type HashRoot } from "./canonical";
import {
  problemResolutionConfig,
  problemResolutionConfigRoot,
  type ProblemResolutionConfig,
} from "./problem-resolution";

const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u) as z.ZodType<HashRoot>;
const namespaceSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const repositorySchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const problemSchema = z.string().regex(/^[\w.:-]{1,64}$/u);
const canonicalPathSchema = z.string().regex(/^\/problems\/[a-z0-9]+(?:-[a-z0-9]+)*\/[1-9][0-9]*$/u);
const legacyPathSchema = z.string().regex(/^\/p\/[a-z0-9]+(?:-[a-z0-9]+)*\/[\w.:-]{1,64}$/u);

const routeSchema = z.object({
  entity_id: z.string().regex(/^problem:[a-z0-9]+(?::[a-z0-9]+)+$/u),
  canonical_namespace: namespaceSchema,
  canonical_problem: z.number().int().positive(),
  canonical_path: canonicalPathSchema,
  current_repository: repositorySchema,
  current_problem: problemSchema,
  current_path: legacyPathSchema,
  legacy_paths: z.array(legacyPathSchema).min(1),
}).strict();

export const problemPublicRoutesSchema = z.object({
  schema: z.literal("vela.problem-public-routes.v1"),
  resolver_root: hashRootSchema,
  semantics: z.object({
    authority_effect: z.literal("none"),
    identity_effect: z.literal("reviewed_navigation_only"),
  }).strict(),
  routes: z.array(routeSchema).min(1),
}).strict();

export type ProblemPublicRoutes = z.infer<typeof problemPublicRoutesSchema>;
export type ProblemPublicRoute = ProblemPublicRoutes["routes"][number];

export function parseProblemPublicRoutes(
  input: unknown,
  resolution: ProblemResolutionConfig = problemResolutionConfig,
  resolverRoot: HashRoot = problemResolutionConfigRoot,
): ProblemPublicRoutes {
  const parsed = problemPublicRoutesSchema.parse(input);
  if (parsed.resolver_root !== resolverRoot) {
    throw new Error("Problem public routes resolver root does not match the reviewed resolver config");
  }

  const entities = new Map(resolution.entities.map((entity) => [entity.entity_id, entity]));
  const entityIds = new Set<string>();
  const canonicalPaths = new Set<string>();
  const legacyPaths = new Set<string>();
  for (const route of parsed.routes) {
    const entity = entities.get(route.entity_id);
    if (!entity) throw new Error(`Problem public route references unknown resolver entity ${route.entity_id}`);
    const expectedCanonicalPath = `/problems/${entity.resolution_namespace}/${entity.problem_number}`;
    if (
      route.canonical_namespace !== entity.resolution_namespace
      || route.canonical_problem !== entity.problem_number
      || route.canonical_path !== expectedCanonicalPath
    ) {
      throw new Error(`Problem public route ${route.entity_id} drifts from its reviewed namespace or number`);
    }
    const expectedCurrentPath = `/p/${route.current_repository}/${route.current_problem}`;
    if (route.current_path !== expectedCurrentPath || !route.legacy_paths.includes(route.current_path)) {
      throw new Error(`Problem public route ${route.entity_id} has an invalid current Repository binding`);
    }
    if (entityIds.has(route.entity_id) || canonicalPaths.has(route.canonical_path)) {
      throw new Error(`Problem public route ${route.canonical_path} is duplicated`);
    }
    entityIds.add(route.entity_id);
    canonicalPaths.add(route.canonical_path);
    for (const legacyPath of route.legacy_paths) {
      if (legacyPaths.has(legacyPath)) throw new Error(`Problem legacy route ${legacyPath} is duplicated`);
      legacyPaths.add(legacyPath);
    }
  }
  return parsed;
}

export const problemPublicRoutes = parseProblemPublicRoutes(routesJson);
export const problemPublicRoutesRoot: HashRoot = sha256(canonicalJson(problemPublicRoutes));

export function problemPublicRouteForCanonicalPath(pathname: string): ProblemPublicRoute | null {
  return problemPublicRoutes.routes.find((route) => route.canonical_path === pathname) ?? null;
}
