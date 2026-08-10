import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { inspectReadOnlyBoundary } from "./read-only-boundary.mjs";

const roots: string[] = [];

function fixture(files: Record<string, string>) {
  const root = mkdtempSync(resolve(tmpdir(), "vela-web-boundary-"));
  roots.push(root);
  mkdirSync(resolve(root, "apps/observatory/src"), { recursive: true });
  mkdirSync(resolve(root, "apps/www/src"), { recursive: true });
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

describe("Observatory read-only boundary", () => {
  test("allows the live manifest and exact-root read-only data endpoints", () => {
    const root = fixture({
      "apps/observatory/src/app/page.tsx": "export default function Page() { return null; }\n",
      "apps/observatory/src/app/api/search/route.ts": "import { NextResponse } from 'next/server';\nexport async function GET() { return NextResponse.json([]); }\n",
      "apps/observatory/src/app/api/graph/route.ts": "import { NextResponse } from 'next/server';\nexport async function GET() { return NextResponse.json([]); }\n",
      "apps/observatory/src/app/sources.json/route.ts": "import { NextResponse } from 'next/server';\nexport async function GET() { return NextResponse.json([]); }\n",
      "apps/observatory/src/app/.well-known/vela-site.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/observatory/src/app/repositories/erdos/dossiers/erdos-203.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/observatory/src/app/repositories/erdos/dossiers/erdos-264.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/observatory/src/app/repositories/erdos/dossiers/erdos-730.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/observatory/src/app/repositories/formal-conjectures/dossiers/erdos-521.json/route.ts": "export async function GET() { return Response.json({ authority: 'read_only_projection' }); }\n",
      "apps/observatory/src/app/api/account/route.ts": "export async function GET() { return Response.json({ status: 'signed_out' }); }\n",
      "apps/observatory/src/app/auth/callback/route.ts": "import { handleAuth } from '@workos-inc/authkit-nextjs';\nexport async function GET(request) { return handleAuth()(request); }\n",
      "apps/observatory/src/app/sign-in/route.ts": "import { getSignInUrl } from '@workos-inc/authkit-nextjs';\nexport async function GET() { return Response.redirect(await getSignInUrl()); }\n",
      "apps/observatory/src/app/actions/auth.ts": "'use server';\nimport { signOut } from '@workos-inc/authkit-nextjs';\nexport async function signOutAccount() { const returnTo = 'https://app.vela.space/problems'; await signOut({ returnTo }); }\n",
      "apps/observatory/src/lib/auth.ts": "import { WorkOS } from '@workos-inc/node';\nexport const configured = Boolean(process.env.WORKOS_API_KEY);\n",
      "apps/observatory/src/proxy.ts": "import { authkitProxy } from '@workos-inc/authkit-nextjs';\nexport default authkitProxy();\n",
      "apps/observatory/src/components/vela/account-menu.tsx": "export function loadAccount() { return fetch(\"/api/account\", { cache: \"no-store\", credentials: \"same-origin\" }); }\n",
      "apps/observatory/src/lib/search-index.ts": "export function load(projectionRoot) { const params = new URLSearchParams({ root: projectionRoot }); const href = `/api/search?${params}`; return fetch(href, { cache: 'force-cache' }); }\n",
      "apps/observatory/src/lib/graph-client.ts": "export function loadGraph(input) { const params = new URLSearchParams({ root: input.root }); return fetch(`/api/graph?${params}`, { cache: 'force-cache' }); }\n",
    });
    expect(inspectReadOnlyBoundary(root)).toEqual([]);
  });

  test("keeps the product identity exception narrow", () => {
    const root = fixture({
      "apps/observatory/src/app/api/account/route.ts": "export async function POST() { return new Response(); }\n",
      "apps/observatory/src/app/actions/auth.ts": "'use server';\nexport async function signOutAccount() {}\n",
      "apps/observatory/src/components/vela/account-menu.tsx": "export function loadAccount() { return fetch('https://example.com/account'); }\n",
    });
    expect(new Set(inspectReadOnlyBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "mutation_handler",
      "request_time_fetch",
      "server_action",
    ]));
  });

  /* The allow-list is by name, not by membership.
   *
   * The check used to ask whether the file *contained* the sign-out action's
   * signature and body. A second exported action sitting beside an intact
   * sign-out action left both substrings present, so the file passed while
   * doing the thing the rule exists to forbid. The fixture below is exactly
   * that file: the real action, unmodified, plus one more. */
  test("rejects a second Server Action beside an intact sign-out action", () => {
    const signOut = "'use server';\nimport { signOut } from '@workos-inc/authkit-nextjs';\nexport async function signOutAccount() { const returnTo = 'https://app.vela.space/problems'; await signOut({ returnTo }); }\n";
    expect(inspectReadOnlyBoundary(fixture({
      "apps/observatory/src/app/actions/auth.ts": signOut,
    }))).toEqual([]);
    expect(inspectReadOnlyBoundary(fixture({
      "apps/observatory/src/app/actions/auth.ts": `${signOut}export async function saveClaimStanding(standing) { return standing; }\n`,
    })).map(({ rule }) => rule)).toEqual(["server_action"]);
    /* And an exported binding is an action whatever it is spelled as. */
    expect(inspectReadOnlyBoundary(fixture({
      "apps/observatory/src/app/actions/auth.ts": `${signOut}export const saveClaimStanding = async (standing) => standing;\n`,
    })).map(({ rule }) => rule)).toEqual(["server_action"]);
  });

  /* Which packages a file may import is no longer decided here — see
     eslint.bans.mjs and scripts/eslint-bans.test.ts, which hold the same
     boundary across all four spellings of an import rather than the one a
     regex could see. The fixture below keeps only what this file still owns,
     so `request.ts` is present for the request-scoped *call* and not for the
     import above it. */
  test("rejects mutation, secret, and external-fetch surfaces", () => {
    const root = fixture({
      "apps/observatory/src/app/api/state/route.ts": "export async function POST() { return new Response(); }\n",
      "apps/observatory/src/app/action.ts": "'use server';\nexport async function mutate() {}\n",
      "apps/observatory/src/lib/env.ts": "export const secret = process.env.SECRET;\n",
      "apps/observatory/src/lib/remote.ts": "export const state = fetch('https://example.com/state');\n",
      "apps/observatory/src/lib/request.ts": "export const state = cookies();\n",
    });
    expect(new Set(inspectReadOnlyBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "request_state",
      "request_time_fetch",
      "route_handler",
      "mutation_handler",
      "runtime_environment",
      "server_action",
    ]));
  });

  test("rejects substitution of the allowed search fetch", () => {
    const root = fixture({
      "apps/observatory/src/lib/search-index.ts": "export const index = fetch('https://example.com/index.json');\n",
    });
    expect(inspectReadOnlyBoundary(root)).toEqual([
      expect.objectContaining({ rule: "request_time_fetch" }),
    ]);
  });

  test("allows a renamed local root binding but not an unrooted search request", () => {
    const allowed = fixture({
      "apps/observatory/src/lib/search-index.ts": "export function load(projectionRoot) { const params = new URLSearchParams({ root: projectionRoot }); const href = `/api/search?${params}`; return fetch(href, { cache: 'force-cache' }); }\n",
    });
    const unrooted = fixture({
      "apps/observatory/src/lib/search-index.ts": "export function load() { return fetch('/api/search', { cache: 'no-store' }); }\n",
    });
    expect(inspectReadOnlyBoundary(allowed)).toEqual([]);
    expect(inspectReadOnlyBoundary(unrooted)).toEqual([expect.objectContaining({ rule: "request_time_fetch" })]);
  });
});
