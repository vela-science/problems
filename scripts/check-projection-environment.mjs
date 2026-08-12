/* The database, and the two roles that reach it.
 *
 * Three files in this repository spell some of this out. Here it decides
 * whether a secret is accepted; `packages/observatory-data/src/deployment.ts`
 * publishes the database and the reader login in the deployment manifest every
 * reader can fetch; `packages/observatory-data/package.json` writes the database,
 * plus the Neon project id, into two `neonctl` invocations. The permission role
 * remains stable across login rotations and is intentionally not accepted as a
 * runtime credential.
 *
 * Exported so scripts/check-projection-environment.test.ts can hold the other
 * two to these values rather than restating them a fourth time. The project id
 * is deliberately NOT here: it is not part of a connection string, so this
 * check has no use for it, and the manifest is where it is already declared.
 */
import { observatoryProjectionReaderIdentity } from "../packages/observatory-data/src/projection-reader.ts";

export const projectionDatabase = {
  name: observatoryProjectionReaderIdentity.database,
  writerRole: "neondb_owner",
  readerRole: observatoryProjectionReaderIdentity.loginRole,
  readerPermissionRole: observatoryProjectionReaderIdentity.permissionRole,
};

const required = [
  "VELA_PROJECTION_WRITER_DATABASE_URL",
  "VELA_PROJECTION_DATABASE_URL",
];

export function checkProjectionEnvironment(environment = process.env) {
  for (const name of required) {
    if (!environment[name]) throw new Error(`missing required projection secret ${name}`);
  }

  const writer = new URL(environment.VELA_PROJECTION_WRITER_DATABASE_URL);
  const reader = new URL(environment.VELA_PROJECTION_DATABASE_URL);
  const readerPassword = decodeURIComponent(reader.password);
  if (writer.protocol !== "postgresql:" || reader.protocol !== "postgresql:") {
    throw new Error("projection credentials must use postgresql URLs");
  }
  if (decodeURIComponent(writer.username) !== projectionDatabase.writerRole) {
    throw new Error("projection writer credential has the wrong role");
  }
  if (decodeURIComponent(reader.username) !== projectionDatabase.readerRole) {
    throw new Error("projection reader credential has the wrong role");
  }
  const database = `/${projectionDatabase.name}`;
  if (reader.pathname !== database || writer.pathname !== database) {
    throw new Error(`projection credentials must target ${projectionDatabase.name}`);
  }
  if (!/^[0-9a-f]{64}$/u.test(readerPassword)) {
    throw new Error("projection reader password must be a 32-byte lowercase hex secret");
  }
  return { ok: true, schema: "vela.projection-environment-check.v1" };
}

if (import.meta.main) {
  console.log(JSON.stringify(checkProjectionEnvironment()));
}
