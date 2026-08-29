import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { ScientificText } from "../src/components/vela/scientific-text"

/* Erdős 470's retained statement, verbatim. The whole bracket-and-parenthesis
   run used to reach the page as its own markdown source, set at heading size in
   the h1 — a MathSciNet URL as the most prominent text on the page, where the
   reference it names is the most useful thing in the sentence. */
test("a retained markdown reference renders as its own link", () => {
  const html = renderToStaticMarkup(
    <ScientificText text="Benkoski and Erdős [BeEr74](https://mathscinet.ams.org/mathscinet/relay-station?mr=347726) proved that the set of weird numbers has positive density." />
  )
  assert.match(html, /href="https:\/\/mathscinet\.ams\.org\/mathscinet\/relay-station\?mr=347726"/u)
  assert.match(html, />BeEr74</u)
  assert.doesNotMatch(html, /\]\(http/u)
})

/* The scheme is pinned in the token pattern, so a source cannot route a target
   into an href through its own statement. The characters still render, escaped,
   as the literal text the source wrote — which is the honest outcome for a
   construct this renderer does not claim to support. */
test("a non-http target never reaches an href", () => {
  const html = renderToStaticMarkup(<ScientificText text="see [x](javascript:alert(1)) here" />)
  assert.doesNotMatch(html, /href="javascript:/u)
  assert.doesNotMatch(html, /<a /u)
})

test("mathematics still renders beside a reference", () => {
  const html = renderToStaticMarkup(
    <ScientificText text="Erdős [Er73](https://example.org/a) asked whether $n^2 < 4$." />
  )
  assert.match(html, /href="https:\/\/example\.org\/a"/u)
  assert.match(html, /katex/u)
})
