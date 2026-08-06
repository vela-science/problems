import { readdirSync } from "node:fs";
import { resolve } from "node:path";

/* Propagates a missing-directory error rather than returning an empty list.
   Both callers are gates, and a gate that silently scans nothing reports
   success it did not earn. */
export function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}
