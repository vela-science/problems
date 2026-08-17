import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { canonicalJson, sha256, type HashRoot } from "@vela/projection-data/canonical";
import {
  assertSubmissionDraft,
  VELA_SUBMISSION_PAYLOAD_TYPE,
  type VelaSubmissionV3,
} from "./draft-submission";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function pae(payloadType: string, payload: Uint8Array): Buffer {
  const type = Buffer.from(payloadType, "utf8");
  return Buffer.concat([
    Buffer.from(`DSSEv1 ${type.byteLength} `, "ascii"),
    type,
    Buffer.from(` ${payload.byteLength} `, "ascii"),
    Buffer.from(payload),
  ]);
}

function rawEd25519PublicKey(privateKeyPem: string): Buffer {
  const privateKey = createPrivateKey(privateKeyPem);
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("local signing key must be Ed25519");
  const der = createPublicKey(privateKey).export({ format: "der", type: "spki" });
  const bytes = Buffer.from(der);
  if (bytes.byteLength !== ED25519_SPKI_PREFIX.byteLength + 32
    || !bytes.subarray(0, ED25519_SPKI_PREFIX.byteLength).equals(ED25519_SPKI_PREFIX)) {
    throw new Error("local signing key has an unexpected Ed25519 public-key encoding");
  }
  return bytes.subarray(ED25519_SPKI_PREFIX.byteLength);
}

export type DsseEnvelope = {
  payloadType: typeof VELA_SUBMISSION_PAYLOAD_TYPE;
  payload: string;
  signatures: Array<{ keyid: string; sig: string }>;
};

export type LocalSignedSubmission = {
  envelope: DsseEnvelope;
  canonicalEnvelope: string;
  envelopeRoot: HashRoot;
};

export function signSubmissionDraftLocally(
  value: unknown,
  privateKeyPem: string,
): LocalSignedSubmission {
  const payload: VelaSubmissionV3 = assertSubmissionDraft(value);
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKey = rawEd25519PublicKey(privateKeyPem);
  const publicKeyHex = publicKey.toString("hex");
  if (payload.identity.public_key_hex !== publicKeyHex) {
    throw new Error("local signing key does not match identity.public_key_hex");
  }
  const payloadBytes = Buffer.from(canonicalJson(payload), "utf8");
  const preAuthenticationEncoding = pae(VELA_SUBMISSION_PAYLOAD_TYPE, payloadBytes);
  const signature = sign(null, preAuthenticationEncoding, privateKey);
  if (!verify(null, preAuthenticationEncoding, createPublicKey(privateKey), signature)) {
    throw new Error("local Submission signature did not verify");
  }
  const envelope: DsseEnvelope = {
    payloadType: VELA_SUBMISSION_PAYLOAD_TYPE,
    payload: payloadBytes.toString("base64"),
    signatures: [{ keyid: publicKeyHex, sig: signature.toString("base64") }],
  };
  const canonicalEnvelope = canonicalJson(envelope);
  return { envelope, canonicalEnvelope, envelopeRoot: sha256(canonicalEnvelope) };
}
