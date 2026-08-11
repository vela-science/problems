import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signSubmissionDraftLocally } from "../src/local-signing.ts";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const positional = process.argv.slice(2).find((value) => !value.startsWith("--"));
const privateKeyPath = option("--private-key");
const outputPath = option("--output");
if (!positional || !privateKeyPath || !outputPath) {
  throw new Error("usage: submission:sign-local <draft.json> --private-key <pkcs8.pem> --output <submission.json>");
}

const input = JSON.parse(readFileSync(resolve(positional), "utf8"));
const privateKey = readFileSync(resolve(privateKeyPath), "utf8");
const signed = signSubmissionDraftLocally(input, privateKey);
writeFileSync(resolve(outputPath), `${signed.canonicalEnvelope}\n`, { flag: "wx", mode: 0o600 });
console.log(JSON.stringify({
  ok: true,
  schema: "vela.activity-local-signing-result.v1",
  output: resolve(outputPath),
  submission_root: signed.envelopeRoot,
  server_key: false,
}));
