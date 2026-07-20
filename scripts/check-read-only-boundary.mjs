import { resolve } from "node:path";
import { assertReadOnlyBoundary } from "./read-only-boundary.mjs";

console.log(JSON.stringify(assertReadOnlyBoundary(resolve(import.meta.dirname, ".."))));
