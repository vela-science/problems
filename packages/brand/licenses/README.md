# Brand asset licenses

The Vela name and marks are trademark rights reserved. The provisional mark
files in this package are project-owned source assets and are not covered by
the repository's code or content licenses.

The following self-hosted Latin faces are distributed under the SIL Open Font
License 1.1:

- IBM Plex Mono: `ibm-plex-mono-400-latin.woff2` and
  `ibm-plex-mono-500-latin.woff2`

The following are distributed under the ITF Free Font License (Indian Type
Foundry, via Fontshare), which permits commercial use and self-hosting of the
web font files:

- Zodiak: `zodiak-100-900-latin.woff2`, `zodiak-italic-100-900-latin.woff2`
- Gambetta: `gambetta-300-700-latin.woff2`,
  `gambetta-italic-300-700-latin.woff2`
- Switzer: `switzer-100-900-latin.woff2`, `switzer-italic-100-900-latin.woff2`

All six ship as their variable masters rather than as static instances, so
there is no derived-instance step and no separate source manifest: the served
file is the upstream file. Zodiak and Switzer carry a 100-900 weight axis and
Gambetta 300-700, which is why no heading on the site is browser-synthesised
bold and no `font-variation-settings` declaration selects an optical size.
None of the three has an `opsz` axis.

Newsreader and Inter were retired on 2026-07-27 and their files removed.

The exact served-file hashes are recorded in `FONT-WEB-MANIFEST.sha256`. Package
source and generated code follow the repository's Apache-2.0 OR MIT license;
editorial content and diagrams follow CC BY 4.0 as documented at repository
root.
