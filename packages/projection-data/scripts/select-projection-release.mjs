import { SQL } from "bun";
import {
  classifyReleaseSelectionRefusal,
  selectStoredRelease,
} from "./projection-store.mjs";

function parseArgs(argv) {
  const allowed = new Set(["--expected-current", "--target"]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(flag) || !value || values.has(flag)) {
      throw new Error(`invalid or repeated release-selection argument near ${flag ?? "end"}`);
    }
    values.set(flag, value);
  }
  if (values.size !== allowed.size) {
    throw new Error("provide exactly --expected-current <root> and --target <root>");
  }
  return {
    expectedCurrentRoot: values.get("--expected-current"),
    targetReleaseRoot: values.get("--target"),
  };
}

async function main() {
  let sql;
  let options;
  let selected;
  try {
    const databaseUrl = process.env.VELA_PROJECTION_WRITER_DATABASE_URL;
    if (!databaseUrl) throw new Error("writer database URL is required");
    options = parseArgs(process.argv.slice(2));
    sql = new SQL(databaseUrl, {
      max: 1,
      connectionTimeout: 10,
      idleTimeout: 5,
      prepare: false,
    });
    selected = await selectStoredRelease(sql, options);
  } catch (error) {
    if (sql) {
      try {
        await sql.close({ timeout: 5 });
      } catch {}
    }
    console.error(JSON.stringify({
      ok: false,
      refusal: classifyReleaseSelectionRefusal(error),
    }));
    process.exitCode = 1;
    return;
  }
  try {
    await sql.close({ timeout: 5 });
  } catch {
    // The transaction already committed. Cleanup cannot revise its outcome.
  }
  console.log(JSON.stringify({
    ok: true,
    expected_current_root: options.expectedCurrentRoot,
    selected_release_root: selected.release_root,
    first_activated_at: new Date(selected.activated_at).toISOString(),
    confirmed_at: new Date(selected.confirmed_at).toISOString(),
  }));
}

await main();
