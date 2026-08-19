import { describe, expect, test } from "bun:test";
import { createHash, createPublicKey, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { canonicalJson } from "@vela/projection-data/canonical";
import {
  createSubmissionDraftExport,
  validateSubmissionDraft,
  type VelaSubmissionV3,
} from "../src/draft-submission";
import { signSubmissionDraftLocally } from "../src/local-signing";

const packageRoot = resolve(import.meta.dirname, "..");
const digest = `sha256:${"a".repeat(64)}` as const;
const fixture = (publicKeyHex = "b".repeat(64)): VelaSubmissionV3 => ({
  schema: "vela.submission.v3",
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

describe("vela.submission.v3 drafts", () => {
  test("pins the exact official schema bytes and compiles the production export path", () => {
    const bytes = readFileSync(resolve(packageRoot, "config/submission.schema.json"));
    const provenance = JSON.parse(readFileSync(
      resolve(packageRoot, "config/vela-schemas.v1.json"),
      "utf8",
    ));
    const schemaRoot = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    expect(schemaRoot)
      .toBe("sha256:c931f3a454c2a6544ac08e40adb2e0eb77f71131b7593957de8ff88f748d7318");
    expect(provenance.files[0].sha256).toBe(schemaRoot);
    expect(provenance).toMatchObject({
      vela_version: "0.977.2",
      vela_tag: "v0.977.2",
      vela_commit: "c1a34373c2cdd937ed34fd128174a66fa12be71a",
    });
    const exported = createSubmissionDraftExport(fixture());
    expect(exported.payload.schema).toBe("vela.submission.v3");
    expect(exported.payloadRoot).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(exported.signingHandoff).toEqual({
      state: "unsigned",
      serverHeldKey: false,
      payloadType: "application/vnd.vela.submission.v3+json",
      compatibleLocalToolRequired: true,
      note: expect.stringContaining("compatible local tool"),
    });
    expect(exported.signingHandoff).not.toHaveProperty("command");
  });

  test("rejects hosted identities and properties outside the public schema", () => {
    const hostedIdentity = structuredClone(fixture()) as Record<string, any>;
    hostedIdentity.identity.actor_id = "user_01HOSTED";
    hostedIdentity.provenance.producer = "user_01HOSTED";
    expect(validateSubmissionDraft(hostedIdentity)).toMatchObject({ valid: false });

    const expanded = { ...fixture(), decision: { state: "accepted" } };
    expect(validateSubmissionDraft(expanded)).toMatchObject({ valid: false });

    const fractionalTimestamp = structuredClone(fixture());
    fractionalTimestamp.identity.declared_at = "2026-08-11T12:00:00.123Z";
    fractionalTimestamp.provenance.emitted_at = "2026-08-11T12:00:00.123Z";
    expect(validateSubmissionDraft(fractionalTimestamp)).toMatchObject({ valid: false });
  });

  test("refuses retired v2 and execution-binding payloads", () => {
    const retired = structuredClone(fixture()) as Record<string, any>;
    retired.schema = "vela.submission.v2";
    expect(validateSubmissionDraft(retired)).toMatchObject({ valid: false });

    const bound = structuredClone(fixture()) as Record<string, any>;
    bound.execution_binding = {
      schema: "vela.execution-binding.v1",
      packet_root: digest,
      profile_root: digest,
      verifier_capsule_root: digest,
      result_contract_root: digest,
    };
    expect(validateSubmissionDraft(bound)).toMatchObject({ valid: false });
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

  test("writes exact canonical envelope bytes accepted by the Vela importer", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "vela-local-signing-"));
    try {
      const { privateKey, publicKey } = generateKeyPairSync("ed25519");
      const publicKeyHex = Buffer.from(publicKey.export({ format: "der", type: "spki" }))
        .subarray(-32).toString("hex");
      const draftPath = resolve(directory, "draft.json");
      const keyPath = resolve(directory, "key.pem");
      const outputPath = resolve(directory, "submission.json");
      writeFileSync(draftPath, JSON.stringify(fixture(publicKeyHex)));
      writeFileSync(keyPath, privateKey.export({ format: "pem", type: "pkcs8" }));

      const result = spawnSync(process.execPath, [
        resolve(packageRoot, "scripts/sign-submission-draft.mjs"),
        draftPath,
        "--private-key", keyPath,
        "--output", outputPath,
      ], { cwd: packageRoot, encoding: "utf8" });
      expect(result.status).toBe(0);
      const bytes = readFileSync(outputPath);
      expect(bytes.at(-1)).not.toBe(0x0a);
      const parsed = JSON.parse(bytes.toString("utf8"));
      expect(bytes.toString("utf8")).toBe(canonicalJson(parsed));
      expect(statSync(outputPath).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
