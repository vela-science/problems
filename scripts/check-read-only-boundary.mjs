import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { assertReadOnlyBoundary, BOUNDARY_SOURCES } from "./read-only-boundary.mjs";

const repository = resolve(import.meta.dirname, "..");

/* The scanner tolerates a missing source root so the unit tests can
   build partial fixtures. In the real repository that tolerance would
   quietly shrink coverage, so the roots are asserted here — where a
   renamed or deleted app fails the gate loudly instead of passing it
   with nothing to check. */
const missing = BOUNDARY_SOURCES.filter((source) => !existsSync(resolve(repository, source)));
if (missing.length) {
  throw new Error(`read-only boundary: source roots missing: ${missing.join(", ")}`);
}

console.log(JSON.stringify({
  ...assertReadOnlyBoundary(repository),
  scanned: BOUNDARY_SOURCES,
}));
