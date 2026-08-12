import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/styles/typeset.css", import.meta.url), "utf8");

test("Typeset owns forward-flow rhythm without taking layout measure", () => {
  for (const preset of ["typeset", "typeset-reading", "typeset-docs", "typeset-compact", "typeset-editorial"]) {
    const declarations = css.match(new RegExp(`\\.${preset}\\s*\\{([^}]*)\\}`, "u"))?.[1];
    assert.ok(declarations, `${preset} declarations should exist`);
    assert.doesNotMatch(declarations, /max-width\s*:/u, `${preset} must not own layout measure`);
  }
  assert.match(css, /\.not-typeset/u);
  assert.match(css, /\.typeset-scroll/u);
  assert.doesNotMatch(css, /last-child/u);
  assert.match(css, /@media print/u);
  assert.match(css, /forced-colors: active/u);
});
