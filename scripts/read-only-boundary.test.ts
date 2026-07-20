import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { inspectReadOnlyBoundary } from "./read-only-boundary.mjs";

const roots: string[] = [];

function fixture(files: Record<string, string>) {
  const root = mkdtempSync(resolve(tmpdir(), "vela-web-boundary-"));
  roots.push(root);
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
  test("allows the single rooted same-origin search artifact", () => {
    const root = fixture({
      "apps/observatory/src/app/page.tsx": "export default function Page() { return null; }\n",
      "apps/observatory/src/lib/search-index.ts": "export const index = fetch('/data/site-search-index.v1.json', { cache: 'force-cache' });\n",
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
});
