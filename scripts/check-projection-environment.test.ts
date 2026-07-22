import { describe, expect, test } from "bun:test";

import { checkProjectionEnvironment } from "./check-projection-environment.mjs";

const readerPassword = "a".repeat(64);
const validEnvironment = {
  VELA_PROJECTION_WRITER_DATABASE_URL:
    "postgresql://neondb_owner:writer@writer.example/vela_observatory?sslmode=require",
  VELA_PROJECTION_READER_PASSWORD: readerPassword,
  VELA_PROJECTION_DATABASE_URL:
    `postgresql://observatory_projection_reader:${readerPassword}@reader.example/vela_observatory?sslmode=require`,
};

describe("projection credential binding", () => {
  test("accepts one reader password bound to the read URL", () => {
    expect(checkProjectionEnvironment(validEnvironment)).toEqual({
      ok: true,
      schema: "vela.projection-environment-check.v1",
    });
  });

  test("rejects a reader URL before it can rotate the role to a different password", () => {
    expect(() => checkProjectionEnvironment({
      ...validEnvironment,
      VELA_PROJECTION_READER_PASSWORD: "b".repeat(64),
    })).toThrow("reader URL password does not match VELA_PROJECTION_READER_PASSWORD");
  });

  test("rejects malformed reader custody material", () => {
    expect(() => checkProjectionEnvironment({
      ...validEnvironment,
      VELA_PROJECTION_READER_PASSWORD: "not-a-32-byte-secret",
    })).toThrow("reader password must be a 32-byte lowercase hex secret");
  });
});
