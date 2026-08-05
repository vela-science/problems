import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

type Color = [number, number, number]

const productCss = readFileSync(
  new URL("../src/styles/product.css", import.meta.url),
  "utf8"
)

function oklchToSrgb([lightness, chroma, hue]: Color): Color {
  const radians = hue * Math.PI / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear: Color = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return linear.map((channel) => {
    const clamped = Math.min(1, Math.max(0, channel))
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055
  }) as Color
}

function luminance(color: Color) {
  const linear = color.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  )) as Color
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrast(first: Color, second: Color) {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function composite(foreground: Color, background: Color, alpha: number): Color {
  return foreground.map(
    (channel, index) => channel * alpha + background[index]! * (1 - alpha)
  ) as Color
}

test("product focus rings remain distinct from gold and clear 3:1 at 50% opacity", () => {
  const matches = [...productCss.matchAll(
    /--focus-ring:\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/gu
  )]
  assert.equal(matches.length, 2)
  assert.match(productCss, /--ring:\s*var\(--focus-ring\)/u)
  assert.doesNotMatch(productCss, /--ring:\s*var\(--vela-color-stardust\)/u)

  const [lightFocus, darkFocus] = matches.map((match) => (
    oklchToSrgb([
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    ])
  ))
  /* Surfaces are read out of the stylesheet rather than restated here. Held
     as literals they kept passing after the palette moved, verifying the ring
     against three grounds the product no longer had. */
  const surfaces = (block: string) => (
    ["--background", "--card", "--muted"].map((name) => {
      const found = block.match(
        new RegExp(`${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`, "u")
      )
      assert.ok(found, `${name} must be a literal oklch value the focus-ring test can measure`)
      return oklchToSrgb([Number(found[1]), Number(found[2]), Number(found[3])])
    })
  )
  const blockFor = (selector: string) => {
    const found = productCss.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, "u"))
    assert.ok(found, `${selector} block must exist`)
    return found[1]!
  }
  const lightSurfaces = surfaces(blockFor(":root"))
  const darkSurfaces = surfaces(blockFor("\\.dark"))

  for (const surface of lightSurfaces) {
    assert.ok(contrast(composite(lightFocus!, surface, 0.5), surface) >= 3)
  }
  for (const surface of darkSurfaces) {
    assert.ok(contrast(composite(darkFocus!, surface, 0.5), surface) >= 3)
  }
})
