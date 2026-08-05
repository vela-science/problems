import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const source = readFileSync(
  resolve(import.meta.dirname, "../src/components/vela/status-badge.tsx"),
  "utf8",
)

/* Parse the states map rather than importing it: this package is consumed as
   TSX source by two Next applications and has no build step of its own. */
function states() {
  const block = source.match(/const states[^=]*=\s*\{([\s\S]*?)\n\};/u)
  assert.ok(block, "status-badge must declare a states map")
  const entries = [...block[1]!.matchAll(
    /(\w+):\s*\{\s*tone:\s*"(\w+)",\s*icon:\s*(\w+),\s*axis:\s*"(\w+)"\s*\}/gu
  )]
  assert.ok(entries.length > 10, "states map did not parse")
  return entries.map(([, name, tone, icon, axis]) => ({ name: name!, tone: tone!, icon: icon!, axis: axis! }))
}

test("every state declares which of the four axes it belongs to", () => {
  const axes = new Set(["standing", "verification", "proposal", "integrity"])
  for (const state of states()) assert.ok(axes.has(state.axis), `${state.name} has unknown axis ${state.axis}`)
})

test("a Decision and a Verification never share a glyph", () => {
  /* The protocol's named failure mode is reading "verification passed" as
     "accepted". They are kept apart by hue, glyph and word; this pins the
     glyph, because that is the one a screenshot cannot lie about. */
  const byAxis = (axis: string) => new Set(states().filter((s) => s.axis === axis).map((s) => s.icon))
  const standing = byAxis("standing")
  const verification = byAxis("verification")
  const shared = [...standing].filter((icon) => verification.has(icon))
  assert.deepEqual(shared, [], `standing and verification share ${shared.join(", ")}`)
})

test("no two states in one axis are separated by colour alone", () => {
  /* Five states once resolved to Alert02Icon, so within an axis they differed
     only by tone — a WCAG 1.4.1 failure the type system could not catch.

     Same glyph AND same tone is an alias (`verified` is the web's word for the
     protocol's `pass`) and is fine. Same glyph with a DIFFERENT tone is the
     failure: two facts a reader must tell apart, separated by colour only. */
  for (const axis of ["standing", "verification", "proposal", "integrity"]) {
    const byIcon = new Map<string, Set<string>>()
    for (const state of states().filter((s) => s.axis === axis)) {
      const tones = byIcon.get(state.icon) ?? new Set<string>()
      tones.add(state.tone)
      byIcon.set(state.icon, tones)
    }
    for (const [icon, tones] of byIcon) {
      assert.equal(tones.size, 1, `${axis}: ${icon} carries ${[...tones].join(" and ")} — colour is the only difference`)
    }
  }
})

test("accepted standing is progress green and a passing check is evidence teal", () => {
  const map = new Map(states().map((s) => [s.name, s]))
  assert.equal(map.get("accepted")?.tone, "progress")
  assert.equal(map.get("pass")?.tone, "evidence")
  assert.equal(map.get("verified")?.tone, "evidence")
})

test("the exported axis table is derived from the states map, not written twice", () => {
  /* Observatory's `product-language` must name the axis in words, because the
     search and graph ledgers write four axes into one projection column and a
     `data-axis` attribute cannot be read aloud. It held its own copy of this
     map; it reads `stateAxesByWord` now, so this pins that the export stays a
     view of `states` rather than becoming a third literal. */
  assert.match(
    source,
    /export const stateAxesByWord[^=]*=\s*Object\.fromEntries\(\s*Object\.entries\(states\)/u,
  )
})

test("the exported glyph table is derived from the states map, not written twice", () => {
  /* The Decision stream draws a state's mark without a badge over it, and did
     that from a private two-row map that put `accepted` and `rejected` on one
     axis. It reads `stateIcons` now, so this pins that the export stays a view
     of `states` rather than becoming another literal. */
  assert.match(
    source,
    /export const stateIcons[^=]*=\s*Object\.fromEntries\(\s*Object\.entries\(states\)/u,
  )
})

test("the tone fill table covers every tone exactly once", () => {
  /* Two Observatory components painted tones as areas from their own tables and
     one had no neutral row. This is keyed by tone rather than by state, so it
     cannot be derived from `states`; what it can be held to is completeness. */
  const block = source.match(/export const toneFills[^=]*=\s*\{([\s\S]*?)\n\};/u)
  assert.ok(block, "status-badge must export a toneFills map")
  const rows = [...block[1]!.matchAll(/(\w+):\s*"([^"]+)"/gu)].map(([, tone]) => tone!)
  assert.deepEqual(rows.sort(), ["caution", "conflict", "evidence", "neutral", "progress"])
})

test("the exported tone table is derived from the states map, not written twice", () => {
  /* The graph canvas paints states without rendering a badge, and it did that
     from a second literal map that had the two hues above swapped. It reads
     `stateTones` now, so this pins that `stateTones` is the same map read a
     different way and cannot drift from it. */
  assert.match(
    source,
    /export const stateTones[^=]*=\s*Object\.fromEntries\(\s*Object\.entries\(states\)/u,
  )
})
