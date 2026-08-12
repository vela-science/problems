import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/vela/brand-mark.tsx", import.meta.url), "utf8");
const full = readFileSync(new URL("../../brand/marks/source/vela-symbol-full.svg", import.meta.url), "utf8");
const micro = readFileSync(new URL("../../brand/marks/source/vela-symbol-micro.svg", import.meta.url), "utf8");
const paths = (source: string) => [...source.matchAll(/\bd="([^"]+)"/gu)].map((match) => match[1]!.replace(/\s+/gu, " ").trim());

test("shared full and micro marks retain canonical brand geometry", () => {
  const sourcePaths = paths(component);
  for (const path of [...paths(full), ...paths(micro)]) assert.ok(sourcePaths.includes(path));
  assert.match(component, /0 0 1000 800/u);
  assert.match(component, /0 0 256 256/u);
  assert.doesNotMatch(component, /#[0-9A-Fa-f]{6}/u);
});
