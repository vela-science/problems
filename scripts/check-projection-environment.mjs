const required = [
  "VELA_PROJECTION_WRITER_DATABASE_URL",
  "VELA_PROJECTION_READER_PASSWORD",
  "VELA_PROJECTION_DATABASE_URL",
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`missing required projection secret ${name}`);
}

const writer = new URL(process.env.VELA_PROJECTION_WRITER_DATABASE_URL);
const reader = new URL(process.env.VELA_PROJECTION_DATABASE_URL);
if (writer.protocol !== "postgresql:" || reader.protocol !== "postgresql:") {
  throw new Error("projection credentials must use postgresql URLs");
}
if (decodeURIComponent(reader.username) !== "observatory_projection_reader") {
  throw new Error("projection reader credential has the wrong role");
}
if (reader.pathname !== "/vela_observatory" || writer.pathname !== "/vela_observatory") {
  throw new Error("projection credentials must target vela_observatory");
}
if (!/^[0-9a-f]{64}$/u.test(process.env.VELA_PROJECTION_READER_PASSWORD)) {
  throw new Error("projection reader password must be a 32-byte lowercase hex secret");
}

console.log(JSON.stringify({ ok: true, schema: "vela.projection-environment-check.v1" }));
