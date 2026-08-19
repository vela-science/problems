import { insertCandidate, publicTableOrder } from "../scripts/projection-store.mjs";

/*
  The projection writer's planned statements, collected without a database.

  `insertCandidate` builds its statements inside `sql.transaction`, so the only
  way to read them is to be the transaction. The stub is a tagged template (the
  `releases` insert) that also carries `.query` (every other one) — the whole
  surface `query()` in projection-store reaches for.

  Two suites share this collection. `tests/projection-writer-statements.test.ts`
  holds the database-free half — the statement count and each statement's
  internal agreement — so those assertions run in every plain gate and cannot
  self-skip. `integration/projection-writes.test.ts` holds the half that needs
  the live catalogue.
*/

export interface Planned {
  table: string;
  named: string[];
  fromRecordset: string[];
}

export const names = (list: string) => list
  .split(",")
  .map((entry) => entry.trim().split(/\s+/u)[0])
  .filter(Boolean);

/* Our own statements in a fixed shape, not SQL in general: `INSERT INTO
   projection.<table> (<columns>)`, optionally followed somewhere by
   `AS x(<columns with types>)`. A statement this does not recognise is
   reported rather than skipped. */
export function parse(text: string): Planned | null {
  const head = /INSERT INTO projection\.(\w+)\s*\(([^)]*)\)/u.exec(text);
  if (!head) return null;
  const recordset = /AS x\(([\s\S]*?)\)\s*(?:ON CONFLICT|$)/u.exec(text);
  return {
    table: head[1] as string,
    named: names(head[2] as string),
    fromRecordset: recordset ? names(recordset[1] as string) : [],
  };
}

function collect() {
  const planned: string[] = [];
  const tx = (strings: TemplateStringsArray, ...values: unknown[]) => {
    planned.push(strings.raw.join("?"));
    return values.length >= 0 ? null : null;
  };
  tx.query = (text: string) => {
    planned.push(text);
    return null;
  };
  return {
    fake: { transaction: async (build: (tx: unknown) => unknown[]) => void build(tx) },
    planned,
  };
}

/* Every public table, empty. Listing them here would be a third copy of the
   schema; taking the roster from the writer means a new table joins this check
   by existing. */
const emptyCandidate = {
  manifest: {
    release_root: `sha256:${"0".repeat(64)}`,
    generated_at: "2026-01-01T00:00:00.000Z",
  },
  tables: Object.fromEntries((publicTableOrder as string[]).map((table) => [table, []])),
};

export async function plannedStatements(): Promise<string[]> {
  const { fake, planned } = collect();
  await insertCandidate(fake, emptyCandidate);
  return planned;
}
