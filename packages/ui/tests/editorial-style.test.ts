import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const editorialCss = readFileSync(
  new URL("../src/styles/editorial.css", import.meta.url),
  "utf8",
)

function linear(channel: number) {
  const value = channel / 255
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * linear((value >> 16) & 255)
    + 0.7152 * linear((value >> 8) & 255)
    + 0.0722 * linear(value & 255)
  )
}

function contrast(first: string, second: string) {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

test("editorial focus uses visible ink on paper and stardust at night", () => {
  assert.match(editorialCss, /:root\s*\{[^}]*--ring:\s*var\(--vela-color-midnight\)/su)
  assert.match(editorialCss, /:root\s*\{[^}]*--sidebar-ring:\s*var\(--vela-color-midnight\)/su)
  assert.match(editorialCss, /\.dark,[^{]*\{[^}]*--ring:\s*var\(--vela-color-stardust\)/su)
  assert.ok(contrast("#081224", "#F7F6F2") >= 3)
  assert.ok(contrast("#C9A664", "#081224") >= 3)
})
