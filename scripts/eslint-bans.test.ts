import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/*
  The import bans moved out of scripts/read-only-boundary.mjs and
  scripts/check-problems-design-system.mjs and into ESLint, because the
  regexes they were written as could only see one spelling of an import. This
  holds the replacement to all four spellings, through the app's real config —
  the same `eslint` binary and the same eslint.config.mjs that `bun run lint`
  uses, not a reconstruction of the rules.

  A rule that cannot fail is worse than no rule: `clean` below is the control.
  If the config ever stops loading, every ban silently reports nothing, and the
  probe assertions are what notices.
*/

const repository = resolve(import.meta.dirname, "..");

function eslintFor(app: string) {
  const cwd = resolve(repository, "apps", app);
  const binary = [
    resolve(cwd, "node_modules/.bin/eslint"),
    resolve(repository, "node_modules/.bin/eslint"),
  ].find(existsSync);
  if (!binary) throw new Error("eslint is not installed; run bun install");
  return (source: string, file: string) => {
    const result = Bun.spawnSync([binary, "--stdin", "--stdin-filename", file, "-f", "json"], {
      cwd,
      stdin: Buffer.from(source),
    });
    const report = JSON.parse(result.stdout.toString());
    /* `no-restricted-imports` prefixes the specifier, `no-restricted-syntax`
       does not. Stripping it lets one expected string stand for a ban however
       the import was spelled, which is the whole point of the move. */
    return (report[0]?.messages ?? []).map(({ message }: { message: string }) =>
      message.replace(/^'.*?' import is restricted from being used by a pattern\. /u, ""),
    );
  };
}

const problems = eslintFor("problems");

/* One package per spelling, so a rule that only handles static imports cannot
   pass by reporting the same module four times. */
const probe = [
  'import "pg";',
  'export * from "postgres";',
  'import mongoose = require("mongoose");',
  "export async function reach() {",
  '  return [mongoose, await import("mysql2"), await import("@supabase/supabase-js")];',
  "}",
].join("\n");

const DATABASE = "applications reach Postgres only through their declared data package";
const SIGNING =
  "hosted applications may export an unsigned handoff but may not import signing or authority machinery";
const IDENTITY = "the maintained identity provider is confined to the declared account boundary";

/* Every assertion here is its own `eslint` process loading the app's real flat
   config, and that load is where the time goes: about 0.6s warm, three of them
   in the identity test. That sat under bun's 5s default until the first run of
   a cold checkout took 5482ms and failed — which is the condition every CI run
   starts in, on slower hardware. The budget bounds a hung linter and nothing
   else; a rule that stops working is caught by the assertion, not the clock. */
const LINT_BUDGET_MS = 60_000;

describe("import bans", () => {
  test.each([
    ["problems", problems, "src/lib/probe.ts"],
  ])(
    "%s reports a database reached by any of the four import spellings",
    (_name, lint, file) => {
      const messages = lint(probe, file);
      expect(messages.filter((message) => message === DATABASE)).toHaveLength(5);
    },
    LINT_BUDGET_MS,
  );

  test.each([
    ["problems", problems, "src/lib/probe.ts"],
  ])(
    "%s stays quiet on a file that imports nothing banned",
    (_name, lint, file) => {
      expect(lint('import { join } from "node:path";\nexport const p = join("a", "b");\n', file))
        .toEqual([]);
    },
    LINT_BUDGET_MS,
  );

  test(
    "request-scoped server state is banned statically and dynamically",
    () => {
      const messages = problems(
        'import "next/headers";\nexport const later = () => import("next/headers");\n',
        "src/lib/probe.ts",
      );
      expect(messages).toEqual([
        "request-scoped headers, cookies, and server helpers are not allowed",
        "request-scoped headers, cookies, and server helpers are not allowed",
      ]);
    },
    LINT_BUDGET_MS,
  );

  test(
    "the Problems's retired icon family and presentation components are banned",
    () => {
      const messages = problems(
        [
          "import {",
          "  Home01Icon,",
          "}",
          "  from",
          '  "lucide-react";',
          'import { SummaryCard } from "@/components/vela/summary-card";',
          "export const parts = [Home01Icon, SummaryCard];",
        ].join("\n"),
        "src/components/probe.tsx",
      );
      expect(messages).toEqual([
        "the retired Lucide icon family; the installed registry family is Hugeicons",
        "a retired presentation component",
      ]);
    },
    LINT_BUDGET_MS,
  );

  test(
    "the identity provider is allowed inside the account boundary and nowhere else",
    () => {
      const source =
        'import { WorkOS } from "@workos-inc/node";\nexport const client = new WorkOS();\n';
      expect(problems(source, "src/lib/auth.ts")).toEqual([]);
      expect(problems(source, "src/lib/other-provider.ts")).toEqual([IDENTITY]);
      /* The exemption is for one package, not for the block: the account
         boundary is still inside the read-only boundary. */
      expect(problems('import "pg";\n', "src/lib/auth.ts")).toEqual([DATABASE]);
    },
    LINT_BUDGET_MS,
  );

  test(
    "the unified app confines WorkOS to auth files and rejects hosted signing",
    () => {
      const workos = 'import { WorkOS } from "@workos-inc/node";\nexport const client = new WorkOS();\n';
      expect(problems(workos, "src/lib/auth.ts")).toEqual([]);
      expect(problems(workos, "src/lib/workbench.ts")).toEqual([IDENTITY]);
      expect(problems(
        'import { signSubmissionDraftLocally } from "@vela/activity-data/local-signing";\nexport { signSubmissionDraftLocally };\n',
        "src/lib/workbench.ts",
      )).toEqual([SIGNING]);
      expect(problems(
        'import { saveSubmissionDraft } from "@vela/activity-data";\nimport { problemDetail } from "@vela/projection-data";\nexport const allowed = [saveSubmissionDraft, problemDetail];\n',
        "src/lib/workbench.ts",
      )).toEqual([]);
    },
    LINT_BUDGET_MS,
  );
});
