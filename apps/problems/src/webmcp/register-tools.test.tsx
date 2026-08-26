import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ account: { status: "signed_in" as string } }));
vi.mock("@/app/actions/activity", () => ({
  addDiscussionAction: vi.fn(), attachArtifactAction: vi.fn(), createApproachAction: vi.fn(),
  createAttemptAction: vi.fn(), saveSubmissionDraftAction: vi.fn(),
}));
vi.mock("@/components/vela/account-state", () => ({ useAccountState: () => mocks.account }));

import { RegisterProblemTools } from "./register-tools";
import type { WebMcpProblemContext } from "./context";

function context(problem: string): WebMcpProblemContext {
  return {
    schema: "vela.webmcp-problem-context.v1",
    route: `/problems/erdos-problems/${problem}`,
    repository: "math", problem, collection: "Erdős problems",
    label: `Erdős problem ${problem}`, question: "?", statement_kind: "prose",
    declared_status: "open", formalized: true, tags: [],
    release_root: `sha256:${"a".repeat(64)}`, anchor_root: `sha256:${"d".repeat(64)}`,
    problem_record_root: `sha256:${"e".repeat(64)}`, repository_root: `sha256:${"f".repeat(64)}`,
    source_commit: "0".repeat(40), current_claim_id: null, claims: [], sources: [], search: null,
  };
}

type Registered = { name: string; aborted: boolean };

function installModelContext() {
  const registered: Registered[] = [];
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      registerTool: async (tool: { name: string }, options?: { signal?: AbortSignal }) => {
        const entry: Registered = { name: tool.name, aborted: false };
        options?.signal?.addEventListener("abort", () => { entry.aborted = true; });
        registered.push(entry);
      },
    },
  });
  return registered;
}

function removeModelContext() {
  Reflect.deleteProperty(document, "modelContext");
}

afterEach(() => { removeModelContext(); vi.clearAllMocks(); });
beforeEach(() => { mocks.account = { status: "signed_in" }; });

describe("tool registration follows the open Problem", () => {
  it("registers the eight tools once", async () => {
    const registered = installModelContext();
    render(<RegisterProblemTools context={context("321")} accountsEnabled workspaceId="ws_1" />);
    await waitFor(() => expect(registered).toHaveLength(8));
    expect(registered.map(({ name }) => name).sort()).toEqual([
      "attach_evidence", "inspect_candidate", "inspect_claim", "inspect_history",
      "inspect_problem", "open_approach", "prepare_submission", "search_problems",
    ]);
  });

  it("does not accumulate registrations when the same state re-renders", async () => {
    const registered = installModelContext();
    const view = render(<RegisterProblemTools context={context("321")} accountsEnabled workspaceId="ws_1" />);
    await waitFor(() => expect(registered).toHaveLength(8));
    /* A fresh object with identical contents, which is what a server re-render
       produces. Comparing by identity here would re-register all eight. */
    view.rerender(<RegisterProblemTools context={context("321")} accountsEnabled workspaceId="ws_1" />);
    await waitFor(() => expect(registered).toHaveLength(8));
    expect(registered.every(({ aborted }) => !aborted)).toBe(true);
  });

  it("aborts the previous Problem's tools when the reader navigates", async () => {
    const registered = installModelContext();
    const view = render(<RegisterProblemTools context={context("321")} accountsEnabled workspaceId="ws_1" />);
    await waitFor(() => expect(registered).toHaveLength(8));

    view.rerender(<RegisterProblemTools context={context("887")} accountsEnabled workspaceId="ws_1" />);
    await waitFor(() => expect(registered).toHaveLength(16));

    /* The first eight are aborted and the second eight are live. Without this,
       `inspect_problem` would keep answering about 321 — confidently, with
       exact roots, on a page showing 887. */
    expect(registered.slice(0, 8).every(({ aborted }) => aborted)).toBe(true);
    expect(registered.slice(8).every(({ aborted }) => !aborted)).toBe(true);
  });

  it("unregisters everything on unmount", async () => {
    const registered = installModelContext();
    const view = render(<RegisterProblemTools context={context("321")} accountsEnabled workspaceId="ws_1" />);
    await waitFor(() => expect(registered).toHaveLength(8));
    view.unmount();
    await waitFor(() => expect(registered.every(({ aborted }) => aborted)).toBe(true));
  });
});

describe("a browser without WebMCP gets the ordinary site", () => {
  it("renders nothing and throws nothing when the API is absent", () => {
    removeModelContext();
    const view = render(<RegisterProblemTools context={context("321")} accountsEnabled workspaceId="ws_1" />);
    expect(view.container.innerHTML).toBe("");
  });

  it("stays silent when the API exists but rejects registration", async () => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool: async () => { throw new Error("unsupported"); } },
    });
    const view = render(<RegisterProblemTools context={context("321")} accountsEnabled workspaceId="ws_1" />);
    await waitFor(() => expect(view.container.innerHTML).toBe(""));
  });

  it("registers read and write tools alike when signed out, so refusals explain themselves", async () => {
    mocks.account = { status: "signed_out" };
    const registered = installModelContext();
    render(<RegisterProblemTools context={context("321")} accountsEnabled workspaceId={null} />);
    await waitFor(() => expect(registered).toHaveLength(8));
    expect(registered.map(({ name }) => name)).toContain("prepare_submission");
  });
});
