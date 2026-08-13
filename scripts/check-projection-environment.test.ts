import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { checkProjectionEnvironment, projectionDatabase } from "./check-projection-environment.mjs";

const readerPassword = "a".repeat(64);
const validEnvironment = {
  VELA_PROJECTION_WRITER_DATABASE_URL:
    "postgresql://neondb_owner:writer@writer.example/vela_observatory?sslmode=require",
  VELA_PROJECTION_DATABASE_URL:
    `postgresql://observatory_projection_reader_20260813:${readerPassword}@reader.example/vela_observatory?sslmode=require`,
};

describe("projection credential binding", () => {
  test("pins the database, versioned login, and stable permission role", () => {
    expect(projectionDatabase).toEqual({
      name: "vela_observatory",
      writerRole: "neondb_owner",
      readerRole: "observatory_projection_reader_20260813",
      readerPermissionRole: "observatory_projection_reader",
    });
  });

  test("accepts one writer URL and one self-contained reader URL", () => {
    expect(checkProjectionEnvironment(validEnvironment)).toEqual({
      ok: true,
      schema: "vela.projection-environment-check.v1",
    });
  });

  test("rejects malformed reader custody material", () => {
    expect(() => checkProjectionEnvironment({
      ...validEnvironment,
      VELA_PROJECTION_DATABASE_URL:
        "postgresql://observatory_projection_reader_20260813:not-a-secret@reader.example/vela_observatory?sslmode=require",
    })).toThrow("reader password must be a 32-byte lowercase hex secret");
  });

  test("does not accept a generic database fallback", () => {
    const { VELA_PROJECTION_DATABASE_URL: _reader, ...withoutReader } = validEnvironment;
    expect(() => checkProjectionEnvironment({
      ...withoutReader,
      DATABASE_URL:
        `postgresql://observatory_projection_reader_20260813:${readerPassword}@reader.example/vela_observatory?sslmode=require`,
    })).toThrow("missing required projection secret VELA_PROJECTION_DATABASE_URL");
  });

  test("does not accept the reader credential as the writer", () => {
    expect(() => checkProjectionEnvironment({
      ...validEnvironment,
      VELA_PROJECTION_WRITER_DATABASE_URL: validEnvironment.VELA_PROJECTION_DATABASE_URL,
    })).toThrow("projection writer credential has the wrong role");
  });

  test("does not accept the writer credential as the reader", () => {
    expect(() => checkProjectionEnvironment({
      ...validEnvironment,
      VELA_PROJECTION_DATABASE_URL: validEnvironment.VELA_PROJECTION_WRITER_DATABASE_URL,
    })).toThrow("projection reader credential has the wrong role");
  });

  test("does not accept the stable permission role as a runtime login", () => {
    expect(() => checkProjectionEnvironment({
      ...validEnvironment,
      VELA_PROJECTION_DATABASE_URL:
        `postgresql://observatory_projection_reader:${readerPassword}@reader.example/vela_observatory?sslmode=require`,
    })).toThrow("projection reader credential has the wrong role");
  });
});

/*
  One Neon project, spelled in three files that do not import each other.

  The check above decides whether a secret is accepted. `deployment.ts` puts the
  project id, the database and the reader role into the manifest at
  /.well-known/vela-site.json, which is the public declaration of where these
  pages are read from. `packages/observatory-data/package.json` writes the project
  id, the database and the WRITER role into two `neonctl` invocations — twice,
  because `db:migrate:local` and `db:sql` each build their own connection
  string.

  Consolidating those two into the manifest's declaration is the right end
  state and belongs in packages/observatory-data. Until then this is what the
  duplication actually costs, removed: renaming the database or moving the
  project reddens here rather than in whichever operator script is run next.
*/
const repository = resolve(import.meta.dirname, "..");
const deploymentSource = readFileSync(
  resolve(repository, "packages/observatory-data/src/deployment.ts"),
  "utf8",
);
const repositoryDataScripts: Record<string, string> = JSON.parse(
  readFileSync(resolve(repository, "packages/observatory-data/package.json"), "utf8"),
).scripts;

/** The `data_source` object literal the Observatory manifest publishes. */
function publishedDataSource() {
  const block = /data_source:\s*\{([\s\S]*?)\n\s*\},/u.exec(deploymentSource);
  expect(block, "deployment.ts no longer publishes a data_source literal").not.toBeNull();
  return Object.fromEntries(
    [...block![1].matchAll(/(\w+):\s*"([^"]+)"/gu)].map(([, key, value]) => [key, value]),
  );
}

/** Every `neonctl connection-string` invocation, as its parsed flags. */
function neonctlInvocations() {
  return Object.entries(repositoryDataScripts)
    .filter(([, command]) => command.includes("neonctl connection-string"))
    .map(([name, command]) => [
      name,
      Object.fromEntries(
        /* The flag values sit inside a `$( … )` substitution inside a JSON
           string, so the terminators are the shell's and JSON's, not just
           whitespace. */
        [...command.matchAll(/--([a-z-]+) ([^\s"\\)]+)/gu)].map(([, flag, value]) => [flag, value]),
      ),
    ] as const);
}

describe("one Neon project, declared once", () => {
  test("the published manifest names the database and reader role this check enforces", () => {
    const source = publishedDataSource();
    expect(source.provider).toBe("neon");
    expect(source.database).toBe(projectionDatabase.name);
    expect(source.role).toBe(projectionDatabase.readerRole);
    expect(source.access).toBe("read_only");
    expect(source.project_id).toMatch(/^[a-z-]+-\d+$/u);
  });

  test("every operator connection string targets that same project, database and writer", () => {
    const invocations = neonctlInvocations();
    expect(invocations.length, "no neonctl invocation left to check").toBeGreaterThan(0);
    for (const [name, flags] of invocations) {
      expect(flags["project-id"], `${name} names a different Neon project`)
        .toBe(publishedDataSource().project_id);
      expect(flags["database-name"], `${name} names a different database`)
        .toBe(projectionDatabase.name);
      expect(flags["role-name"], `${name} connects as a role this check would reject`)
        .toBe(projectionDatabase.writerRole);
    }
  });
});
