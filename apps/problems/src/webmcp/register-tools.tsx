"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDiscussionAction,
  attachArtifactAction,
  createApproachAction,
  createAttemptAction,
  saveSubmissionDraftAction,
} from "@/app/actions/activity";
import { useAccountState } from "@/components/vela/account-state";
import type { WebMcpProblemContext, WebMcpWorkContext } from "./context";
import {
  attachEvidenceSchema,
  inspectCandidateSchema,
  inspectClaimSchema,
  inspectHistorySchema,
  inspectProblemSchema,
  openApproachSchema,
  prepareSubmissionSchema,
  searchProblemsSchema,
  TOOL_DESCRIPTIONS,
} from "./schemas";
import {
  attachEvidence,
  inspectCandidate,
  inspectClaim,
  inspectHistory,
  inspectProblem,
  openApproach,
  prepareSubmission,
  searchProblems,
  type ProblemActivitySnapshot,
  type ToolEnvironment,
} from "./tools";
import type { ToolResult } from "./results";

/* The browser API, described only as far as this file uses it.
 *
 * `document.modelContext`, not `navigator.modelContext` — the API moved because
 * tools belong to a page rather than to the browsing context, and the navigator
 * spelling was deprecated in Chrome 150. Typing it locally rather than pulling
 * a package keeps the dependency surface honest about how young this API is. */
type ModelContextTool = {
  name: string;
  description: string;
  inputSchema: unknown;
  execute: (input: never, options?: { signal?: AbortSignal }) => Promise<ToolResult> | ToolResult;
};

type ModelContext = {
  registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => Promise<unknown>;
};

function modelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;
  const candidate = (document as unknown as { modelContext?: unknown }).modelContext;
  if (!candidate || typeof candidate !== "object") return null;
  const register = (candidate as { registerTool?: unknown }).registerTool;
  return typeof register === "function" ? candidate as ModelContext : null;
}

async function readActivity(context: WebMcpProblemContext, workspaceId: string): Promise<ProblemActivitySnapshot> {
  const params = new URLSearchParams({
    repository: context.repository,
    problem: context.problem,
    workspace: workspaceId,
  });
  const response = await fetch(`/api/work?${params}`, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`workspace read returned HTTP ${response.status}`);
  const value = await response.json() as Partial<ProblemActivitySnapshot>;
  if (
    !Array.isArray(value.approaches) || !Array.isArray(value.attempts)
    || !Array.isArray(value.artifacts) || !Array.isArray(value.drafts)
  ) throw new Error("workspace read is not a valid activity snapshot");
  return value as ProblemActivitySnapshot;
}

/**
 * Registers this Problem's tools with the browser agent, and unregisters them
 * when the reader leaves.
 *
 * Cleanup is the part that is easy to skip and expensive to skip. Problems
 * navigate client-side, so without an abort on unmount a reader who moves from
 * 321 to 887 would leave a live `inspect_problem` still answering about 321 —
 * confidently, and with exact roots, which is the worst way to be wrong. The
 * AbortController is created per effect run and aborted in its cleanup, which
 * also makes React's development double-invoke a no-op rather than a duplicate
 * registration.
 *
 * Renders nothing, and does nothing at all where the API is absent. A browser
 * without WebMCP gets the ordinary site.
 */
export function RegisterProblemTools({ context, accountsEnabled, workspaceId }: {
  context: WebMcpProblemContext;
  accountsEnabled: boolean;
  workspaceId: string | null;
}) {
  const account = useAccountState();
  const [registered, setRegistered] = useState<string[]>([]);

  /* Compared by value, not by identity. The server sends a fresh object on
     every render, so depending on it directly would tear down and re-register
     eight tools each time. Round-tripping through the serialised form gives one
     stable object per distinct state, which is exactly the granularity at which
     the tools should be re-registered. */
  const contextKey = useMemo(() => JSON.stringify(context), [context]);
  const stableContext = useMemo<WebMcpProblemContext>(() => JSON.parse(contextKey) as WebMcpProblemContext, [contextKey]);

  const work: WebMcpWorkContext = useMemo(() => ({
    accountsEnabled,
    signedIn: account.status === "signed_in",
    workspaceId,
  }), [accountsEnabled, account.status, workspaceId]);

  useEffect(() => {
    const host = modelContext();
    if (!host) return;

    const controller = new AbortController();
    const environment: ToolEnvironment = {
      problem: stableContext,
      work,
      actions: {
        createApproach: createApproachAction,
        createAttempt: createAttemptAction,
        attachArtifact: attachArtifactAction,
        addDiscussion: addDiscussionAction,
        saveSubmissionDraft: saveSubmissionDraftAction,
      },
      readActivity: () => readActivity(stableContext, work.workspaceId ?? ""),
      idempotencyKey: () => crypto.randomUUID(),
    };

    const tools: ModelContextTool[] = [
      {
        name: "inspect_problem",
        description: TOOL_DESCRIPTIONS.inspect_problem,
        inputSchema: inspectProblemSchema,
        execute: () => inspectProblem(environment),
      },
      {
        name: "inspect_claim",
        description: TOOL_DESCRIPTIONS.inspect_claim,
        inputSchema: inspectClaimSchema,
        execute: (input: { claim_id?: string }) => inspectClaim(environment, input ?? {}),
      },
      {
        name: "inspect_history",
        description: TOOL_DESCRIPTIONS.inspect_history,
        inputSchema: inspectHistorySchema,
        execute: () => inspectHistory(environment),
      },
      {
        name: "search_problems",
        description: TOOL_DESCRIPTIONS.search_problems,
        inputSchema: searchProblemsSchema,
        execute: (input: { query: string; standing?: string; limit?: number }) =>
          searchProblems(environment, input),
      },
      {
        name: "open_approach",
        description: TOOL_DESCRIPTIONS.open_approach,
        inputSchema: openApproachSchema,
        execute: (input: { title: string; summary: string; attempt_title: string }) =>
          openApproach(environment, input),
      },
      {
        name: "attach_evidence",
        description: TOOL_DESCRIPTIONS.attach_evidence,
        inputSchema: attachEvidenceSchema,
        execute: (input: Parameters<typeof attachEvidence>[1]) => attachEvidence(environment, input),
      },
      {
        name: "prepare_submission",
        description: TOOL_DESCRIPTIONS.prepare_submission,
        inputSchema: prepareSubmissionSchema,
        execute: (input: Record<string, string>) => prepareSubmission(environment, input),
      },
      {
        name: "inspect_candidate",
        description: TOOL_DESCRIPTIONS.inspect_candidate,
        inputSchema: inspectCandidateSchema,
        execute: (input: { draft_id?: string }) => inspectCandidate(environment, input ?? {}),
      },
    ];

    let live = true;
    void Promise.all(tools.map((tool) => host.registerTool(tool, { signal: controller.signal })))
      .then(() => { if (live) setRegistered(tools.map(({ name }) => name)); })
      /* A browser that exposes the object but rejects the call is a browser
         without working WebMCP. The site is unaffected either way, so this
         stays silent rather than logging on every page load. */
      .catch(() => { if (live) setRegistered([]); });

    return () => {
      live = false;
      controller.abort();
      setRegistered([]);
    };
  }, [stableContext, work]);

  /* A registration this page can prove, for the person driving the demo and
     for anyone checking the claim. Off unless asked for, so it costs the
     ordinary reader nothing. */
  if (!registered.length || typeof window === "undefined") return null;
  if (!new URLSearchParams(window.location.search).has("webmcp")) return null;
  return (
    <aside
      aria-label="Registered agent tools"
      className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border bg-card/95 p-3 text-meta shadow-lg backdrop-blur"
    >
      <p className="text-eyebrow text-muted-foreground">WebMCP · {registered.length} tools</p>
      <p className="mt-1 font-mono text-micro break-all text-muted-foreground">{context.anchor_root.slice(0, 26)}…</p>
      <ul className="mt-2 space-y-0.5 font-mono text-micro">
        {registered.map((name) => <li key={name}>{name}</li>)}
      </ul>
    </aside>
  );
}
