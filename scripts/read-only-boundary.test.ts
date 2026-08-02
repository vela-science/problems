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
      "apps/observatory/src/lib/search-index.ts": "export function load(projectionRoot) { const params = new URLSearchParams({ root: projectionRoot }); const href = `/api/search?${params}`; return fetch(href, { cache: 'force-cache' }); }\n",
      "apps/observatory/src/lib/graph-client.ts": "export function loadGraph(input) { const params = new URLSearchParams({ root: input.root }); return fetch(`/api/graph?${params}`, { cache: 'force-cache' }); }\n",
    });
    expect(inspectReadOnlyBoundary(root)).toEqual([]);
  });

  test("rejects mutation, authority, secret, and external-fetch surfaces", () => {
    const root = fixture({
      "apps/observatory/src/app/api/state/route.ts": "export async function POST() { return new Response(); }\n",
      "apps/observatory/src/app/action.ts": "'use server';\nexport async function mutate() {}\n",
      "apps/observatory/src/lib/auth.ts": "import Auth from 'next-auth';\nexport default Auth;\n",
      "apps/observatory/src/lib/env.ts": "export const secret = process.env.SECRET;\n",
      "apps/observatory/src/lib/remote.ts": "export const state = fetch('https://example.com/state');\n",
      "apps/observatory/src/lib/request.ts": "import { cookies } from 'next/headers';\nexport const state = cookies();\n",
    });
    expect(new Set(inspectReadOnlyBoundary(root).map(({ rule }) => rule))).toEqual(new Set([
      "authority_dependency",
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
