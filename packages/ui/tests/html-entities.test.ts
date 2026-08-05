import assert from "node:assert/strict"
import test from "node:test"

import { decodeHtmlEntities } from "../src/lib/html-entities"

test("decodes the decimal references the retained problem statements carry", () => {
  assert.equal(decodeHtmlEntities("Erd&#337;s asked whether &#8721; 1/n diverges"), "Erdős asked whether ∑ 1/n diverges")
})

test("decodes the hex references the markdown pipeline emits", () => {
  assert.equal(decodeHtmlEntities("&#x3C;T&#x3E; &#x26;&#x26; a &#x27;b&#x27; &#x22;c&#x22;"), "<T> && a 'b' \"c\"")
})

test("decodes the named entities both decoders shared", () => {
  assert.equal(decodeHtmlEntities("&amp; &lt; &gt; &quot; &apos; &#39;"), "& < > \" ' '")
})

test("decodes in one pass, so an escaped entity stays what the record says", () => {
  /* `&#x26;#39;` is a record containing the literal text `&#39;`. Chained
     replacement decoded its own output and turned it into an apostrophe. */
  assert.equal(decodeHtmlEntities("&#x26;#39;"), "&#39;")
})

test("leaves an unknown name and an out-of-range reference verbatim", () => {
  assert.equal(decodeHtmlEntities("&notanentity; &#1114112; &#xD800;"), "&notanentity; &#1114112; &#xD800;")
})
