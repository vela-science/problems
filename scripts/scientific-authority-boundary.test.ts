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
    "apps/problems/src",
    "packages/activity-data/src",
    "packages/projection-data/src",
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
  test("allows exact State reads and the declared activity action", () => {
    const root = fixture({
      "apps/problems/src/app/api/search/route.ts": "export async function GET() { return Response.json([]); }\n",
      "apps/problems/src/app/.well-known/vela-site.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/problems/src/app/actions/activity.ts": "'use server';\nimport { createAttempt } from '@vela/activity-data';\nexport async function save() { return createAttempt(); }\n",
      "apps/problems/src/app/api/telemetry/route.ts": "import { recordPilotTelemetry } from '@vela/activity-data';\nexport async function POST() { return Response.json(await recordPilotTelemetry(), { status: 202 }); }\n",
      "apps/problems/src/app/workspaces/page.tsx": "import { listWorkspaces } from '@vela/activity-data';\nexport default async function Page() { return listWorkspaces('account'); }\n",
      "apps/problems/src/components/vela/account-state.tsx": "export const account = fetch(\"/api/account\", { cache: \"no-store\", credentials: \"same-origin\" });\n",
      "packages/activity-data/src/contracts.ts": "import { canonicalJson } from '@vela/projection-data/canonical';\nexport const root = canonicalJson({});\n",
    });
    expect(inspectScientificAuthorityBoundary(root)).toEqual([]);
  });

  test("keeps Vela scientific routes exact and confines mutation", () => {
    const root = fixture({
      "apps/problems/src/app/api/state/route.ts": "export const POST = async () => new Response();\n",
      "apps/problems/src/app/action.ts": "'use server';\nexport async function mutate() {}\n",
      "apps/problems/src/lib/request.ts": "export const value = cookies();\n",
      "apps/problems/src/lib/env.ts": "export const secret = process.env.SECRET;\n",
      "apps/problems/src/lib/remote.ts": "export const state = fetch('/api/unrooted');\n",
    });
    expect(new Set(inspectScientificAuthorityBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "app_route_handler",
      "app_mutation",
      "problems_server_action",
      "app_request_state",
      "app_runtime_environment",
      "app_request_fetch",
    ]));
  });

  test("confines Work mutations and remote fetches to the declared boundary", () => {
    const root = fixture({
      "apps/problems/src/app/actions/other.ts": "'use server';\nexport async function save() {}\n",
      "apps/problems/src/app/api/attempts/route.ts": "export async function POST() { return new Response(); }\n",
      "apps/problems/src/lib/remote.ts": "export const result = fetch('https://worker.invalid/run');\n",
    });
    expect(new Set(inspectScientificAuthorityBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "problems_server_action",
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
      "apps/problems/src/lib/activity.ts": "export * from '@vela/activity-data/contracts';\n",
      "apps/problems/src/lib/sign.ts": "import('@vela/activity-data/local-signing');\n",
      "packages/activity-data/src/projection.ts": "import { canonicalJson } from '@vela/projection-data/canonical';\nimport { load } from '@vela/projection-data';\nexport { canonicalJson, load };\n",
      "packages/projection-data/src/activity.ts": "import('@vela/activity-data');\n",
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
      "packages/activity-data/schema/workspace-crdt.sql": [
        "CREATE TABLE activity.workspace_crdt_updates (",
        "  update_bytes bytea NOT NULL CHECK (octet_length(update_bytes) BETWEEN 1 AND 262144)",
        ");",
      ].join("\n"),
    });
    expect(inspectScientificAuthorityBoundary(root)).toEqual([]);
  });
});
