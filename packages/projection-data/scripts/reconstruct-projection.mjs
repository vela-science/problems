import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SQL } from "bun";
import { sqlStatements as schemaStatements } from "./sql-statements.mjs";
import {
  buildProjection,
  canonicalJson,
  sha256,
} from "./projection-builder.mjs";
import {
  activateCandidate,
  currentStoredRelease,
  insertCandidate,
  releaseFacts,
  releaseFactsEqual,
  verifyCandidate,
} from "./projection-store.mjs";
import { loadProjectionSourceAdapterArtifact } from "../src/source-adapters/artifact.ts";
import { projectionReaderIdentity } from "../src/projection-reader.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const schemaPath = join(packageRoot, "schema.sql");
const migrationsPath = join(packageRoot, "migrations");
export const reconstructionDiagnosticPhases = Object.freeze([
  "inputs_loaded", "candidate_1_built", "candidate_2_built", "source_comparison_complete",
  "cluster_initializing", "cluster_initialized", "cluster_started", "schema_migrations_complete",
  "candidate_inserted", "candidate_verified", "candidate_activated", "reader_boundary_verified",
  "attempt_cleanup_started", "attempt_cleanup_complete",
  "database_comparison_complete", "reconstruction_complete",
]);

/* Every reconstruction connection is disposable and may reconnect to a new
   PostgreSQL cluster at the same host/port during attempt two. Bun.SQL's
   prepared-statement cache is process-wide enough that reusing its generated
   statement names across those clusters can bind a one-parameter query to a
   two-parameter statement. The reconstruction is about stored bytes, not
   prepared-statement performance, so all three roles use the same deliberately
   unprepared, single-connection client. */
export function disposableReconstructionSql(databaseUrl) {
  return new SQL(databaseUrl, {
    max: 1,
    connectionTimeout: 5,
    idleTimeout: 5,
    prepare: false,
  });
}

/* PostgreSQL also has statement_timeout, but a client that loses a protocol
   error can otherwise keep the JavaScript await pending after the server has
   already aborted the transaction. Keep that failure bounded and preserve the
   original rejection unchanged when the driver does deliver it. */
export async function withReconstructionDeadline(promise, label, milliseconds = 130_000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`reconstruction query timed out: ${label}`)),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Reproduce the production reader topology inside one disposable cluster. */
export async function installProjectionReaderRoles(admin) {
  await withReconstructionDeadline(
    admin.unsafe(
      `CREATE ROLE ${projectionReaderIdentity.permissionRole}
       NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT`,
    ),
    "create projection reader permission role",
  );
  await withReconstructionDeadline(
    admin.unsafe(
      `CREATE ROLE ${projectionReaderIdentity.loginRole}
       LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT`,
    ),
    "create projection reader login",
  );
  await withReconstructionDeadline(
    admin.unsafe(
      `GRANT ${projectionReaderIdentity.permissionRole}
       TO ${projectionReaderIdentity.loginRole}`,
    ),
    "grant projection reader permission role",
  );
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

/* Typed here rather than at the call sites: `write`'s parameter infers as
   `any` and `attempt`'s default of `null` narrows the parameter to `null`, so
   a TypeScript caller could neither pass a real writer nor an attempt number.
 *
 * @param {{ now?: () => number, write?: (line: string) => void }} [options]
 * @returns {(phase: string, attempt?: number | null) => void}
 */
export function createReconstructionPhaseReporter({
  now = () => performance.now(),
  write = (line) => { process.stderr.write(line); },
} = {}) {
  const startedAt = now();
  let previousElapsed = 0;
  /** @type {(phase: string, attempt?: number | null) => void} */
  return (phase, attempt = null) => {
    invariant(reconstructionDiagnosticPhases.includes(phase), "unsupported reconstruction diagnostic phase");
    invariant(attempt === null || attempt === 1 || attempt === 2, "invalid reconstruction attempt");
    const elapsed = Math.max(previousElapsed, Math.floor(now() - startedAt));
    previousElapsed = elapsed;
    write(`reconstruction_phase phase=${phase} attempt=${attempt ?? "all"} elapsed_ms=${elapsed}\n`);
  };
}

async function reconstructionAttemptDirectory(attempt) {
  const diagnosticsRoot = process.env.VELA_RECONSTRUCTION_DIAGNOSTICS_DIR;
  if (!diagnosticsRoot) {
    return {
      directory: await mkdtemp(join(tmpdir(), `vela-atlas-reconstruction-${attempt}-`)),
      retainOnFailure: false,
    };
  }
  const runnerTemp = process.env.RUNNER_TEMP;
  invariant(runnerTemp, "RUNNER_TEMP is required for retained reconstruction diagnostics");
  const resolvedRoot = resolve(diagnosticsRoot);
  const resolvedRunnerTemp = resolve(runnerTemp);
  invariant(
    resolvedRoot.startsWith(`${resolvedRunnerTemp}/`),
    "reconstruction diagnostics must remain inside RUNNER_TEMP",
  );
  await mkdir(resolvedRoot, { recursive: true, mode: 0o700 });
  const directory = join(resolvedRoot, `attempt-${attempt}`);
  await mkdir(directory, { mode: 0o700 });
  return { directory, retainOnFailure: true };
}

export function parseArgs(argv) {
  const allowed = new Set([
    "repositories-root",
    "vela",
    "source-adapter-artifact",
    "output",
  ]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    invariant(flag?.startsWith("--") && value, `invalid argument near ${flag ?? "end"}`);
    const name = flag.slice(2);
    invariant(allowed.has(name), `unsupported argument ${flag}`);
    invariant(!values.has(name), `duplicate argument ${flag}`);
    values.set(name, value);
  }
  const vela = values.get("vela") ?? process.env.VELA_BIN ?? "vela";
  return {
    repositoriesRoot: resolve(values.get("repositories-root") ?? join(repositoryRoot, "..")),
    vela: vela.includes("/") ? resolve(vela) : vela,
    adapterArtifact: resolve(
      values.get("source-adapter-artifact")
        ?? process.env.VELA_SOURCE_ADAPTER_ARTIFACT
        ?? "",
    ),
    output: values.has("output") ? resolve(values.get("output")) : null,
  };
}

function command(commandName, args, options = {}) {
  const output = execFileSync(commandName, args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: options.quiet ? ["ignore", "ignore", "pipe"] : ["ignore", "pipe", "pipe"],
    ...options,
  });
  return typeof output === "string" ? output.trim() : "";
}

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      invariant(address && typeof address !== "string", "failed to allocate PostgreSQL port");
      const { port } = address;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

function schemaRoot(schemaSql) {
  return `sha256:${createHash("sha256").update(schemaSql).digest("hex")}`;
}

function currentMigrations() {
  return readdirSync(migrationsPath)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(migrationsPath, name), "utf8");
      return {
        id: name.slice(0, -4),
        root: schemaRoot(sql),
        sql,
      };
    });
}

function migrationSetRoot(migrations) {
  return sha256(canonicalJson(migrations.map(({ id, root }) => ({ id, root }))));
}

async function readerBoundary(reader, tableNames) {
  const privileges = await reader.unsafe(
    `SELECT
       current_user AS role,
       pg_has_role(current_user, $2, 'MEMBER') AS permission_member,
       (SELECT rolinherit FROM pg_roles WHERE rolname = current_user) AS inherits_privileges,
       (SELECT count(*)::integer FROM information_schema.table_privileges
        WHERE grantee = current_user) AS direct_table_grants,
       bool_and(has_table_privilege(current_user, 'projection.' || name, 'SELECT')) AS can_select,
       bool_or(has_table_privilege(
         current_user,
         'projection.' || name,
         'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
       )) AS can_write
     FROM unnest($1::text[]) AS expected(name)`,
    [`{${tableNames.join(",")}}`, projectionReaderIdentity.permissionRole],
  );
  return {
    role: privileges[0]?.role,
    permission_role: projectionReaderIdentity.permissionRole,
    permission_member: privileges[0]?.permission_member === true,
    inherits_privileges: privileges[0]?.inherits_privileges === true,
    direct_table_grants: Number(privileges[0]?.direct_table_grants ?? -1),
    can_select_all_projection_tables: privileges[0]?.can_select === true,
    can_write_any_projection_table: privileges[0]?.can_write === true,
  };
}

async function reconstructOnce({ candidate, schemaSql, migrations, tableNames, pgBin, attempt, reportPhase }) {
  const { directory, retainOnFailure } = await reconstructionAttemptDirectory(attempt);
  const data = join(directory, "postgres");
  const log = join(directory, "postgres.log");
  const port = await availablePort();
  let started = false;
  let admin;
  let owner;
  let reader;
  /* Set by the catch below so the `finally` knows whether to dump the server
     log. A successful attempt should stay quiet. */
  let failed = false;
  try {
    reportPhase("cluster_initializing", attempt);
    command(join(pgBin, "initdb"), [
      "--pgdata", data,
      "--username", "postgres",
      "--auth", "trust",
      "--no-locale",
      "--no-instructions",
    ], { quiet: true, env: { ...process.env, LC_ALL: "C" } });
    reportPhase("cluster_initialized", attempt);
    /* `LC_ALL=C`, and the reason is worth writing down because the error is
       not.

       `initdb --no-locale` above sets the cluster's locale, and it is not the
       one that matters here: PostgreSQL 17 refuses to start if the postmaster
       process became multithreaded before it forked, and on macOS an
       unresolvable locale in the environment sends libc off to a helper thread
       during startup. What the operator sees is `pg_ctl: could not start
       server` and, only in a log file inside a temporary directory the script
       then deletes, `postmaster became multithreaded during startup`.

       CI does not hit this and a person on macOS hits it immediately, which is
       backwards: `docs/CONTINUITY.md` in `vela-science/vela` makes
       rebuild-and-compare an obligation a
       human has to be able to discharge, and a rebuild nobody can start is not
       one. Pinned rather than passed through, because a locale is an input to a
       reconstruction that must not vary with whose shell ran it. */
    /* `-k`, and it is what stopped this running on Linux at all.

       A Debian or Ubuntu PostgreSQL is built with its Unix socket directory set
       to `/var/run/postgresql`, which exists and is owned by the `postgres`
       user. This reconstruction runs as whoever invoked it — `runner` on a
       GitHub runner — so the postmaster could not create its socket and refused
       to start. Homebrew builds default that to `/tmp`, which is why it ran on
       macOS and died in CI. The socket belongs beside the cluster it serves.

       And the failure is now legible. `pg_ctl` prints `could not start server —
       Examine the log output` and writes the reason into a file inside a
       temporary directory this function deletes on the way out, so every
       failure of this kind arrived with its own explanation already thrown
       away. That is what made the first two CI runs cost a round trip each. */
    try {
      command(join(pgBin, "pg_ctl"), [
        "--pgdata", data,
        "--log", log,
        /* Bounded server-side, because nothing else in this script bounds a
           wait. A statement that blocks forever is indistinguishable from a
           statement doing work, and the only limit in the whole system was
           `timeout-minutes` in the workflow — which is why a client-side stall
           read as a slow job and burned a two-hour runner. Two minutes is ~10x
           the whole reconstruction; a lock wait here has nothing to contend
           with, since this cluster exists for one client. */
        "--options",
        `-h 127.0.0.1 -p ${port} -k ${directory} -c statement_timeout=120s -c lock_timeout=30s -c log_error_verbosity=terse -c log_min_error_statement=panic -c log_parameter_max_length=0 -c log_parameter_max_length_on_error=0`,
        "--wait",
        "start",
      ], { quiet: true, env: { ...process.env, LC_ALL: "C" } });
    } catch (error) {
      const reason = existsSync(log)
        ? command("tail", ["-c", "65536", log], { maxBuffer: 128 * 1024 })
        : "(no log was written)";
      throw new Error(`${error.message}\n\nPostgreSQL said:\n${reason}`);
    }
    started = true;
    reportPhase("cluster_started", attempt);

    admin = disposableReconstructionSql(
      `postgres://postgres@127.0.0.1:${port}/postgres?sslmode=disable`,
    );
    await installProjectionReaderRoles(admin);
    await withReconstructionDeadline(
      admin.unsafe("CREATE DATABASE vela_projection"),
      "create projection database",
    );
    await withReconstructionDeadline(admin.close(), "close reconstruction admin", 5_000);
    admin = undefined;

    owner = disposableReconstructionSql(
      `postgres://postgres@127.0.0.1:${port}/vela_projection?sslmode=disable`,
    );
    for (const statement of schemaStatements(schemaSql)) {
      await withReconstructionDeadline(owner.unsafe(statement), "apply base schema");
    }
    for (const migration of migrations) {
      for (const statement of schemaStatements(migration.sql)) {
        await withReconstructionDeadline(
          owner.unsafe(statement),
          `apply migration ${migration.id}`,
        );
      }
      await withReconstructionDeadline(
        owner.unsafe(
          "INSERT INTO projection.schema_migrations (migration_id, migration_root) VALUES ($1, $2)",
          [migration.id, migration.root],
        ),
        `record migration ${migration.id}`,
      );
    }
    reportPhase("schema_migrations_complete", attempt);
    await withReconstructionDeadline(insertCandidate(owner, candidate), "insert candidate");
    reportPhase("candidate_inserted", attempt);
    const verified = await withReconstructionDeadline(
      verifyCandidate(owner, candidate),
      "verify candidate",
    );
    reportPhase("candidate_verified", attempt);
    await withReconstructionDeadline(
      activateCandidate(owner, candidate.manifest, { expectedCurrentRoot: null }),
      "activate candidate",
    );
    reportPhase("candidate_activated", attempt);
    const current = await withReconstructionDeadline(
      currentStoredRelease(owner),
      "read activated candidate",
    );
    invariant(current && releaseFactsEqual(current, candidate.manifest), "activated release facts drifted");

    reader = disposableReconstructionSql(
      `postgres://${projectionReaderIdentity.loginRole}@127.0.0.1:${port}/${projectionReaderIdentity.database}?sslmode=disable`,
    );
    const boundary = await withReconstructionDeadline(
      readerBoundary(reader, tableNames),
      "verify reader boundary",
    );
    invariant(boundary.can_select_all_projection_tables, "projection reader cannot select every public table");
    invariant(!boundary.can_write_any_projection_table, "projection reader has write access");
    invariant(
      boundary.role === projectionReaderIdentity.loginRole,
      "projection reader login identity drifted",
    );
    invariant(boundary.permission_member, "projection reader is not a permission-role member");
    invariant(boundary.inherits_privileges, "projection reader does not inherit permission-role grants");
    invariant(boundary.direct_table_grants === 0, "projection reader login has direct table grants");
    reportPhase("reader_boundary_verified", attempt);
    return {
      attempt,
      release_root: verified.release_root,
      manifest_core_root: sha256(canonicalJson(releaseFacts(candidate.manifest))),
      table_roots: candidate.manifest.table_roots,
      table_counts: verified.counts,
      reader: boundary,
    };
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    reportPhase("attempt_cleanup_started", attempt);
    if (admin) {
      try { await withReconstructionDeadline(admin.close(), "close reconstruction admin", 5_000); } catch {}
    }
    if (reader) {
      try { await withReconstructionDeadline(reader.close(), "close reconstruction reader", 5_000); } catch {}
    }
    if (owner) {
      try { await withReconstructionDeadline(owner.close(), "close reconstruction owner", 5_000); } catch {}
    }
    /* On the way out of a FAILED attempt, say what the server said. The
       cluster log is the only place a bind mismatch or a stalled backend leaves
       a trace, and this function deletes the directory holding it — so the two
       CI runs that hung reported nothing at all about why. `pg_ctl start`
       already gets this treatment; a failure anywhere after it did not. */
    if (failed && !retainOnFailure && existsSync(log)) {
      const tail = command("tail", ["-c", "65536", log], { maxBuffer: 128 * 1024 })
        .split("\n").slice(-40).join("\n");
      if (tail) process.stderr.write(`\nPostgreSQL log (attempt ${attempt}, last 40 lines):\n${tail}\n`);
    }
    if (started) {
      try {
        command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"], { quiet: true });
      } catch {}
    }
    if (!failed || !retainOnFailure) await rm(directory, { recursive: true, force: true });
    reportPhase("attempt_cleanup_complete", attempt);
  }
}

export function compareProductionProjection(candidate, production) {
  const samePlatformBinary = candidate.vela_binary_sha256 === production.vela_binary_sha256;
  return {
    manifest_schema_equal: candidate.schema === production.schema,
    vela_version_equal: candidate.vela_version === production.vela_version,
    table_roots_equal: canonicalJson(candidate.table_roots) === canonicalJson(production.table_roots),
    source_repositories_equal:
      canonicalJson(candidate.source_repositories) === canonicalJson(production.source_repositories),
    source_registry_equal:
      canonicalJson(candidate.source_registry) === canonicalJson(production.source_registry),
    generator_binary_equal: samePlatformBinary,
    release_root_equal: candidate.release_root === production.release_root,
    cross_platform_release_root_expected:
      !samePlatformBinary && candidate.release_root !== production.release_root,
  };
}

export function repositoryCommits(sourceRepositories) {
  return Object.fromEntries(
    sourceRepositories.map(({ repository_id, commit }) => [repository_id, commit]),
  );
}

export async function reconstructProjection(options) {
  invariant(options.adapterArtifact, "--source-adapter-artifact is required");
  const reportPhase = createReconstructionPhaseReporter();
  const pgBin = process.env.PG_BIN_DIR ?? command("pg_config", ["--bindir"]);
  const schemaSql = readFileSync(schemaPath, "utf8");
  const migrations = currentMigrations();
  const tableNames = Array.from(
    schemaSql.matchAll(/CREATE TABLE IF NOT EXISTS projection\.([a-z_]+)\s*\(/gu),
    (match) => match[1],
  );
  invariant(tableNames.length > 0, "Problems schema has no table inventory");
  const adapters = await loadProjectionSourceAdapterArtifact(options.adapterArtifact);
  reportPhase("inputs_loaded");
  const codeCommit = command("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot });
  const codeStatus = command("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: repositoryRoot });
  /* `--untracked-files=all` still reports an untracked *directory* as one
     entry when nothing inside it is tracked, and hashing that is `EISDIR`. It
     is not a hypothetical: every CI run of this job checks the canonical
     repositories out into `sources/`, so the first real execution died there
     rather than reconstructing anything. A path that is not a regular file is
     recorded as present with no byte root — which is what the field already
     means for a deletion, and is the truth here too. */
  const codeChanges = codeStatus ? codeStatus.split("\n").map((line) => {
    const path = line.slice(3);
    const absolute = join(repositoryRoot, path);
    const regularFile = existsSync(absolute) && statSync(absolute).isFile();
    return {
      status: line.slice(0, 2),
      path,
      byte_root: regularFile ? sha256(readFileSync(absolute)) : null,
    };
  }) : [];
  const candidates = [1, 2].map((attempt) => {
    const candidate = buildProjection({
      repositoriesRoot: options.repositoriesRoot,
      vela: options.vela,
      sourceAdapterBundles: adapters.bundles,
      sourceAdapterArtifact: adapters.reference,
    });
    reportPhase(`candidate_${attempt}_built`);
    return candidate;
  });
  invariant(releaseFactsEqual(candidates[0].manifest, candidates[1].manifest), "two source reconstructions disagree");
  reportPhase("source_comparison_complete");
  const runs = [];
  for (let index = 0; index < candidates.length; index += 1) {
    runs.push(await reconstructOnce({
      candidate: candidates[index],
      schemaSql,
      migrations,
      tableNames,
      pgBin,
      attempt: index + 1,
      reportPhase,
    }));
  }
  invariant(canonicalJson(runs[0]) === canonicalJson({ ...runs[1], attempt: 1 }), "two database reconstructions disagree");
  reportPhase("database_comparison_complete");

  const activeDatabaseUrl = process.env.VELA_PROJECTION_DATABASE_URL;
  invariant(activeDatabaseUrl, "VELA_PROJECTION_DATABASE_URL is required for active projection parity");
  const active = new SQL(activeDatabaseUrl, { max: 1, prepare: false });
  let production;
  try {
    production = await currentStoredRelease(active);
  } finally {
    await active.close();
  }
  invariant(production, "active projection database has no current release");
  const parity = compareProductionProjection(candidates[0].manifest, production);
  invariant(parity.manifest_schema_equal, "active projection manifest schema drift");
  invariant(parity.vela_version_equal, "active projection Vela version drift");
  invariant(parity.table_roots_equal, "active projection table-root drift");
  invariant(parity.source_repositories_equal, "active projection Repository input drift");
  invariant(parity.source_registry_equal, "active projection source-registry drift");

  const body = {
    schema: "vela.projection-clean-room-qualification.v1",
    measured_at: new Date().toISOString(),
    status: "pass",
    scope: "two_local_empty_postgres_reconstructions",
    code_commit: codeCommit,
    code_dirty: codeStatus !== "",
    code_change_root: codeChanges.length ? sha256(canonicalJson(codeChanges)) : null,
    inputs: {
      schema_root: schemaRoot(schemaSql),
      migration_set_root: migrationSetRoot(migrations),
      vela_version: candidates[0].manifest.vela_version,
      vela_binary_root: candidates[0].manifest.vela_binary_sha256,
      source_adapter_set_root: adapters.manifest.set_root,
      source_adapter_artifact_root: adapters.artifact.artifact_root,
      repository_commits: repositoryCommits(candidates[0].manifest.source_repositories),
    },
    result: {
      release_root: candidates[0].manifest.release_root,
      manifest_core_root: runs[0].manifest_core_root,
      reconstructions: runs,
      byte_identical: true,
      reader_select_only: true,
    },
    production_parity: {
      status: "pass",
      source: "active_projection_database",
      release_root: production.release_root,
      ...parity,
    },
    limitations: [
      "The macOS reconstruction has a distinct release root when production was generated by the recorded Linux binary; exact table roots, Repository inputs, and source-registry roots must still match.",
      "The same frozen source-adapter artifact is used twice; this proves reconstruction, not future reacquisition from mutable upstream sources.",
      "The qualification changes no production data and makes no scientific Decision.",
      "This is reconstruction evidence, not product-lift or adoption evidence.",
    ],
  };
  reportPhase("reconstruction_complete");
  return { ...body, artifact_root: sha256(canonicalJson(body)) };
}

if (import.meta.main) {
  const options = parseArgs(process.argv.slice(2));
  const evidence = await reconstructProjection(options);
  const output = `${canonicalJson(evidence)}\n`;
  if (options.output) {
    await writeFile(options.output, output, { encoding: "utf8", flag: "wx" });
  } else {
    process.stdout.write(output);
  }
}
