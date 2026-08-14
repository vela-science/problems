import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { SQL } from "bun";
import {
  activateCandidate,
  classifyReleaseSelectionRefusal,
  confirmCurrentRelease,
  projectionReleaseAdvisoryLock,
  projectionReleaseIdleTransactionTimeout,
  projectionReleaseLockTimeout,
  projectionReleaseStatementTimeout,
  publicTableOrder,
  releaseSelectionRefusalKinds,
  selectStoredRelease,
} from "../scripts/projection-store.mjs";
import { sqlStatements } from "../scripts/sql-statements.mjs";
import { canonicalJson, sha256 } from "../src/canonical";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;
const emptyRoot = sha256(canonicalJson([]));
const firstLive = {
  a: "2026-08-10T08:00:00.000Z",
  b: "2026-08-10T09:00:00.000Z",
  c: "2026-08-10T10:00:00.000Z",
  d: "2026-08-10T11:00:00.000Z",
  e: "2026-08-10T12:00:00.000Z",
};

let directory = "";
let data = "";
let log = "";
let pgBin = "";
let port = 0;
let databaseUrl = "";
let sql: SQL;

function command(name: string, args: string[], quiet = true) {
  return execFileSync(name, args, {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
    stdio: quiet ? ["ignore", "ignore", "pipe"] : ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
}

function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("failed to allocate PostgreSQL port"));
        return;
      }
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

function manifest(releaseRoot: string, activationTime: string, tableRoot = emptyRoot) {
  return {
    schema: "vela.projection-release-manifest",
    release_root: releaseRoot,
    generated_at: "2026-08-10T00:00:00.000Z",
    activation_time: activationTime,
    table_roots: Object.fromEntries(publicTableOrder.map((table) => [table, tableRoot])),
    source_repositories: [],
  };
}

async function seedRelease(
  releaseRoot: string,
  activationTime: string,
  activatedAt: string | null = null,
  tableRoot = emptyRoot,
) {
  const record = manifest(releaseRoot, activationTime, tableRoot);
  await sql`INSERT INTO projection.releases (
      release_root, manifest, generated_at, activated_at
    ) VALUES (
      ${releaseRoot}, ${JSON.stringify(record)}::jsonb,
      ${record.generated_at}::timestamptz, ${activatedAt}::timestamptz
    )`;
  return record;
}

async function seedCurrent(releaseRoot: string, activatedAt: string, confirmedAt: string) {
  await sql`INSERT INTO projection.current_release (
      singleton, release_root, activated_at, confirmed_at
    ) VALUES (true, ${releaseRoot}, ${activatedAt}::timestamptz, ${confirmedAt}::timestamptz)`;
}

function instant(value: unknown): string | null {
  return value === null || value === undefined ? null : new Date(value as string).toISOString();
}

async function snapshot() {
  const pointer = await sql`SELECT release_root, activated_at, confirmed_at
    FROM projection.current_release WHERE singleton`;
  const releases = await sql`SELECT release_root, activated_at
    FROM projection.releases ORDER BY release_root`;
  return {
    pointer: pointer.map((row) => ({
      release_root: row.release_root,
      activated_at: instant(row.activated_at),
      confirmed_at: instant(row.confirmed_at),
    })),
    releases: releases.map((row) => ({
      release_root: row.release_root,
      activated_at: instant(row.activated_at),
    })),
  };
}

async function retainedRoots() {
  const rows = await sql`WITH retained AS (
      SELECT release.release_root
      FROM projection.releases release
      JOIN projection.releases current_entry
        ON current_entry.release_root = (
          SELECT release_root FROM projection.current_release WHERE singleton
        )
      WHERE release.activated_at IS NOT NULL
        AND release.activated_at <= current_entry.activated_at
      ORDER BY (release.release_root = current_entry.release_root) DESC,
        release.activated_at DESC, release.release_root DESC
      LIMIT 3
    ) SELECT release_root FROM retained`;
  return rows.map(({ release_root }) => release_root as string);
}

async function client() {
  return new SQL(databaseUrl, {
    max: 1,
    connectionTimeout: 5,
    idleTimeout: 5,
    prepare: false,
  });
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "vela-release-selection-"));
  data = join(directory, "postgres");
  log = join(directory, "postgres.log");
  pgBin = process.env.PG_BIN_DIR ?? command("pg_config", ["--bindir"], false).trim();
  port = await availablePort();
  command(join(pgBin, "initdb"), [
    "--pgdata", data,
    "--username", "postgres",
    "--auth", "trust",
    "--no-locale",
    "--no-instructions",
  ]);
  command(join(pgBin, "pg_ctl"), [
    "--pgdata", data,
    "--log", log,
    "--options",
    `-h 127.0.0.1 -p ${port} -k ${directory} -c statement_timeout=120s -c lock_timeout=5s`,
    "--wait",
    "start",
  ]);
  databaseUrl = `postgres://postgres@127.0.0.1:${port}/postgres?sslmode=disable`;
  sql = await client();
  await sql.unsafe("CREATE ROLE vela_projection_reader NOLOGIN");
  const schema = await readFile(resolve(import.meta.dir, "../schema.sql"), "utf8");
  for (const statement of sqlStatements(schema)) await sql.unsafe(statement);
}, 60_000);

beforeEach(async () => {
  await sql.unsafe("DROP TRIGGER IF EXISTS c2_forced_failure ON projection.current_release");
  await sql.unsafe("DROP TRIGGER IF EXISTS c2_forced_failure ON projection.releases");
  await sql.unsafe("DROP FUNCTION IF EXISTS projection.c2_forced_failure() CASCADE");
  await sql.unsafe("TRUNCATE projection.releases CASCADE");
});

afterAll(async () => {
  if (sql) await sql.close({ timeout: 5 });
  if (data) {
    try {
      command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"]);
    } catch {}
  }
  if (directory) await rm(directory, { recursive: true, force: true });
}, 30_000);

describe("projection release pointer transactions", () => {
  test("shares one stable bounded advisory-lock contract", () => {
    expect(projectionReleaseAdvisoryLock).toBe("852837500357312960");
    expect(projectionReleaseLockTimeout).toBe("5s");
    expect(projectionReleaseStatementTimeout).toBe("120s");
    expect(projectionReleaseIdleTransactionTimeout).toBe("120s");
  });

  test("the owned idle transaction deadline is accepted transaction-locally", async () => {
    const observed = await sql.begin(async (tx) => {
      await tx.unsafe(
        `SET LOCAL idle_in_transaction_session_timeout = '${projectionReleaseIdleTransactionTimeout}'`,
      );
      const rows = await tx.unsafe("SHOW idle_in_transaction_session_timeout");
      return rows[0].idle_in_transaction_session_timeout;
    });
    expect(observed).toBe("2min");
  });

  test("stale activation changes neither pointer nor target first-live time", async () => {
    const current = await seedRelease(root("a"), firstLive.a, firstLive.a);
    const target = await seedRelease(root("d"), firstLive.d);
    await seedCurrent(current.release_root, firstLive.a, firstLive.b);
    const before = await snapshot();

    await expect(activateCandidate(sql, target, { expectedCurrentRoot: root("b") }))
      .rejects.toThrow("lost expected-current CAS");
    expect(await snapshot()).toEqual(before);
  });

  test("concurrent bootstrap activates exactly one target", async () => {
    const left = await seedRelease(root("d"), firstLive.d);
    const right = await seedRelease(root("e"), firstLive.e);
    const leftClient = await client();
    const rightClient = await client();
    try {
      const outcomes = await Promise.allSettled([
        activateCandidate(leftClient, left, { expectedCurrentRoot: null }),
        activateCandidate(rightClient, right, { expectedCurrentRoot: null }),
      ]);
      expect(outcomes.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
      expect(outcomes.filter(({ status }) => status === "rejected")).toHaveLength(1);
      const after = await snapshot();
      expect(after.pointer).toHaveLength(1);
      const winner = after.pointer[0].release_root;
      expect([left.release_root, right.release_root]).toContain(winner);
      expect(after.releases.filter(({ activated_at }) => activated_at !== null)).toHaveLength(1);
      expect(after.releases.find(({ release_root }) => release_root === winner)?.activated_at)
        .toBe(after.pointer[0].activated_at);
    } finally {
      await leftClient.close({ timeout: 5 });
      await rightClient.close({ timeout: 5 });
    }
  });

  test("concurrent changed activation admits one exact-current winner", async () => {
    const current = await seedRelease(root("a"), firstLive.a, firstLive.a);
    const left = await seedRelease(root("d"), firstLive.d);
    const right = await seedRelease(root("e"), firstLive.e);
    await seedCurrent(current.release_root, firstLive.a, firstLive.b);
    const leftClient = await client();
    const rightClient = await client();
    try {
      const outcomes = await Promise.allSettled([
        activateCandidate(leftClient, left, { expectedCurrentRoot: current.release_root }),
        activateCandidate(rightClient, right, { expectedCurrentRoot: current.release_root }),
      ]);
      expect(outcomes.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
      expect(outcomes.filter(({ status }) => status === "rejected")).toHaveLength(1);
      const after = await snapshot();
      const winner = after.pointer[0].release_root;
      const loser = winner === left.release_root ? right.release_root : left.release_root;
      expect(after.releases.find(({ release_root }) => release_root === loser)?.activated_at).toBeNull();
      expect(after.releases.find(({ release_root }) => release_root === winner)?.activated_at)
        .toBe(after.pointer[0].activated_at);
    } finally {
      await leftClient.close({ timeout: 5 });
      await rightClient.close({ timeout: 5 });
    }
  });

  test("forced failure after the guard rolls back pointer and release time", async () => {
    const current = await seedRelease(root("a"), firstLive.a, firstLive.a);
    const target = await seedRelease(root("d"), firstLive.d);
    await seedCurrent(current.release_root, firstLive.a, firstLive.b);
    await sql.unsafe(`CREATE FUNCTION projection.c2_forced_failure()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'forced C2 failure'; END $$`);
    await sql.unsafe(`CREATE TRIGGER c2_forced_failure
      AFTER UPDATE ON projection.releases
      FOR EACH ROW EXECUTE FUNCTION projection.c2_forced_failure()`);
    const before = await snapshot();

    await expect(activateCandidate(sql, target, { expectedCurrentRoot: current.release_root }))
      .rejects.toThrow("forced C2 failure");
    expect(await snapshot()).toEqual(before);
  });

  test("reactivation preserves the target's original first-live time", async () => {
    const prior = await seedRelease(root("a"), firstLive.e, firstLive.a);
    const current = await seedRelease(root("d"), firstLive.d, firstLive.d);
    await seedCurrent(current.release_root, firstLive.d, firstLive.e);

    await activateCandidate(sql, prior, { expectedCurrentRoot: current.release_root });
    const after = await snapshot();
    expect(after.pointer[0].release_root).toBe(prior.release_root);
    expect(after.pointer[0].activated_at).toBe(firstLive.a);
    expect(after.releases.find(({ release_root }) => release_root === prior.release_root)?.activated_at)
      .toBe(firstLive.a);
  });

  test("confirmation requires the exact current root", async () => {
    const current = await seedRelease(root("a"), firstLive.a, firstLive.a);
    await seedCurrent(current.release_root, firstLive.a, firstLive.b);
    const before = await snapshot();
    await expect(confirmCurrentRelease(sql, root("b"))).rejects.toThrow("lost expected-current CAS");
    expect(await snapshot()).toEqual(before);
    await confirmCurrentRelease(sql, current.release_root);
    expect((await snapshot()).pointer[0].confirmed_at).not.toBe(before.pointer[0].confirmed_at);
  });

  test("selects only a verified previously activated release", async () => {
    const prior = await seedRelease(root("a"), firstLive.a, firstLive.a);
    const current = await seedRelease(root("d"), firstLive.d, firstLive.d);
    await seedCurrent(current.release_root, firstLive.d, firstLive.e);

    const selected = await selectStoredRelease(sql, {
      expectedCurrentRoot: current.release_root,
      targetReleaseRoot: prior.release_root,
    });
    expect(selected.release_root).toBe(prior.release_root);
    expect(instant(selected.activated_at)).toBe(firstLive.a);
    const after = await snapshot();
    expect(after.pointer[0].activated_at).toBe(firstLive.a);
    expect(after.releases.find(({ release_root }) => release_root === prior.release_root)?.activated_at)
      .toBe(firstLive.a);
    expect(after.releases.find(({ release_root }) => release_root === current.release_root)?.activated_at)
      .toBe(firstLive.d);
  });

  test("selection refusals leave the complete state unchanged", async () => {
    const prior = await seedRelease(root("a"), firstLive.a, firstLive.a);
    const current = await seedRelease(root("d"), firstLive.d, firstLive.d);
    const pending = await seedRelease(root("e"), firstLive.e);
    await seedCurrent(current.release_root, firstLive.d, firstLive.e);

    const staleBefore = await snapshot();
    const stale = await selectStoredRelease(sql, {
      expectedCurrentRoot: root("b"),
      targetReleaseRoot: prior.release_root,
    }).then(() => null, (error) => error);
    expect(classifyReleaseSelectionRefusal(stale))
      .toBe(releaseSelectionRefusalKinds.expectedCurrentDrift);
    expect(await snapshot()).toEqual(staleBefore);

    for (const attempt of [
      { expectedCurrentRoot: current.release_root, targetReleaseRoot: pending.release_root },
      { expectedCurrentRoot: current.release_root, targetReleaseRoot: root("c") },
      { expectedCurrentRoot: current.release_root, targetReleaseRoot: current.release_root },
    ]) {
      const before = await snapshot();
      await expect(selectStoredRelease(sql, attempt)).rejects.toThrow();
      expect(await snapshot()).toEqual(before);
    }
  });

  test("structural drift refuses inside selection and rolls back", async () => {
    const current = await seedRelease(root("d"), firstLive.d, firstLive.d);
    const drifted = await seedRelease(root("a"), firstLive.a, firstLive.a, root("f"));
    await seedCurrent(current.release_root, firstLive.d, firstLive.e);
    const before = await snapshot();

    await expect(selectStoredRelease(sql, {
      expectedCurrentRoot: current.release_root,
      targetReleaseRoot: drifted.release_root,
    })).rejects.toThrow("inserted root");
    expect(await snapshot()).toEqual(before);
  });

  test("concurrent selections have one CAS winner and preserve all first-live times", async () => {
    const left = await seedRelease(root("a"), firstLive.a, firstLive.a);
    const right = await seedRelease(root("b"), firstLive.b, firstLive.b);
    const current = await seedRelease(root("d"), firstLive.d, firstLive.d);
    await seedCurrent(current.release_root, firstLive.d, firstLive.e);
    const beforeReleases = (await snapshot()).releases;
    const leftClient = await client();
    const rightClient = await client();
    try {
      const outcomes = await Promise.allSettled([
        selectStoredRelease(leftClient, {
          expectedCurrentRoot: current.release_root,
          targetReleaseRoot: left.release_root,
        }),
        selectStoredRelease(rightClient, {
          expectedCurrentRoot: current.release_root,
          targetReleaseRoot: right.release_root,
        }),
      ]);
      expect(outcomes.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
      const refusals = outcomes.flatMap((outcome) => outcome.status === "rejected"
        ? [classifyReleaseSelectionRefusal(outcome.reason)]
        : []);
      expect(refusals).toHaveLength(1);
      expect([
        releaseSelectionRefusalKinds.expectedCurrentDrift,
        releaseSelectionRefusalKinds.postgresSerialization,
      ]).toContain(refusals[0]);
      const after = await snapshot();
      expect([left.release_root, right.release_root]).toContain(after.pointer[0].release_root);
      expect(after.releases).toEqual(beforeReleases);
      expect(after.pointer[0].activated_at).toBe(
        after.releases.find(({ release_root }) => release_root === after.pointer[0].release_root)?.activated_at,
      );
    } finally {
      await leftClient.close({ timeout: 5 });
      await rightClient.close({ timeout: 5 });
    }
  });

  test("packaged concurrent selectors emit one success and one safe refusal", async () => {
    const left = await seedRelease(root("a"), firstLive.a, firstLive.a);
    const right = await seedRelease(root("b"), firstLive.b, firstLive.b);
    const current = await seedRelease(root("d"), firstLive.d, firstLive.d);
    await seedCurrent(current.release_root, firstLive.d, firstLive.e);
    const script = resolve(import.meta.dir, "../scripts/select-projection-release.mjs");
    const run = async (target: string) => {
      const child = Bun.spawn([
        "bun", script,
        "--expected-current", current.release_root,
        "--target", target,
      ], {
        env: { ...process.env, VELA_PROJECTION_WRITER_DATABASE_URL: databaseUrl },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      return { target, stdout, stderr, exitCode };
    };
    const results = await Promise.all([run(left.release_root), run(right.release_root)]);
    const successes = results.filter(({ exitCode }) => exitCode === 0);
    const refusals = results.filter(({ exitCode }) => exitCode === 1);
    expect(successes).toHaveLength(1);
    expect(refusals).toHaveLength(1);
    expect(JSON.parse(successes[0].stdout).ok).toBe(true);
    const refusal = JSON.parse(refusals[0].stderr);
    expect(refusal.ok).toBe(false);
    expect([
      releaseSelectionRefusalKinds.expectedCurrentDrift,
      releaseSelectionRefusalKinds.postgresSerialization,
    ]).toContain(refusal.refusal);
    expect(refusals[0].stdout).toBe("");
    expect(refusals[0].stderr).not.toContain(databaseUrl);
    expect(refusals[0].stderr).not.toMatch(/SELECT|postgres:\/\//u);
    const after = await snapshot();
    expect(after.releases.map(({ activated_at }) => activated_at)).toEqual([
      firstLive.a,
      firstLive.b,
      firstLive.d,
    ]);
  });

  test("rollback excludes a later root until reactivation without deleting it", async () => {
    const oldest = await seedRelease(root("a"), firstLive.a, firstLive.a);
    const prior = await seedRelease(root("b"), firstLive.b, firstLive.b);
    const current = await seedRelease(root("d"), firstLive.d, firstLive.d);
    await seedCurrent(current.release_root, firstLive.d, firstLive.e);
    expect(await retainedRoots()).toEqual([
      current.release_root,
      prior.release_root,
      oldest.release_root,
    ]);

    await selectStoredRelease(sql, {
      expectedCurrentRoot: current.release_root,
      targetReleaseRoot: prior.release_root,
    });
    expect(await retainedRoots()).toEqual([prior.release_root, oldest.release_root]);
    expect((await snapshot()).releases.map(({ release_root }) => release_root)).toContain(
      current.release_root,
    );

    await selectStoredRelease(sql, {
      expectedCurrentRoot: prior.release_root,
      targetReleaseRoot: current.release_root,
    });
    expect(await retainedRoots()).toEqual([
      current.release_root,
      prior.release_root,
      oldest.release_root,
    ]);
  });
});
