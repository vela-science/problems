import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { scanPublicOutput } from "./check-public-output.mjs";

const temporary: string[] = [];

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

function fixture(entries: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "vela-web-public-output-"));
  temporary.push(root);
  const defaults = [
    "apps/www/out/index.html",
    "apps/observatory/.next/static/chunks/app.js",
    "apps/observatory/public/favicon.svg",
    "apps/observatory/.next/server/app/index.html",
    "apps/observatory/.next/server/app/p/math/321/index.rsc",
  ];
  for (const path of defaults) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, entries[path] ?? "public exact state");
  }
  return root;
}

describe("public output secret and privacy scan", () => {
  test("accepts delivered output without server or account material", () => {
    expect(scanPublicOutput(fixture({
      "apps/observatory/.next/server/app/p/math/321/index.rsc":
        "user_verification is absent; no hosted account identifier is published",
    }))).toMatchObject({
      ok: true,
      profiles: ["app", "www"],
    });
  });

  test("rejects a database URL in a delivered browser chunk", () => {
    const root = fixture({
      "apps/observatory/.next/static/chunks/app.js": "postgresql://activity:secret@ep-example.us-east-2.aws.neon.tech/vela_activity",
    });
    expect(() => scanPublicOutput(root)).toThrow("PostgreSQL connection string");
  });

  test("rejects private hosted-account data from the Vela application output", () => {
    const root = fixture({
      "apps/observatory/.next/server/app/p/math/321/index.rsc": "user_01ABCDEF234567 researcher@example.test",
    });
    expect(() => scanPublicOutput(root)).toThrow("hosted account identifier");
  });
});
