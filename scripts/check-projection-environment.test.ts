import { describe, expect, test } from "bun:test";

import { checkProjectionEnvironment } from "./check-projection-environment.mjs";

const readerPassword = "a".repeat(64);
const validEnvironment = {
  VELA_PROJECTION_WRITER_DATABASE_URL:
    "postgresql://neondb_owner:writer@writer.example/vela_observatory?sslmode=require",
  VELA_PROJECTION_DATABASE_URL:
    `postgresql://observatory_projection_reader:${readerPassword}@reader.example/vela_observatory?sslmode=require`,
};

describe("projection credential binding", () => {
  test("accepts one writer URL and one self-contained reader URL", () => {
    expect(checkProjectionEnvironment(validEnvironment)).toEqual({
      ok: true,
      schema: "vela.projection-environment-check.v1",
    });
  });

  test("rejects malformed reader custody material", () => {
    expect(() => checkProjectionEnvironment({
      ...validEnvironment,
      VELA_PROJECTION_DATABASE_URL:
        "postgresql://observatory_projection_reader:not-a-secret@reader.example/vela_observatory?sslmode=require",
    })).toThrow("reader password must be a 32-byte lowercase hex secret");
  });

  test("does not accept a generic database fallback", () => {
    const { VELA_PROJECTION_DATABASE_URL: _reader, ...withoutReader } = validEnvironment;
    expect(() => checkProjectionEnvironment({
      ...withoutReader,
      DATABASE_URL:
        `postgresql://observatory_projection_reader:${readerPassword}@reader.example/vela_observatory?sslmode=require`,
    })).toThrow("missing required projection secret VELA_PROJECTION_DATABASE_URL");
  });

  test("does not accept the reader credential as the writer", () => {
    expect(() => checkProjectionEnvironment({
      ...validEnvironment,
      VELA_PROJECTION_WRITER_DATABASE_URL: validEnvironment.VELA_PROJECTION_DATABASE_URL,
    })).toThrow("projection writer credential has the wrong role");
  });

  test("does not accept the writer credential as the reader", () => {
    expect(() => checkProjectionEnvironment({
      ...validEnvironment,
      VELA_PROJECTION_DATABASE_URL: validEnvironment.VELA_PROJECTION_WRITER_DATABASE_URL,
    })).toThrow("projection reader credential has the wrong role");
  });
});
