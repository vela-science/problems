import { resolve } from "node:path";
import {
  assertScientificAuthorityBoundary,
  BOUNDARY_PROFILES,
} from "./scientific-authority-boundary.mjs";

console.log(JSON.stringify({
  ...assertScientificAuthorityBoundary(resolve(import.meta.dirname, "..")),
  profiles: BOUNDARY_PROFILES,
}));
