import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TOOL_DESCRIPTIONS } from "./schemas";

/* `llms.txt` is the only place the agent interface describes itself to a reader
 * who is not already driving the page, which makes it the easiest place to
 * overclaim. It is prose, so nothing else checks it: a sentence promising that
 * an agent can submit or accept a Result would read perfectly and be false, and
 * the authority-boundary test next door would stay green because no code
 * changed.
 *
 * So the document is held to the same line the interface is. */
const llms = readFileSync(resolve(import.meta.dirname, "../../public/llms.txt"), "utf8");

describe("llms.txt", () => {
  it("names every tool the page actually registers, and no others", () => {
    for (const tool of Object.keys(TOOL_DESCRIPTIONS)) {
      expect(llms, `${tool} is registered but undocumented`).toContain(`\`${tool}\``);
    }
    /* Only the agent-interface section: elsewhere the document quotes projection
       field names like `declared_status`, which are not tools. */
    const section = llms.slice(llms.indexOf("## Agent interface"), llms.indexOf("## Machine-readable"));
    const documented = [...section.matchAll(/`([a-z]+_[a-z_]+)`/gu)].map(([, name]) => name);
    for (const name of new Set(documented)) {
      expect(Object.keys(TOOL_DESCRIPTIONS), `${name} is documented but not registered`).toContain(name);
    }
  });

  it("claims no capability the boundary forbids", () => {
    /* The failure mode is a confident sentence, so this looks for the verbs
       that would constitute one rather than for any mention of the nouns —
       the document has to be free to say an agent *cannot* do these. */
    for (const claim of [
      /agents? (?:can|may) sign/iu,
      /agents? (?:can|may) (?:issue|make) a Decision/iu,
      /agents? (?:can|may) (?:change|move|write) [a-z ]*Standing/iu,
      /submit (?:a )?(?:Result|Submission) (?:from|in) the (?:web|browser)/iu,
      /signing key/iu,
    ]) {
      if (claim.source.includes("signing key")) {
        /* Permitted only in the negative: the page holds none. */
        expect(llms).toMatch(/holds no signing\s+key/iu);
        continue;
      }
      expect(llms, `llms.txt claims: ${claim}`).not.toMatch(claim);
    }
  });

  it("states that a draft leaves the browser unsigned", () => {
    expect(llms).toMatch(/unsigned/iu);
    expect(llms).toMatch(/signs it with a key only\s+they\s+hold/iu);
  });
});
