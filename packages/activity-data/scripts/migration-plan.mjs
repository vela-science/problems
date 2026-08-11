export function planMigrations(localMigrations, installedRows) {
  const localById = new Map(localMigrations.map((migration) => [migration.id, migration]));
  if (localById.size !== localMigrations.length) throw new Error("duplicate local activity migration id");

  const installed = new Map();
  for (const row of installedRows) {
    if (installed.has(row.migration_id)) throw new Error(`duplicate ledger migration ${row.migration_id}`);
    installed.set(row.migration_id, row.migration_root);
  }
  const unknown = [...installed.keys()].filter((id) => !localById.has(id)).sort();
  if (unknown.length) throw new Error(`unknown activity migration ledger entries: ${unknown.join(", ")}`);
  for (const migration of localMigrations) {
    const installedRoot = installed.get(migration.id);
    if (installedRoot && installedRoot !== migration.root) {
      throw new Error(`migration ${migration.id} was rewritten after application`);
    }
  }
  return localMigrations.filter((migration) => !installed.has(migration.id));
}

export function assertExactMigrationLedger(localMigrations, installedRows) {
  const pending = planMigrations(localMigrations, installedRows);
  if (pending.length) {
    throw new Error(`activity migration ledger is incomplete: ${pending.map(({ id }) => id).join(", ")}`);
  }
}
