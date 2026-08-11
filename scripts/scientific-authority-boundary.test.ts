import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { inspectScientificAuthorityBoundary } from "./scientific-authority-boundary.mjs";

const roots: string[] = [];

function fixture(files: Record<string, string>) {
  const root = mkdtempSync(resolve(tmpdir(), "vela-web-authority-boundary-"));
  roots.push(root);
  for (const directory of [
    "apps/www/src",
    "apps/observatory/src",
    "apps/problems/src",
    "packages/activity-data/src",
    "packages/observatory-data/src",
  ]) {
    mkdirSync(resolve(root, directory), { recursive: true });
  }
  for (const [path, content] of Object.entries(files)) {
    const target = resolve(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("scientific-authority profiles", () => {
  test("allows static www, exact Observatory reads, and activity-owned Problems mutations", () => {
    const root = fixture({
      "apps/www/src/app/page.tsx": "export default function Page() { return null; }\n",
      "apps/observatory/src/app/api/search/route.ts": "export async function GET() { return Response.json([]); }\n",
      "apps/observatory/src/app/.well-known/vela-site.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/observatory/src/app/repositories/erdos/dossiers/one.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/problems/src/app/api/attempts/route.ts": "import { createAttempt } from '@vela/activity-data';\nexport async function POST() { return Response.json(await createAttempt()); }\n",
      "apps/problems/src/components/save.tsx": "export function save() { return fetch('/api/attempts', { method: 'POST' }); }\n",
      "packages/activity-data/src/contracts.ts": "import { canonicalJson } from '@vela/observatory-data/canonical';\nexport const root = canonicalJson({});\n",
    });
    expect(inspectScientificAuthorityBoundary(root)).toEqual([]);
  });

  test("keeps www static", () => {
    const root = fixture({
      "apps/www/src/app/api/write/route.ts": "export async function POST() { return new Response(); }\n",
      "apps/www/src/app/action.ts": "'use server';\nexport async function mutate() {}\n",
      "apps/www/src/lib/request.ts": "export const value = headers();\n",
      "apps/www/src/lib/env.ts": "export const secret = process.env.SECRET;\n",
      "apps/www/src/lib/remote.ts": "export const state = fetch('/api/state');\n",
    });
    expect(new Set(inspectScientificAuthorityBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "static_route_handler",
      "static_server_action",
      "static_request_state",
      "static_runtime_environment",
      "static_request_fetch",
    ]));
  });

  test("keeps Observatory scientific routes exact and read-only", () => {
    const root = fixture({
      "apps/observatory/src/app/api/state/route.ts": "export const POST = async () => new Response();\n",
      "apps/observatory/src/app/action.ts": "'use server';\nexport async function mutate() {}\n",
      "apps/observatory/src/lib/request.ts": "export const value = cookies();\n",
      "apps/observatory/src/lib/env.ts": "export const secret = process.env.SECRET;\n",
      "apps/observatory/src/lib/remote.ts": "export const state = fetch('/api/unrooted');\n",
    });
    expect(new Set(inspectScientificAuthorityBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "observatory_route_handler",
      "observatory_mutation",
      "observatory_server_action",
      "observatory_request_state",
      "observatory_runtime_environment",
      "observatory_request_fetch",
    ]));
  });

  test("requires Problems mutations to cross activity-data", () => {
    const root = fixture({
      "apps/problems/src/app/api/attempts/route.ts": "export async function POST() { return new Response(); }\n",
      "apps/problems/src/app/action.ts": "'use server';\nexport async function save() {}\n",
      "apps/problems/src/lib/remote.ts": "export const result = fetch('https://worker.invalid/run');\n",
    });
    expect(inspectScientificAuthorityBoundary(root)).toEqual([
      expect.objectContaining({ file: "apps/problems/src/app/action.ts", rule: "problems_mutation_owner" }),
      expect.objectContaining({ file: "apps/problems/src/app/api/attempts/route.ts", rule: "problems_mutation_owner" }),
      expect.objectContaining({ file: "apps/problems/src/lib/remote.ts", rule: "problems_external_fetch" }),
    ]);
  });

  test("rejects hosted signing and scientific-state emission", () => {
    const root = fixture({
      "apps/problems/src/lib/decision.ts": "export const emitDecision = () => ({ schema: 'vela.event.v1' });\n",
      "packages/activity-data/src/signer.ts": "import { createPrivateKey, sign } from 'node:crypto';\nexport const signStanding = () => sign(null, new Uint8Array(), createPrivateKey('x'));\n",
      "packages/activity-data/src/env.ts": "export const key = process.env.VELA_AUTHORITY_PRIVATE_KEY;\n",
    });
    const rules = inspectScientificAuthorityBoundary(root).map(({ rule }) => rule);
    expect(rules).toContain("scientific_object_emission");
    expect(rules).toContain("scientific_authority_symbol");
    expect(rules).toContain("server_signing");
    expect(rules).toContain("authority_secret");
  });

  test("keeps the mutable and scientific data packages acyclic", () => {
    const root = fixture({
      "apps/www/src/lib/activity.ts": "import '@vela/activity-data';\n",
      "apps/observatory/src/lib/activity.ts": "export * from '@vela/activity-data/contracts';\n",
      "apps/problems/src/lib/sign.ts": "import('@vela/activity-data/local-signing');\n",
      "packages/activity-data/src/projection.ts": "import { canonicalJson } from '@vela/observatory-data/canonical';\nimport { load } from '@vela/observatory-data';\nexport { canonicalJson, load };\n",
      "packages/observatory-data/src/activity.ts": "import('@vela/activity-data');\n",
    });
    expect(new Set(inspectScientificAuthorityBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "activity_plane_dependency",
      "hosted_signing_dependency",
      "data_plane_dependency",
      "data_plane_cycle",
    ]));
  });

  test("rejects authority relations, key material, and artifact bytes in activity SQL", () => {
    const root = fixture({
      "packages/activity-data/schema.sql": [
        "CREATE TABLE activity.decisions (decision_id uuid PRIMARY KEY);",
        "CREATE TABLE activity.artifacts (authority_private_key text, artifact_bytes bytea);",
        "CREATE FUNCTION activity_api.issue_standing() RETURNS text LANGUAGE sql AS $$ SELECT 'vela.event.v1' $$;",
      ].join("\n"),
    });
    expect(new Set(inspectScientificAuthorityBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "scientific_state_relation",
      "scientific_state_function",
      "scientific_object_emission",
      "authority_key_storage",
      "artifact_byte_storage",
    ]));
  });
});
