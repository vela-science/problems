import { NextResponse } from "next/server";
import { getProblemActivity, scientificAnchorRoot, type ScientificAnchor } from "@vela/activity-data";
import { authConfiguration } from "@/lib/auth";
import { currentActivityAccount } from "@/lib/hosted-account";
import { scientificProblemState } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";

/* The Workspace as it stands right now, for the caller's own account.
 *
 * The Work section renders this server-side, which is enough for a person: they
 * act, the page revalidates, they see the result. It is not enough for a tool
 * that has just created an Approach and needs the id it was given, so this
 * route answers the same question on demand.
 *
 * It reads. It takes no parameters that could change anything, it is scoped to
 * the signed-in account by `getProblemActivity` rather than by anything in the
 * query string, and a caller who names someone else's Workspace gets their own
 * empty answer, not theirs. */

const privateHeaders = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
  Vary: "Cookie",
};

export async function GET(request: Request) {
  if (!authConfiguration().enabled) {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: privateHeaders });
  }
  const account = await currentActivityAccount();
  if (!account) {
    return NextResponse.json({ status: "signed_out" }, { status: 401, headers: privateHeaders });
  }

  const query = new URL(request.url).searchParams;
  const repository = query.get("repository") ?? "";
  const problem = query.get("problem") ?? "";
  const workspaceId = query.get("workspace") ?? "";
  if (!repository || !problem || !workspaceId) {
    return NextResponse.json(
      { status: "invalid", detail: "repository, problem and workspace are all required" },
      { status: 400, headers: privateHeaders },
    );
  }

  const state = await scientificProblemState(repository, problem);
  if (!state) {
    return NextResponse.json({ status: "not_found" }, { status: 404, headers: privateHeaders });
  }
  const anchor = state.anchor as ScientificAnchor;
  const activity = await getProblemActivity({
    accountId: account.activity.id,
    workspaceId,
    repositoryId: anchor.repositoryId,
    problemId: anchor.problemId,
    currentAnchorRoot: scientificAnchorRoot(anchor),
  });

  /* Projected, not passed through. The stored activity carries account ids,
     CRDT payloads and audit rows that a tool has no use for and a browser has
     no business holding. */
  return NextResponse.json({
    approaches: activity.approaches.map(({ id, title, version }) => ({ id, title, version })),
    attempts: activity.attempts.map(({ id, approachId, title, state: attemptState }) => ({
      id, approachId, title, state: attemptState,
    })),
    artifacts: activity.artifacts.map(({ id, attemptId, kind, path, contentRoot }) => ({
      id, attemptId, kind, path, contentRoot,
    })),
    drafts: activity.drafts.map(({ id, payloadRoot, version, createdAt }) => ({
      id, payloadRoot, version, createdAt,
    })),
  }, { headers: privateHeaders });
}
