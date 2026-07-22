const required = [
  "VELA_PROJECTION_WRITER_DATABASE_URL",
  "VELA_PROJECTION_READER_PASSWORD",
  "VELA_PROJECTION_DATABASE_URL",
];

export function checkProjectionEnvironment(environment = process.env) {
  for (const name of required) {
    if (!environment[name]) throw new Error(`missing required projection secret ${name}`);
  }

  const writer = new URL(environment.VELA_PROJECTION_WRITER_DATABASE_URL);
  const reader = new URL(environment.VELA_PROJECTION_DATABASE_URL);
  const readerPassword = environment.VELA_PROJECTION_READER_PASSWORD;
  if (writer.protocol !== "postgresql:" || reader.protocol !== "postgresql:") {
    throw new Error("projection credentials must use postgresql URLs");
  }
  if (decodeURIComponent(reader.username) !== "observatory_projection_reader") {
    throw new Error("projection reader credential has the wrong role");
  }
  if (reader.pathname !== "/vela_observatory" || writer.pathname !== "/vela_observatory") {
    throw new Error("projection credentials must target vela_observatory");
  }
  if (!/^[0-9a-f]{64}$/u.test(readerPassword)) {
    throw new Error("projection reader password must be a 32-byte lowercase hex secret");
  }
  if (decodeURIComponent(reader.password) !== readerPassword) {
    throw new Error("projection reader URL password does not match VELA_PROJECTION_READER_PASSWORD");
  }

  return { ok: true, schema: "vela.projection-environment-check.v1" };
}

if (import.meta.main) {
  console.log(JSON.stringify(checkProjectionEnvironment()));
}
