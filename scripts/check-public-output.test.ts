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
    "apps/problems/.next/static/chunks/app.js",
    "apps/problems/public/favicon.svg",
    "apps/problems/.next/server/app/index.html",
    "apps/problems/.next/server/app/p/math/321/index.rsc",
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
      "apps/problems/.next/server/app/p/math/321/index.rsc":
        "user_verification is absent; no hosted account identifier is published",
    }))).toMatchObject({
      ok: true,
      profiles: ["app", "www"],
    });
  });

  test("rejects a database URL in a delivered browser chunk", () => {
    const root = fixture({
      "apps/problems/.next/static/chunks/app.js": "postgresql://activity:secret@ep-example.us-east-2.aws.neon.tech/vela_activity",
    });
    expect(() => scanPublicOutput(root)).toThrow("PostgreSQL connection string");
  });

  test("rejects private hosted-account data from the Vela application output", () => {
    const root = fixture({
      "apps/problems/.next/server/app/p/math/321/index.rsc": "user_01ABCDEF234567 researcher@example.test",
    });
    expect(() => scanPublicOutput(root)).toThrow("hosted account identifier");
  });

  test("rejects private registry or component-lab metadata from every delivered profile", () => {
    const server = fixture({
      "apps/problems/.next/server/app/index.html": "vela.ui-component-lab.v1",
    });
    expect(() => scanPublicOutput(server)).toThrow("private UI registry or component-lab metadata");

    const www = fixture({
      "apps/www/out/index.html": "private-source-only",
    });
    expect(() => scanPublicOutput(www)).toThrow("private UI registry or component-lab metadata");
  });
});
