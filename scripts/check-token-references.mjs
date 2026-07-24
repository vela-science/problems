import { resolve } from "node:path";
import { assertTokenReferences } from "./token-references.mjs";

console.log(JSON.stringify(assertTokenReferences(resolve(import.meta.dirname, ".."))));
