import { describe, expect, test } from "bun:test";
import { createHash, createPublicKey, generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSubmissionDraftExport,
  validateSubmissionDraft,
  type VelaSubmissionV2,
} from "../src/draft-submission";
import { signSubmissionDraftLocally } from "../src/local-signing";

const packageRoot = resolve(import.meta.dirname, "..");
const digest = `sha256:${"a".repeat(64)}` as const;
const fixture = (publicKeyHex = "b".repeat(64)): VelaSubmissionV2 => ({
  schema: "vela.submission.v2",
  identity: {
    schema: "vela.signer-identity.v1",
    actor_id: "agent:problems-local",
    actor_class: "agent",
    public_key_hex: publicKeyHex,
    declared_at: "2026-08-11T12:00:00Z",
  },
  claim: { assertion: "A bounded computational result.", type: "computational", conditions: [] },
  artifacts: [{ kind: "witness", path: "artifacts/witness.json", digest }],
  caveats: ["Unsigned hosted draft; repository authority remains local."],
  replayability: "exact",
  producer_checks: [{ method: "fixture", outcome: "pass", authority: "producer_reported" }],
  verification_requirements: ["Replay in the exact repository checkout."],
  requested_change: { kind: "add_claim" },
  provenance: {
    producer: "agent:problems-local",
    source_system: "problems.science",
    source_run: "local-fixture",
    emitted_at: "2026-08-11T12:00:00Z",
  },
});

describe("vela.submission.v2 drafts", () => {
  test("pins the exact official schema bytes and compiles the production export path", () => {
    const bytes = readFileSync(resolve(packageRoot, "config/submission.schema.json"));
    const provenance = JSON.parse(readFileSync(
      resolve(packageRoot, "config/vela-schemas.v1.json"),
      "utf8",
    ));
    const schemaRoot = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    expect(schemaRoot)
      .toBe("sha256:d58dda0ddca3ee01c99b0584c604779d1b10250a5472003e7ea2a7aade872134");
    expect(provenance.files[0].sha256).toBe(schemaRoot);
    expect(provenance).toMatchObject({
      vela_version: "0.972.1",
      vela_tag: "v0.972.1",
      vela_commit: "26e7afa2f1eb5ef8d4c384bb72e65633192a6864",
    });
    const exported = createSubmissionDraftExport(fixture());
    expect(exported.payload.schema).toBe("vela.submission.v2");
    expect(exported.payloadRoot).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(exported.signingHandoff).toMatchObject({ state: "unsigned", serverHeldKey: false });
  });

  test("rejects hosted identities and properties outside the public schema", () => {
    const hostedIdentity = structuredClone(fixture()) as Record<string, any>;
    hostedIdentity.identity.actor_id = "user_01HOSTED";
    hostedIdentity.provenance.producer = "user_01HOSTED";
    expect(validateSubmissionDraft(hostedIdentity)).toMatchObject({ valid: false });

    const expanded = { ...fixture(), decision: { state: "accepted" } };
    expect(validateSubmissionDraft(expanded)).toMatchObject({ valid: false });
  });

  test("hands signing to an explicit local Ed25519 key and self-verifies", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const spki = publicKey.export({ format: "der", type: "spki" });
    const publicKeyHex = Buffer.from(spki).subarray(-32).toString("hex");
    const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
    const signed = signSubmissionDraftLocally(fixture(publicKeyHex), privateKeyPem);
    expect(signed.envelope.signatures).toHaveLength(1);
    expect(signed.envelope.signatures[0]?.keyid).toBe(publicKeyHex);
    expect(signed.envelopeRoot).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(JSON.parse(Buffer.from(signed.envelope.payload, "base64").toString("utf8")))
      .toEqual(fixture(publicKeyHex));
    expect(createPublicKey(privateKey).asymmetricKeyType).toBe("ed25519");
  });

  test("refuses a local key that does not match the draft's declared identity", () => {
    const declared = generateKeyPairSync("ed25519");
    const actual = generateKeyPairSync("ed25519");
    const declaredSpki = declared.publicKey.export({ format: "der", type: "spki" });
    const declaredPublicKeyHex = Buffer.from(declaredSpki).subarray(-32).toString("hex");
    const actualPrivateKeyPem = actual.privateKey.export({ format: "pem", type: "pkcs8" }).toString();

    expect(() => signSubmissionDraftLocally(fixture(declaredPublicKeyHex), actualPrivateKeyPem))
      .toThrow("local signing key does not match identity.public_key_hex");
  });
});
