/* The web font surface, declared once.
 *
 * Three files needed these facts and each carried its own copy. The mirror
 * script listed the two profiles; the budget check restated the product
 * profile verbatim; and the set of faces this project has decided against was
 * written twice in two spellings, as CSS family names in `check-brand.mjs` and
 * as filename fragments in `check-budgets.mjs`. Those two had already
 * diverged: `Schibsted` was in the family list and missing from the filename
 * list, so a `schibsted-*.woff2` reaching `public/assets/fonts` passed the
 * check that was supposed to stop it.
 *
 * One list, then, and one spelling. The two checks look at different surfaces
 * — generated `@font-face` CSS names a family, a delivered file names a file —
 * so the filename form is derived rather than written down again.
 */

/** Which faces each site profile mirrors into `public/assets/fonts`. */
export const webFontProfiles = {
  product: ["ibm-plex-mono-400-latin.woff2", "ibm-plex-mono-500-latin.woff2"],
  editorial: [
    "gambetta-300-700-latin.woff2",
    "gambetta-italic-300-700-latin.woff2",
    "ibm-plex-mono-400-latin.woff2",
    "ibm-plex-mono-500-latin.woff2",
    "switzer-100-900-latin.woff2",
    "switzer-italic-100-900-latin.woff2",
    "zodiak-100-900-latin.woff2",
    "zodiak-italic-100-900-latin.woff2",
  ],
} as const satisfies Record<string, readonly string[]>;

/** The roles the editorial profile fills, and the family each one resolves to. */
export const editorialFontFamilies = ["Gambetta", "Zodiak", "Switzer", "IBM Plex Mono"] as const;

/**
 * Faces this project has decided against.
 *
 * Spectral, Space Grotesk, JetBrains Mono and Schibsted were considered and
 * not chosen. Newsreader and Inter were retired on 2026-07-27: Newsreader read
 * as a quiet book serif and Inter as the default UI sans, and both are
 * training-data defaults rather than decisions.
 */
export const rejectedFontFamilies = [
  "Spectral",
  "Space Grotesk",
  "JetBrains Mono",
  "Schibsted",
  "Newsreader",
  "Inter",
] as const;

/**
 * The filename a family's web files begin with.
 *
 * This is the convention every file in `fonts/web` already follows, which is
 * what makes deriving it safe rather than a guess: "IBM Plex Mono" ships as
 * `ibm-plex-mono-400-latin.woff2`. `assertFontFileNamingConvention` below
 * holds the shipped files to it, so the day someone names a file differently
 * the derivation fails loudly instead of quietly matching nothing.
 */
export function fontFileStem(family: string): string {
  return family.toLowerCase().replaceAll(" ", "-");
}

/**
 * Every delivered file must belong to a family this project chose.
 *
 * Both halves matter. A file whose stem matches no permitted family is either
 * a rejected face or a typo, and a stem that matches nothing is a check that
 * has stopped checking.
 */
export function assertFontFileNamingConvention(files: readonly string[]): void {
  const permitted = editorialFontFamilies.map(fontFileStem);
  for (const file of files) {
    if (!permitted.some((stem) => file.startsWith(`${stem}-`))) {
      throw new Error(`font file ${file} belongs to no declared family (${permitted.join(", ")})`);
    }
  }
}
