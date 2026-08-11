import { describe, expect, test } from "bun:test";
import { assertExactMigrationLedger, planMigrations } from "../scripts/migration-plan.mjs";

const local = [
  { id: "001", root: "sha256:a", source: "one" },
  { id: "002", root: "sha256:b", source: "two" },
];

describe("activity migration planning", () => {
  test("applies a clean database once and skips a green second run", () => {
    expect(planMigrations(local, [])).toEqual(local);
    const installed = [
      { migration_id: "001", migration_root: "sha256:a" },
      { migration_id: "002", migration_root: "sha256:b" },
    ];
    expect(planMigrations(local, installed)).toEqual([]);
    expect(() => assertExactMigrationLedger(local, installed)).not.toThrow();
  });

  test("fails closed on unknown, rewritten, or incomplete ledgers", () => {
    expect(() => planMigrations(local, [
      { migration_id: "003", migration_root: "sha256:c" },
    ])).toThrow("unknown activity migration ledger entries");
    expect(() => planMigrations(local, [
      { migration_id: "001", migration_root: "sha256:changed" },
    ])).toThrow("rewritten after application");
    expect(() => assertExactMigrationLedger(local, [
      { migration_id: "001", migration_root: "sha256:a" },
    ])).toThrow("ledger is incomplete");
  });
});
