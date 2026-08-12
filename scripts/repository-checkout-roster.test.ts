import { describe, expect, test } from "bun:test";
import { YAML } from "bun";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { repositoryRegistry } from "../packages/observatory-data/src/registry";

/*
  The composite checkout action names one repository and one path. The registry
  names the same one, as `remotes` and `directory`, and everything downstream of
  the checkout reads them from there.

  So the roster is written twice. Consolidating the two workflow copies into
  the action was the right move and its description then claimed the roster
  "is written here once", which was not true the moment it was written: the
  registry had already been declaring it. A composite action cannot loop
  `uses:` steps, and replacing the SHA-pinned `actions/checkout` with a raw
  `git clone` would trade a supply-chain property for tidiness. What it can do
  is stop the copy from drifting, which is all the duplication actually costs.

  It was four of each until the four topic repositories collapsed into one
  derived Repository, and this file went on saying four for a while after — which
  is the argument for the assertions below rather than for the paragraph above:
  a count in prose goes stale silently, and `expected` is read from the registry
  on every run.

  The registry is the declaration. This holds the action to it, so adding a
  second Repository to `registry.ts` reddens here until the action agrees, and no
  edit to either file can leave the projection reading a directory CI never
  checked out.
*/

const ACTION = resolve(import.meta.dirname, "../.github/actions/checkout-repositories/action.yml");
const WORKFLOW_DIRECTORY = resolve(import.meta.dirname, "../.github/workflows");
const WORKFLOWS = readdirSync(WORKFLOW_DIRECTORY)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .map((name) => resolve(WORKFLOW_DIRECTORY, name));

type WorkflowStep = {
  name?: string;
  uses?: string;
  with?: Record<string, string | boolean | number>;
  env?: Record<string, string>;
};

function workflowSteps(document: string): WorkflowStep[] {
  const parsed = YAML.parse(document) as {
    jobs?: Record<string, { steps?: WorkflowStep[] }>;
  };
  return Object.values(parsed.jobs ?? {}).flatMap(({ steps }) => steps ?? []);
}

/** One `with:` value per step, in file order. Steps here carry no anchors or
 *  block scalars, so a line match is exact for them. */
function values(document: string, key: string): string[] {
  return document
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith(`${key}:`))
    .map((line) => line.slice(key.length + 1).trim());
}

describe("canonical Repository checkout roster", () => {
  const action = readFileSync(ACTION, "utf8");

  /* The first locator. `actions/checkout` takes one `owner/name` on GitHub, so
     this holds the action to the locator a reader is shown; the mirrors exist
     for rebuilding when that host is not reachable, which is not a thing this
     action can do at all. */
  const expected = repositoryRegistry.repositories.map(({ remotes, directory }) => ({
    repository: new URL(remotes[0]).pathname.replace(/^\//u, "").replace(/\.git$/u, ""),
    path: `sources/${directory}`,
  }));

  test("checks out exactly the repositories the registry declares", () => {
    const checkedOut = values(action, "repository").map((repository, index) => ({
      repository,
      path: values(action, "path")[index],
    }));
    expect(checkedOut.toSorted((a, b) => a.path.localeCompare(b.path))).toEqual(
      expected.toSorted((a, b) => a.path.localeCompare(b.path)),
    );
  });

  test("checks each one out at full depth", () => {
    // The projection reads Git history to bind records to commits; a shallow
    // clone produces a projection that is wrong rather than one that fails.
    const depths = values(action, "fetch-depth");
    expect(depths).toEqual(expected.map(() => "0"));
  });

  test("uses no dedicated Math credential and drops the job token after checkout", () => {
    expect(action).not.toContain("math-read-token");
    expect(values(action, "ref")).toEqual(["main"]);
    expect(values(action, "token")).toEqual([]);
    expect(values(action, "persist-credentials")).toEqual(["false"]);
    expect(action).not.toContain("VELA_MATH_READ_TOKEN");
    expect(action).not.toMatch(/https?:\/\/[^\s]*\$\{\{/u);
  });

  test("every current workflow invocation supplies no dedicated Math credential", () => {
    const documents = WORKFLOWS.map((path) => readFileSync(path, "utf8"));
    const invocations = documents.flatMap((workflow) => workflowSteps(workflow).filter(
      ({ uses }) => uses === "./.github/actions/checkout-repositories",
    ));
    expect(invocations).toHaveLength(4);
    for (const invocation of invocations) {
      expect(invocation.with).toBeUndefined();
      expect(invocation.env).toBeUndefined();
    }
    const secretReferences = documents.flatMap((document) => (
      document.match(/\$\{\{ secrets\.VELA_MATH_READ_TOKEN \}\}/gu) ?? []
    ));
    expect(secretReferences).toHaveLength(0);
  });

  test("reconstruction acquires public Math before retained-input verification", () => {
    const path = resolve(WORKFLOW_DIRECTORY, "reconstruct-projection.yml");
    const workflow = readFileSync(path, "utf8");
    const parsed = YAML.parse(workflow) as {
      jobs: {
        reconstruct: {
          env?: Record<string, string>;
          steps: WorkflowStep[];
        };
      };
    };
    const job = parsed.jobs.reconstruct;
    const checkoutIndex = job.steps.findIndex(
      ({ uses }) => uses === "./.github/actions/checkout-repositories",
    );
    const downloadIndex = job.steps.findIndex(
      ({ name }) => name === "Read and download the reconstruction's retained inputs",
    );
    expect(checkoutIndex).toBeGreaterThan(-1);
    expect(downloadIndex).toBeGreaterThan(checkoutIndex);
    expect(job.steps[checkoutIndex]?.with).toBeUndefined();
    expect(JSON.stringify(job.env ?? {})).not.toContain("VELA_MATH_READ_TOKEN");
  });
});
