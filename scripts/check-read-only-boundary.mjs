import { resolve } from "node:path";
import { assertReadOnlyBoundary, BOUNDARY_SOURCES } from "./read-only-boundary.mjs";

/* `scanned` is reported so the gate's coverage is visible in CI output
   rather than implied: a boundary check that quietly stopped looking at
   an app would otherwise still print ok. */
console.log(JSON.stringify({
  ...assertReadOnlyBoundary(resolve(import.meta.dirname, "..")),
  scanned: BOUNDARY_SOURCES,
}));
