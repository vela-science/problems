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
  test("allows static www, exact State reads, and the declared activity action", () => {
    const root = fixture({
      "apps/www/src/app/page.tsx": "export default function Page() { return null; }\n",
      "apps/observatory/src/app/api/search/route.ts": "export async function GET() { return Response.json([]); }\n",
      "apps/observatory/src/app/.well-known/vela-site.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/observatory/src/app/repositories/erdos/dossiers/one.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/observatory/src/app/actions/activity.ts": "'use server';\nimport { createAttempt } from '@vela/activity-data';\nexport async function save() { return createAttempt(); }\n",
      "apps/observatory/src/lib/target-bound-approach.ts": "import 'server-only';\nexport const enabled = process.env.VELA_TARGET_BOUND_APPROACH_ENABLED === 'true';\n",
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

  test("keeps Vela scientific routes exact and confines mutation", () => {
    const root = fixture({
      "apps/observatory/src/app/api/state/route.ts": "export const POST = async () => new Response();\n",
      "apps/observatory/src/app/action.ts": "'use server';\nexport async function mutate() {}\n",
      "apps/observatory/src/lib/request.ts": "export const value = cookies();\n",
      "apps/observatory/src/lib/env.ts": "export const secret = process.env.SECRET;\n",
      "apps/observatory/src/lib/remote.ts": "export const state = fetch('/api/unrooted');\n",
    });
    expect(new Set(inspectScientificAuthorityBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "app_route_handler",
      "app_mutation",
      "observatory_server_action",
      "app_request_state",
      "app_runtime_environment",
      "app_request_fetch",
    ]));
  });

  test("confines Work mutations and remote fetches to the declared boundary", () => {
    const root = fixture({
      "apps/observatory/src/app/actions/other.ts": "'use server';\nexport async function save() {}\n",
      "apps/observatory/src/app/api/attempts/route.ts": "export async function POST() { return new Response(); }\n",
      "apps/observatory/src/lib/remote.ts": "export const result = fetch('https://worker.invalid/run');\n",
    });
    expect(new Set(inspectScientificAuthorityBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "observatory_server_action",
      "app_route_handler",
      "app_mutation",
      "app_request_fetch",
    ]));
  });

  test("rejects hosted signing and scientific-state emission", () => {
    const root = fixture({
      "packages/activity-data/src/signer.ts": "import { createPrivateKey, sign } from 'node:crypto';\nexport const event = { schema: 'vela.event.v1' };\nexport const issueVerification = () => null;\nexport const signStanding = () => sign(null, new Uint8Array(), createPrivateKey('x'));\n",
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
      "apps/observatory/src/lib/sign.ts": "import('@vela/activity-data/local-signing');\n",
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

  test("allows only the exact bounded Workspace CRDT byte store", () => {
    const root = fixture({
      "packages/activity-data/migrations/20260813_workspace_crdt.sql": [
        "CREATE TABLE activity.workspace_crdt_updates (",
        "  update_bytes bytea NOT NULL CHECK (octet_length(update_bytes) BETWEEN 1 AND 262144)",
        ");",
      ].join("\n"),
    });
    expect(inspectScientificAuthorityBoundary(root)).toEqual([]);
  });
});
