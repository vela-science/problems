import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/* The invariant, kept by a test rather than by a paragraph.
 *
 * The claim this application makes to an agent is that WebMCP grants exactly
 * the capabilities a signed-in person already has, and none beyond them. That
 * is only worth saying if something checks it, because the failure mode is
 * silent: a tool that signed, decided, or wrote Standing would still return a
 * cheerful result, and the page would still look right.
 *
 * So this reads the agent interface as bytes and refuses the shapes that would
 * cross the line. It is the same technique as
 * `scripts/scientific-authority-boundary.mjs`, aimed at one directory. */

const directory = resolve(import.meta.dirname);
const sources = readdirSync(directory)
  .filter((name) => /\.tsx?$/u.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx"))
  .map((name) => ({ name, body: readFileSync(resolve(directory, name), "utf8") }));

describe("the agent interface holds no scientific authority", () => {
  it("covers every module in the directory", () => {
    expect(sources.map(({ name }) => name).sort()).toEqual([
      "build-context.ts", "context.ts", "register-tools.tsx", "results.ts",
      "schemas.ts", "tools.ts",
    ]);
  });

  it("emits no authoritative Vela record", () => {
    for (const { name, body } of sources) {
      expect(body, name).not.toMatch(/["']vela\.(?:decision|event|standing|verification-record|repository)/iu);
    }
  });

  it("calls nothing that decides, verifies, or writes Standing", () => {
    /* Deliberately matched on shape rather than on a list of known names: a
       future `recordDecision` should fail this without anyone remembering to
       add it. */
    for (const { name, body } of sources) {
      expect(body, name).not.toMatch(
        /\b(?:create|emit|issue|record|sign|write|accept|reject|decide)[A-Za-z0-9_$]*(?:Decision|Standing|ScientificEvent|Verification|Proposal)\b/u,
      );
    }
  });

  it("holds no signing machinery and reads no key material", () => {
    for (const { name, body } of sources) {
      expect(body, name).not.toMatch(/\b(?:createPrivateKey|generateKeyPair|generateKeyPairSync)\s*\(/u);
      expect(body, name).not.toMatch(/@vela\/activity-data\/local-signing/u);
      expect(body, name).not.toMatch(/\bprocess\.env\.[A-Z0-9_]*(?:AUTHORITY|PRIVATE|SIGNING|SEED)[A-Z0-9_]*/u);
    }
  });

  it("reaches the Work plane only through the declared Server Actions", () => {
    const tools = sources.find(({ name }) => name === "tools.ts")!.body;
    const registration = sources.find(({ name }) => name === "register-tools.tsx")!.body;
    /* The tools take actions as an argument and never import a mutation
       themselves, which is what keeps the human path and the agent path the
       same path. */
    expect(tools).not.toMatch(/from "@\/app\/actions\//u);
    expect(registration).toContain('from "@/app/actions/activity"');
    const imported = registration.match(/import \{([^}]+)\} from "@\/app\/actions\/activity"/u)?.[1] ?? "";
    expect(imported.split(",").map((name) => name.trim()).filter(Boolean).sort()).toEqual([
      "addDiscussionAction", "attachArtifactAction", "createApproachAction",
      "createAttemptAction", "saveSubmissionDraftAction",
    ]);
  });

  it("offers no tool that finalises anything", () => {
    const schemas = sources.find(({ name }) => name === "schemas.ts")!.body;
    const names = [...schemas.matchAll(/^  ([a-z_]+):$/gmu)].map((match) => match[1]);
    expect(names.sort()).toEqual([
      "attach_evidence", "inspect_candidate", "inspect_claim", "inspect_history",
      "inspect_problem", "open_approach", "prepare_submission", "search_problems",
    ]);
    for (const forbidden of ["approve", "accept", "decide", "sign", "finalise", "finalize", "publish"]) {
      expect(names.some((name) => name.includes(forbidden)), forbidden).toBe(false);
    }
  });

  it("tells the model, in each mutating description, that nothing is established", () => {
    const schemas = sources.find(({ name }) => name === "schemas.ts")!.body;
    const descriptions = schemas.slice(schemas.indexOf("TOOL_DESCRIPTIONS"));
    for (const tool of ["open_approach", "attach_evidence", "prepare_submission"]) {
      const start = descriptions.indexOf(`${tool}:`);
      expect(start, tool).toBeGreaterThan(-1);
      const body = descriptions.slice(start, descriptions.indexOf('",\n\n', start));
      expect(body.toLowerCase(), tool).toContain("standing");
    }
    expect(descriptions).toContain("holds no signing key and cannot");
  });
});
