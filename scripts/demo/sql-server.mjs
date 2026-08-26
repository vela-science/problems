/* Speak the Neon serverless driver's HTTP protocol, backed by PGlite.
 *
 * `packages/projection-data/src/neon-client.ts` already has the hook: set
 * `VELA_NEON_FETCH_ENDPOINT` to a loopback `/sql` URL and every read in the
 * application goes there instead of to Neon. It validates the endpoint
 * carefully — http only, loopback host only, path exactly `/sql`, no
 * credentials, and never in a production Vercel build — and then assumes
 * something is listening. Nothing ever was. This is that something.
 *
 * The protocol is small: POST a JSON body of `{query, params}`, answer with
 * `{fields, rows, rowCount, command}`. The driver reads `rows` as arrays or
 * objects depending on the `Neon-Array-Mode` header, so both are honoured.
 */
import { createServer } from "node:http";

/* Values go back as Postgres wire text, not as JavaScript.
 *
 * This is the difference that made the application fail against its own demo
 * database while working against Neon. Neon's HTTP API answers in text and the
 * driver parses it using the type oid; PGlite parses first and hands back a
 * JavaScript value. So `manifest` arrived as an object, and the reader that
 * expected the string Neon sends called JSON.parse on it and threw
 * `"[object Object]" is not valid JSON`.
 *
 * Re-serialising here keeps one parser in the system — the driver's — and means
 * the application cannot tell this database from the real one. */
const JSON_OIDS = new Set([114, 3802]);

function arrayText(items) {
  return `{${items.map((item) => {
    if (item === null || item === undefined) return "NULL";
    if (typeof item === "object") return `"${JSON.stringify(item).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
    const text = String(item);
    return /[{}",\\\s]/u.test(text) || text === ""
      ? `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
      : text;
  }).join(",")}}`;
}

function wireText(value, oid) {
  if (value === null || value === undefined) return null;
  if (JSON_OIDS.has(oid)) return JSON.stringify(value);
  if (Array.isArray(value)) return arrayText(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "t" : "f";
  return String(value);
}

function encodeRows(rows, fields, arrayMode) {
  const oids = fields.map((field) => field.dataTypeID);
  const names = fields.map((field) => field.name);
  return rows.map((row) => {
    if (arrayMode) return row.map((cell, index) => wireText(cell, oids[index]));
    return Object.fromEntries(names.map((name, index) => [name, wireText(row[name], oids[index])]));
  });
}

/* Postgres type oids the driver needs to parse a column. PGlite reports them
   per field, so they are passed through rather than guessed. */
function describeFields(fields = []) {
  return fields.map((field) => ({
    name: field.name,
    dataTypeID: field.dataTypeID,
  }));
}

function truthy(header) {
  return header === "true" || header === "1";
}

export function createSqlServer(db, { host = "127.0.0.1", port = 0 } = {}) {
  const server = createServer((request, response) => {
    const send = (status, body) => {
      const payload = JSON.stringify(body);
      response.writeHead(status, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      });
      response.end(payload);
    };

    if (request.method !== "POST" || !request.url?.startsWith("/sql")) {
      send(404, { message: "only POST /sql is served" });
      return;
    }

    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      void (async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const arrayMode = truthy(request.headers["neon-array-mode"]);
          /* The driver batches with `transaction()`; a batch arrives as an
             array of query objects and must answer with an array of results in
             the same order. */
          const queries = Array.isArray(body.queries) ? body.queries : [body];
          const results = [];
          for (const item of queries) {
            const query = await db.query(item.query, item.params ?? [], {
              rowMode: arrayMode ? "array" : "object",
            });
            results.push({
              command: (query.statement ?? "SELECT").toUpperCase(),
              fields: describeFields(query.fields),
              rowCount: query.affectedRows ?? query.rows.length,
              rows: encodeRows(query.rows, query.fields ?? [], arrayMode),
              rowAsArray: arrayMode,
            });
          }
          send(200, Array.isArray(body.queries) ? { results } : results[0]);
        } catch (error) {
          /* Shaped like a Postgres error, because the driver reads these
             fields and the application's error handling reads them after it —
             a plain 500 would surface as "fetch failed" rather than as the
             constraint that actually refused. */
          send(400, {
            message: error?.message ?? String(error),
            code: error?.code ?? "XX000",
            severity: "ERROR",
            detail: error?.detail,
            hint: error?.hint,
          });
        }
      })();
    });
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        server,
        port: address.port,
        endpoint: `http://${host}:${address.port}/sql`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}
