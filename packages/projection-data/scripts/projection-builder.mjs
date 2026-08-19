import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { MultiDirectedGraph } from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { repositoryCheckoutCommand, repositoryRegistry } from "../src/registry.ts";
import { canonicalJson, sha256 } from "../src/canonical.ts";
import { canonicalGitHubRepository, sameRepositoryLocator } from "../src/git-remote.ts";
import { velaGeneratorBinaryRootForPlatform } from "../src/release.ts";
import { currentProjectionContract } from "../src/projection-contract.ts";
import {
  currentProposedStatePreview,
  terminalProposedStatePreview,
  unavailableTerminalProposedStatePreview,
} from "../src/proposed-state-preview.ts";
import {
  buildMathSourceProjection,
  latestRfc3339Instant,
  retainedClaimOccurrencePacket,
  reviewedClaimSubjectOccurrences,
  sourceIdForClaim,
  UNSCOPED_RELEASE_ROOT,
} from "./math-source-projection.mjs";
import {
  problemResolutionConfig,
  problemResolutionEntityRoot,
} from "../src/problem-resolution.ts";

export { canonicalJson, latestRfc3339Instant, sha256 };

const rooted = (value) => ({ ...value, row_root: sha256(canonicalJson(value)) });
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 96 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function assertVelaGeneratorIdentity({
  version,
  binaryRoot,
  requiredVersion = repositoryRegistry.required_vela_version,
  platform = process.platform,
}) {
  assert(version === requiredVersion, `expected ${requiredVersion}, found ${version}`);
  const requiredBinaryRoot = velaGeneratorBinaryRootForPlatform(platform);
  assert(
    binaryRoot === requiredBinaryRoot,
    `expected released Vela binary ${requiredBinaryRoot} for ${platform}, found ${binaryRoot}`,
  );
}

export function sourceNativeProblemCount({ repositorySlug, nativeRecords, sourceDeclarations }) {
  assert(typeof repositorySlug === "string" && repositorySlug.length > 0, "missing exact Repository slug for Problem coverage");
  const sourceCoverage = new Map();
  for (const declaration of sourceDeclarations) {
    if (sourceCoverage.has(declaration.source_id)) {
      throw new Error(`duplicate source declaration for ${declaration.source_id}`);
    }
    /* Candidate rows retain the canonical declaration so its root is computed
       from the exact source object. The database writer flattens that object
       only at insertion time. Accept both representations here because this
       count is computed before insertion, while tests and reconstructed rows
       may already use the flattened database shape. */
    const slugs = (
      declaration.coverage
      ?? declaration.declaration?.coverage
    )?.repository_slugs;
    assert(Array.isArray(slugs), `${declaration.source_id}: missing repository_slugs coverage`);
    sourceCoverage.set(declaration.source_id, new Set(slugs));
  }
  return nativeRecords.filter((record) => (
    record.native_kind === "problem"
    && sourceCoverage.get(record.source_id)?.has(repositorySlug)
  )).length;
}

function json(command, args, cwd) {
  return JSON.parse(run(command, args, cwd));
}

export function normalizeRepositoryCommand(command, cwd) {
  if (typeof command !== "string") return command;
  const checkoutPaths = [...new Set([cwd, realpathSync(cwd)])]
    .sort((left, right) => right.length - left.length);
  return checkoutPaths.reduce(
    (normalized, checkoutPath) => normalized.replaceAll(checkoutPath, "."),
    command,
  );
}

export function readStatus(vela, cwd) {
  const result = spawnSync(vela, ["status", ".", "--json"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 96 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert(!result.error, "Vela status failed to start");
  const status = JSON.parse(result.stdout);
  assert(status?.schema === "vela.status.v4", "unsupported Vela status contract");
  assert(result.status === 0 && status?.ok === true, `${status?.repository?.id ?? "unknown repository"}: Vela status failed`);
  assert(status?.integrity?.replay === "verified", `${status.repository.id}: repository replay is not verified`);
  assert(status?.integrity?.strict === "pass", `${status.repository.id}: repository strict verification did not pass`);
  assert(status?.integrity?.blocker_count === 0, `${status.repository.id}: repository reports strict blockers`);
  assert(
    status?.roots?.origin
      && status?.roots?.repository
      && status?.roots?.authority_keyset
      && status?.roots?.authority_policy,
    `${status.repository.id}: current repository roots are missing`,
  );
  return {
    ...status,
    actions: {
      review: status.actions.review
        ? {
            ...status.actions.review,
            command: normalizeRepositoryCommand(status.actions.review.command, cwd),
          }
        : null,
      work: {
        ...status.actions.work,
        command: normalizeRepositoryCommand(status.actions.work.command, cwd),
      },
    },
  };
}

export function readCoreProjection(vela, cwd) {
  const result = spawnSync(vela, ["projection", ".", "--json"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 96 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert(!result.error, `Vela projection failed to start: ${result.error?.message ?? "unknown error"}`);
  let projection;
  try {
    projection = JSON.parse(result.stdout);
  } catch {
    throw new Error("Vela projection returned non-JSON output");
  }
  if (result.status !== 0) {
    assert(
      projection?.schema === "vela.error.v1"
        && projection.ok === false
        && projection.command === "projection",
      "unsupported Vela projection refusal",
    );
    return { state: "unavailable", error: projection };
  }
  assert(projection?.schema === "vela.repository-projection.v1", "unsupported Vela projection contract");
  assert(projection.ok === true && projection.command === "projection", "Vela projection failed");
  assert(projection.authority_effect === "none", "Vela projection claims authority");
  assert(projection.integrity?.replay === "verified", "Vela projection replay is not verified");
  assert(projection.integrity?.strict === "pass", "Vela projection strict verification did not pass");
  assert(projection.integrity?.blocker_count === 0, "Vela projection reports strict blockers");
  assert(
    projection.projection_root_definition
      === "sha256 of RFC 8785 canonical JSON after removing only projection_root",
    "unsupported Vela projection root definition",
  );
  assert(/^sha256:[0-9a-f]{64}$/u.test(projection.projection_root), "invalid Vela projection root");
  const { projection_root: projectionRoot, ...commitment } = projection;
  assert(sha256(canonicalJson(commitment)) === projectionRoot, "Vela projection root drift");
  assert(
    projection.repository?.repository_id
      && projection.repository.repository_root === projection.roots?.repository
      && projection.repository.origin_root === projection.roots?.origin
      && projection.repository.authority_keyset_root === projection.roots?.authority_keyset
      && projection.repository.authority_policy_root === projection.roots?.authority_policy,
    "Vela projection root bindings are incomplete",
  );
  return { state: "available", projection };
}

export function currentRepositoryFromProjection(projection) {
  assert(projection?.schema === "vela.repository-projection.v1", "unsupported Vela projection contract");
  return {
    repository: {
      repository_id: projection.repository.repository_id,
      origin_root: projection.repository.origin_root,
    },
    origin: {
      origin_id: projection.repository.origin_id,
      repository_id: projection.repository.repository_id,
    },
    claims: projection.claims.map((claim) => ({
      record: claim.record,
      record_root: claim.claim_root,
      source_path: claim.source_path,
      standing: claim.standing,
      active: claim.active,
      proposal_status: claim.proposal_status,
    })),
    proposals: projection.proposals.map((proposal) => ({
      record: proposal.record,
      record_root: proposal.proposal_root,
      source_path: proposal.source_path,
      projection: proposal,
    })),
    submissions: projection.submissions.map((submission) => ({
      object_id: submission.object_id,
      record: submission.payload,
      record_root: submission.object_root,
      source_path: submission.source_path,
      projection: submission,
    })),
    verifications: projection.verifications.map((verification) => ({
      object_id: verification.object_id,
      record: verification.payload,
      record_root: verification.object_root,
      source_path: verification.source_path,
      projection: verification,
    })),
    artifacts: projection.artifacts.map((artifact) => ({ ...artifact })),
  };
}

/* The Repository's history, read from the checkout the builder already has.
 *
 * Record separator first and the path list after a trailing unit separator, so
 * a commit message containing newlines cannot be mistaken for a changed path —
 * the obvious framing (fields, then paths, split on the first newline) silently
 * dropped every machine commit here, because their bodies carry trailers. */
const COMMIT_RS = "\u001e";
const COMMIT_US = "\u001f";

export function readCommits(cwd) {
  const raw = run("git", [
    "log",
    `--format=${COMMIT_RS}%H${COMMIT_US}%P${COMMIT_US}%an${COMMIT_US}%aI${COMMIT_US}%B${COMMIT_US}`,
    "--name-only",
  ], cwd);
  return raw.split(COMMIT_RS).filter((block) => block.trim()).map((block) => {
    const [sha, parents, author, when, message, paths = ""] = block.split(COMMIT_US);
    const trimmed = message.trim();
    const newline = trimmed.indexOf("\n");
    const subject = newline === -1 ? trimmed : trimmed.slice(0, newline);
    return {
      sha,
      /* First parent only. A merge's second parent is a different history and
         the index delta below is against the line this commit continues. */
      parent_sha: (parents ?? "").split(" ").filter(Boolean)[0] ?? null,
      author_name: author,
      committed_at: when,
      subject,
      body: newline === -1 ? "" : trimmed.slice(newline + 1).trim(),
      changed_paths: paths.split("\n").map((path) => path.trim()).filter(Boolean),
      /* Written by the CLI. The five subjects it emits carry `Objects:` and
         `Delta-root:` trailers; everything else is an editorial commit. */
      machine: /^vela: /u.test(subject),
    };
  });
}

const REPOSITORY_INDEX = ".vela/repository.json";
/** Replay each scientific-state commit and its exact parent with the pinned
 * released Core reader. A historical state that current Core cannot replay is
 * retained as unavailable, never promoted from raw Git bytes into an exact
 * Repository revision. */
export function readRepositoryRevisions({
  vela,
  cwd,
  repositoryId,
  commits,
  currentCommit,
  readerVersion,
  readerBinaryRoot,
}) {
  const commitBySha = new Map(commits.map((commit) => [commit.sha, commit]));
  const candidates = new Set([currentCommit]);
  const hasRepositoryIndex = (revision) => {
    const result = spawnSync("git", ["cat-file", "-e", `${revision}:${REPOSITORY_INDEX}`], {
      cwd,
      stdio: "ignore",
    });
    return result.status === 0;
  };
  for (const commit of commits.filter(({ changed_paths }) => changed_paths.includes(REPOSITORY_INDEX))) {
    /* A Git commit that deletes the Repository index is still part of raw Git
       history, but there are no Vela state bytes to replay or root there. It
       therefore is not a Repository Revision row. */
    if (hasRepositoryIndex(commit.sha)) candidates.add(commit.sha);
    if (commit.parent_sha && hasRepositoryIndex(commit.parent_sha)) candidates.add(commit.parent_sha);
  }

  const temporary = mkdtempSync(join(tmpdir(), "vela-problems-revisions-"));
  const checkout = join(temporary, "repository");
  try {
    execFileSync("git", ["clone", "--quiet", "--no-local", "--no-checkout", cwd, checkout], {
      maxBuffer: 96 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return [...candidates].sort().map((commit) => {
      execFileSync("git", ["-c", "core.hooksPath=/dev/null", "checkout", "--quiet", "--detach", "--force", commit], {
        cwd: checkout,
        maxBuffer: 96 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
      /* A read at one historical revision may leave ignored caches or records.
         The next revision must start from Git's exact bytes, not from that
         prior read. This is a disposable mkdtemp clone only. */
      execFileSync("git", ["clean", "-ffdx", "--quiet"], {
        cwd: checkout,
        maxBuffer: 96 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const tree = run("git", ["rev-parse", "HEAD^{tree}"], checkout);
      const indexBytes = readFileSync(join(checkout, REPOSITORY_INDEX));
      const sourceIndexRoot = sha256(indexBytes);
      const coreRead = readCoreProjection(vela, checkout);
      const verified = coreRead.state === "available";
      const projection = verified ? coreRead.projection : null;
      if (projection) {
        assert(projection.git.commit === commit, `${commit}: historical projection commit drift`);
        assert(projection.git.tree === tree, `${commit}: historical projection tree drift`);
        assert(projection.repository.repository_id === repositoryId, `${commit}: historical Repository identity drift`);
        assert(projection.repository.repository_root === sourceIndexRoot, `${commit}: historical Repository root drift`);
      }
      const record = {
        schema: "vela.projection-revision.v1",
        authority_effect: "none",
        identity: {
          repository_id: projection?.repository.repository_id ?? repositoryId,
          git_commit: commit,
          git_tree: tree,
          repository_root: projection?.repository.repository_root ?? null,
        },
        reader: {
          version: readerVersion,
          binary_root: readerBinaryRoot,
          projection_schema: "vela.repository-projection.v1",
          projection_root: projection?.projection_root ?? null,
        },
        replay: verified
          ? { state: "verified", integrity: "strict_pass", blocker_codes: [] }
          : {
              state: "unavailable",
              integrity: "reader_refused",
              blocker_codes: [`vela_error_${coreRead.error.error?.code ?? coreRead.error.error?.kind}`],
            },
        state: verified
          ? {
              accepted_claim_ids: [...projection.handoff.accepted_claim_ids].sort(),
              unassessed_claim_ids: [...projection.handoff.active_pending_claim_ids].sort(),
            }
          : null,
        source_index_root: sourceIndexRoot,
        nonclaims: [
          "A Git commit is not a Vela Decision.",
          "This read projection has no authority effect.",
        ],
      };
      return rooted({
        repository_id: repositoryId,
        git_commit: commit,
        parent_commit: commitBySha.get(commit)?.parent_sha ?? null,
        git_tree: tree,
        source_repository_id: record.identity.repository_id,
        source_index_root: sourceIndexRoot,
        repository_root: projection?.repository.repository_root ?? null,
        replay_state: verified ? "verified" : "unavailable",
        record,
      });
    });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

/* What each commit did to the repository index.
 *
 * `git diff` cannot answer this: the index is one 842KB line, so an accepted
 * Decision reads as a single insertion and a single deletion. Parsing both
 * revisions gives the two-line story instead — one Claim moving from pending to
 * accepted — which is what a Decision actually is. */
export function readRepositoryTransitions(cwd, commits, revisions = []) {
  const revisionByCommit = new Map(revisions.map((revision) => [revision.git_commit, revision]));
  const stateIds = (revision, field) => new Set(revision?.record?.state?.[field] ?? []);
  return commits
    .filter((commit) => commit.changed_paths.includes(REPOSITORY_INDEX))
    .map((commit) => {
      const afterRevision = revisionByCommit.get(commit.sha);
      if (!afterRevision) return null;
      const beforeRevision = commit.parent_sha ? revisionByCommit.get(commit.parent_sha) : null;
      const delta = (field) => {
        const from = stateIds(beforeRevision, field);
        const to = stateIds(afterRevision, field);
        return {
          added: [...to].filter((id) => !from.has(id)),
          removed: [...from].filter((id) => !to.has(id)),
          before: from.size,
          after: to.size,
        };
      };
      const accepted = delta("accepted_claim_ids");
      const pending = delta("unassessed_claim_ids");
      const comparable = beforeRevision?.replay_state === "verified"
        && afterRevision?.replay_state === "verified"
        && beforeRevision.source_repository_id === afterRevision.source_repository_id;
      const semanticDelta = comparable ? {
        schema: "vela.projection-semantic-delta.v1",
        authority_effect: "none",
        before_revision_root: beforeRevision.row_root,
        after_revision_root: afterRevision.row_root,
        before_repository_root: beforeRevision.repository_root,
        after_repository_root: afterRevision.repository_root,
        accepted: {
          added: accepted.added,
          removed: accepted.removed,
          before: accepted.before,
          after: accepted.after,
        },
        unassessed: {
          added: pending.added,
          removed: pending.removed,
          before: pending.before,
          after: pending.after,
        },
        coverage: {
          state: "complete",
          basis: "strict_replay_of_both_exact_revisions",
        },
        nonclaims: [
          "The delta does not make a Decision or change Standing.",
          "Git publication alone does not establish acceptance.",
        ],
      } : null;
      return {
        commit_sha: commit.sha,
        parent_sha: commit.parent_sha,
        repository_root_before: beforeRevision?.source_index_root ?? null,
        repository_root_after: afterRevision.source_index_root,
        accepted_added: accepted.added,
        accepted_removed: accepted.removed,
        pending_added: pending.added,
        pending_removed: pending.removed,
        counts: {
          accepted_before: accepted.before,
          accepted_after: accepted.after,
          pending_before: pending.before,
          pending_after: pending.after,
        },
        comparison_state: comparable ? "verified" : "unavailable",
        before_revision_root: beforeRevision?.row_root ?? null,
        after_revision_root: afterRevision?.row_root ?? null,
        semantic_delta: semanticDelta,
        semantic_delta_root: semanticDelta ? sha256(canonicalJson(semanticDelta)) : null,
      };
    })
    .filter((transition) => transition && transition.repository_root_after);
}

function projectClaim({ record, record_root, source_path, standing }) {
  const source = record.provenance?.[0] ?? null;
  return {
    claim_id: record.claim_id,
    claim_root: record_root,
    standing,
    assertion: record.assertion?.text ?? "",
    assertion_kind: record.assertion?.kind ?? "unknown",
    conditions: record.conditions ?? [],
    created_at: record.created_at ?? null,
    source_title: source?.title ?? null,
    source_type: source?.kind ?? null,
    evidence_count: record.evidence?.length ?? 0,
    imported_object_id: record.imported_from?.object_id ?? null,
    imported_object_root: record.imported_from?.object_root ?? null,
    /* Both flags used to be read out of a `vela.legacy-finding.v1` extension.
       No Claim record in any of the four Repositories carries an `extensions` key
       at all, that extension name appears nowhere else in this repository or in
       the protocol, and nothing writes it — so the read was of a key no
       producer has ever emitted, and the two columns have only ever held
       `false`. They stay because the `disposition` facet is built over them;
       what goes is the pretence that a record could turn them on. */
    contested: false,
    retracted: false,
    source_path,
    record,
  };
}

/** Read the exact Core Decision Inbox at selected historical commits. Current
 * Core may refuse a predecessor layout; that typed refusal is retained as an
 * unavailable preview basis instead of parsing historical repository bytes or
 * recomputing the proposal against current State. */
export function historicalDecisionInboxes({ vela, cwd, revisions }) {
  const requested = [...new Map(revisions.map((revision) => [revision.git_commit, revision])).values()]
    .sort((left, right) => left.git_commit.localeCompare(right.git_commit));
  if (!requested.length) return new Map();
  const temporary = mkdtempSync(join(tmpdir(), "vela-problems-previews-"));
  const checkout = join(temporary, "repository");
  const results = new Map();
  try {
    execFileSync("git", ["clone", "--quiet", "--no-local", "--no-checkout", cwd, checkout], {
      maxBuffer: 96 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const revision of requested) {
      assert(revision.replay_state === "verified" && revision.repository_root,
        `${revision.git_commit}: historical preview base is not strict-replayed`);
      execFileSync("git", ["-c", "core.hooksPath=/dev/null", "checkout", "--quiet", "--detach", "--force", revision.git_commit], {
        cwd: checkout,
        maxBuffer: 96 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
      execFileSync("git", ["clean", "-ffdx", "--quiet"], {
        cwd: checkout,
        maxBuffer: 96 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const coreRead = readCoreProjection(vela, checkout);
      if (coreRead.state === "available") {
        const inbox = coreRead.projection.decision_inbox;
        assert(coreRead.projection.repository.repository_root === revision.repository_root,
          `${revision.git_commit}: historical Core projection Repository root drift`);
        const entries = new Map();
        for (const entry of inbox.entries) {
          assert(!entries.has(entry.proposal_id), `${entry.proposal_id}: duplicate historical Decision Inbox entry`);
          entries.set(entry.proposal_id, entry);
        }
        results.set(revision.git_commit, {
          state: "available",
          projection_root: inbox.projection_root,
          entries,
        });
      } else {
        const payload = coreRead.error;
        results.set(revision.git_commit, {
          state: "unavailable",
          blocker: {
            code: String(payload.error.code ?? payload.error.kind),
            detail: String(payload.error.message),
          },
        });
      }
    }
    return results;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export function projectProposedStatePreviews({
  reviews,
  inbox,
  revisions,
  transitions,
  historical,
  currentCommit,
}) {
  const revisionByCommit = new Map(revisions.map((revision) => [revision.git_commit, revision]));
  const currentRevision = revisionByCommit.get(currentCommit);
  assert(currentRevision?.replay_state === "verified", `${currentCommit}: current preview revision is unavailable`);
  return reviews.map((review) => {
    if (review.status === "pending_review") {
      const entry = inbox.entries.get(review.proposal_id);
      assert(entry, `${review.proposal_id}: current proposed-state preview is missing`);
      return {
        ...review,
        proposed_state_preview: currentProposedStatePreview({
          entry,
          projectionRoot: inbox.projection_root,
          revision: currentRevision,
        }),
      };
    }

    const terminalTransitions = transitions.filter((transition) => (
      transition.pending_removed.includes(review.target)
      && (review.status === "accepted"
        ? transition.accepted_added.includes(review.target)
        : !transition.accepted_added.includes(review.target))
    ));
    assert(terminalTransitions.length === 1,
      `${review.proposal_id}: expected one exact terminal Repository transition`);
    const transition = terminalTransitions[0];
    const base = revisionByCommit.get(transition.parent_sha);
    const terminal = revisionByCommit.get(transition.commit_sha);
    assert(base?.replay_state === "verified" && terminal?.replay_state === "verified",
      `${review.proposal_id}: terminal preview revisions are unavailable`);
    const historicalInbox = historical.get(base.git_commit);
    assert(historicalInbox, `${review.proposal_id}: historical Decision Inbox result is missing`);
    if (review.status === "withdrawn") {
      return {
        ...review,
        proposed_state_preview: unavailableTerminalProposedStatePreview({
          proposalId: review.proposal_id,
          proposalStatus: review.status,
          base,
          terminal,
          blocker: {
            code: "producer_withdrawal_no_decision_preview",
            detail: "The producer withdrew this Proposal. No Repository authority reviewed or applied a Decision Inbox preview.",
          },
        }),
      };
    }
    if (historicalInbox.state === "available") {
      const entry = historicalInbox.entries.get(review.proposal_id);
      if (entry) {
        return {
          ...review,
          proposed_state_preview: terminalProposedStatePreview({
            entry,
            projectionRoot: historicalInbox.projection_root,
            proposalStatus: review.status,
            base,
            terminal,
          }),
        };
      }
    }
    const blocker = historicalInbox.state === "unavailable"
      ? historicalInbox.blocker
      : {
          code: "historical_entry_absent",
          detail: "The exact pre-terminal Decision Inbox did not contain this Proposal.",
        };
    return {
      ...review,
      proposed_state_preview: unavailableTerminalProposedStatePreview({
        proposalId: review.proposal_id,
        proposalStatus: review.status,
        base,
        terminal,
        blocker,
      }),
    };
  });
}

export function projectReviewFromCore(proposal, claimById, transitions) {
  const record = proposal.record;
  const claim = claimById.get(record.subject.id);
  assert(claim && claim.claim_root === record.subject.root, `${proposal.proposal_id}: Core Claim root drift`);
  const retirement = transitions.find((transition) => (
    transition.predecessor_claim_id === record.subject.id
  )) ?? null;
  assert(
    retirement === null || proposal.subject_standing === "superseded",
    `${proposal.proposal_id}: Core retirement Standing drift`,
  );
  assert(
    retirement === null
      || retirement.relation_kind === "corrects"
      || retirement.relation_kind === "supersedes",
    `${proposal.proposal_id}: unsupported Core retirement relation`,
  );
  const decision = proposal.decision;
  const withdrawal = proposal.withdrawal;
  const terminal = decision ?? withdrawal;
  return {
    proposal_id: proposal.proposal_id,
    status: proposal.status,
    kind: record.action,
    target: record.subject.id,
    claim: claim.assertion,
    content_root: record.subject.root,
    receipt_root: record.producer_package?.root ?? null,
    created_at: record.created_at ?? null,
    reviewed_at: decision?.decided_at ?? withdrawal?.created_at ?? null,
    reviewed_by: decision?.actor_id ?? withdrawal?.actor ?? null,
    decision_actor_class: decision?.actor_class ?? null,
    decision_session_ref: decision?.session_ref ?? null,
    decision_authority_principal_id: decision?.authority_principal_id ?? null,
    decision_event_id: decision?.decision_event?.semantic_event_id ?? null,
    decision_plan_root: null,
    decision_provenance: decision ? "signed_record" : withdrawal ? "producer_withdrawal" : "pending",
    applied_event_id: decision?.applied_event?.semantic_event_id ?? null,
    decision_reason: terminal?.reason ?? null,
    decision_packet: proposal.decision_inbox_entry,
    claim_retirement: retirement
      ? retirement.relation_kind === "corrects" ? "corrected" : "superseded"
      : null,
    retired_by_claim_id: retirement?.successor_claim_id ?? null,
  };
}

export function projectCurrentObjects(current) {
  const proposalBySubmission = new Map();
  for (const proposalEntry of current.proposals) {
    const producer = proposalEntry.record.producer_package;
    if (!producer || producer.kind !== "submission") continue;
    assert(!proposalBySubmission.has(producer.id), `${producer.id}: linked by multiple Proposals`);
    proposalBySubmission.set(producer.id, proposalEntry);
  }
  const submissions = current.submissions.map(({ object_id, record, record_root, source_path }) => {
    const proposalEntry = proposalBySubmission.get(object_id);
    assert(proposalEntry, `${object_id}: canonical Submission has no current Proposal`);
    const proposal = proposalEntry.record;
    assert(proposal.producer_package.root === record_root, `${object_id}: Proposal Submission root drift`);
    assert(proposal.producer_package.path === source_path, `${object_id}: Proposal Submission path drift`);
    return {
      submission_id: object_id,
      submission_root: record_root,
      proposal_id: proposalEntry.projection.proposal_id,
      claim_id: proposal.subject.id,
      producer_actor: record.authentication?.identity_binding?.actor_id ?? record.provenance?.producer ?? null,
      submitted_at: record.provenance?.emitted_at ?? proposal.created_at ?? null,
      source_path,
      record,
    };
  });
  const submissionById = new Map(submissions.map((row) => [row.submission_id, row]));

  const verifications = current.verifications.map(({ object_id, record, record_root, source_path, projection }) => {
    const submission = submissionById.get(record.subject?.submission_id);
    assert(submission, `${object_id}: Verification references an unknown Submission`);
    assert(record.subject.submission_root === submission.submission_root, `${object_id}: Submission root drift`);
    assert(record.subject.proposal_id === submission.proposal_id, `${object_id}: Proposal binding drift`);
    assert(record.subject.claim_id === submission.claim_id, `${object_id}: Claim binding drift`);
    const reviewMethod = projection.review_method?.state === "verified"
      ? projection.review_method.method
      : null;
    return {
      verification_record_id: object_id,
      verification_root: record_root,
      submission_id: record.subject.submission_id,
      submission_root: record.subject.submission_root,
      proposal_id: record.subject.proposal_id,
      claim_id: record.subject.claim_id,
      outcome: record.outcome,
      /* The assurance vector's two queryable facts. `scope` is optional on
         `vela.verification-record.v2`, so a record that declares none leaves
         both NULL — which is not the same statement as a record that declared
         an empty list of limitations. */
      property: record.scope?.property ?? null,
      does_not_establish: record.scope?.does_not_establish ?? null,
      verifier_actor: record.identity?.actor_id ?? null,
      reviewer_kind: reviewMethod?.reviewer.kind ?? null,
      reviewer_display_name: reviewMethod?.reviewer.display_name ?? null,
      reviewer_identifier: reviewMethod?.reviewer.identifier ?? null,
      reviewer_provider: reviewMethod?.reviewer.provider ?? null,
      reviewer_version: reviewMethod?.reviewer.version ?? null,
      review_method_root: reviewMethod ? projection.review_method.root : null,
      completed_at: record.completed_at ?? null,
      source_path,
      record,
    };
  });
  return { submissions, verifications };
}

export function currentClaimStandingCounts(claims, repositoryId) {
  const repositoryClaims = claims.filter((claim) => claim.repository_id === repositoryId);
  const accepted_claim_count = repositoryClaims.filter((claim) => claim.standing === "accepted").length;
  const pending_claim_count = repositoryClaims.filter((claim) => claim.standing === "unassessed").length;
  return {
    claim_count: accepted_claim_count + pending_claim_count,
    accepted_claim_count,
    pending_claim_count,
  };
}

function initialPosition(id) {
  const digest = createHash("sha256").update(id).digest();
  const angle = digest.readUInt32BE(0) / 0xffffffff * Math.PI * 2;
  const radius = 1 + digest.readUInt32BE(4) / 0xffffffff * 4;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

const rounded = (value) => Math.round(value * 1e6) / 1e6;

export function projectGraph(slug, repositoriesRoot, current, claims, reviews) {
  const sourceNodes = [];
  const sourceEdges = [];
  const ids = new Set();
  const addNode = (node) => {
    assert(typeof node.id === "string" && !ids.has(node.id), `${slug}: duplicate graph node ${node.id}`);
    ids.add(node.id);
    sourceNodes.push(node);
  };
  const addEdge = (edge) => {
    assert(ids.has(edge.source) && ids.has(edge.target), `${slug}: dangling graph edge ${edge.source} -> ${edge.target}`);
    sourceEdges.push(edge);
  };

  for (const claim of claims) {
    addNode({
      id: claim.claim_id,
      kind: "claim",
      label: claim.assertion,
      plane: "scientific_state",
      trust: claim.standing === "accepted" ? "accepted" : "pending",
      standing: claim.standing,
      claim_root: claim.claim_root,
      assertion_kind: claim.assertion_kind,
      source_title: claim.source_title,
    });
  }
  for (const artifact of current.artifacts) {
    addNode({
      id: `artifact:${artifact.artifact_id}`,
      kind: "artifact",
      label: artifact.artifact_id,
      plane: "evidence",
      trust: "content_addressed",
      standing: "recorded",
      artifact_root: artifact.artifact_root,
      byte_length: artifact.byte_length,
    });
  }
  if (slug === "erdos") {
    const problems = new Map();
    for (const claim of claims) {
      const match = /^erdos_deep:(\d+)$/u.exec(claim.source_title ?? "");
      if (!match) continue;
      const id = `erdos:${match[1]}`;
      assert(!problems.has(id), `${slug}: duplicate canonical problem record ${id}`);
      problems.set(id, claim);
      addNode({
        id,
        kind: "problem",
        label: `Erdős problem ${match[1]}`,
        plane: "scientific_state",
        trust: claim.standing === "accepted" ? "accepted" : "pending",
        standing: claim.standing,
        claim_id: claim.claim_id,
        claim_root: claim.claim_root,
      });
    }
    for (const [id, claim] of problems) {
      addEdge({
        source: id,
        target: claim.claim_id,
        relation: "described_by",
        trust: "canonical_claim",
        source_root: claim.claim_root,
      });
    }
  }
  for (const claim of claims) {
    for (const relation of claim.record.relations ?? []) {
      if (ids.has(relation.target_claim_id)) continue;
      addNode({
        id: relation.target_claim_id,
        kind: "claim_reference",
        label: relation.target_claim_id,
        plane: "scientific_state",
        trust: "referenced_by_current_claim",
        standing: "historical_reference",
      });
    }
    for (const evidence of claim.record.evidence ?? []) {
      const artifactId = evidence.artifact_id ?? evidence.artifact_root?.slice(7);
      assert(artifactId, `${slug}: Claim evidence has no artifact identity`);
      const nodeId = `artifact:${artifactId}`;
      if (ids.has(nodeId)) continue;
      addNode({
        id: nodeId,
        kind: "artifact_reference",
        label: artifactId,
        plane: "evidence",
        trust: "referenced_by_current_claim",
        standing: "historical_reference",
        artifact_root: evidence.artifact_root,
      });
    }
  }
  for (const claim of claims) {
    for (const relation of claim.record.relations ?? []) {
      addEdge({
        source: claim.claim_id,
        target: relation.target_claim_id,
        relation: relation.kind,
        trust: "claim_record",
        source_root: claim.claim_root,
      });
    }
    for (const evidence of claim.record.evidence ?? []) {
      const artifactId = evidence.artifact_id ?? evidence.artifact_root?.slice(7);
      assert(artifactId, `${slug}: Claim evidence has no artifact identity`);
      addEdge({
        source: claim.claim_id,
        target: `artifact:${artifactId}`,
        relation: evidence.relation ?? "evidence",
        trust: "content_addressed",
        source_root: evidence.artifact_root,
      });
    }
  }
  for (const review of reviews) {
    if (!ids.has(review.target)) {
      addNode({
        id: review.target,
        kind: "claim",
        label: review.claim,
        plane: "scientific_state",
        /* `trust` names where the row came from; `standing` is the Claim axis,
           and `review.status` is a Proposal word on it. This node exists only
           because the Proposal's Claim is not in repository state, which is the
           same unaccepted outcome `projectReview` reads as `unassessed` — so it
           says that, and the Proposal keeps its status on its own node below.
           The row is stored whole in `graph_nodes.content`, so the value here
           outlives the recomputation further down and had to be right. */
        trust: review.status,
        standing: "unassessed",
        claim_root: review.content_root,
      });
    }
    addNode({
      id: review.proposal_id,
      kind: "proposal",
      label: review.claim,
      plane: "authority",
      trust: review.decision_provenance,
      standing: review.status,
      proposal_root: review.content_root,
    });
    addEdge({
      source: review.proposal_id,
      target: review.target,
      relation: "proposes",
      trust: review.decision_provenance,
      source_root: review.content_root,
    });
  }

  const source = {
    schema: "site.repository-graph-source.v3",
    repository_id: current.repository.repository_id,
    origin_id: current.origin.origin_id,
    origin_root: current.repository.origin_root,
    repository_root: repositoriesRoot,
    nodes: sourceNodes,
    edges: sourceEdges,
  };
  const sourceRoot = sha256(canonicalJson(source));

  const graph = new MultiDirectedGraph();
  for (const node of sourceNodes) graph.addNode(node.id, { ...initialPosition(node.id), size: 1 });
  sourceEdges.forEach((edge, index) => graph.addEdgeWithKey(`e${index}`, edge.source, edge.target));
  forceAtlas2.assign(graph, {
    iterations: 64,
    settings: {
      ...forceAtlas2.inferSettings(graph),
      barnesHutOptimize: true,
      barnesHutTheta: 0.5,
      strongGravityMode: true,
      gravity: 1,
      scalingRatio: 2,
    },
  });

  const claimById = new Map(claims.map((claim) => [claim.claim_id, claim]));
  const reviewById = new Map(reviews.map((review) => [review.proposal_id, review]));
  const nodes = sourceNodes.map((node) => {
    const claim = node.kind === "claim" ? claimById.get(node.id) : null;
    const review = node.kind === "proposal" ? reviewById.get(node.id) : null;
    /* A Claim node whose Claim is not in repository state has no row to bind
       to, and the tail of this chain answers `recorded` for it — a word on no
       protocol axis, written into the Claim-standing column of nine rows. The
       node already carries the standing `projectGraph` derived for it, so that
       is what the column takes; only a node that declared none falls through. */
    const standing = claim?.standing
      ?? review?.status
      ?? (node.kind === "claim" ? node.standing : null)
      ?? (node.kind === "verifier_attachment" ? "verified" : node.accepted === true ? "accepted" : "recorded");
    const href = claim
      ? `/repositories/${slug}/claims/${claim.claim_id}`
      : slug === "erdos" && node.kind === "problem" && /^erdos:\d+$/u.test(node.id)
        ? `/repositories/erdos/problems/${node.id.slice(6)}`
        : review
          ? `/repositories/${slug}/proposals?proposal=${encodeURIComponent(node.id)}`
          : null;
    return rooted({
      node_id: node.id,
      kind: node.kind,
      label: node.label ?? node.id,
      plane: node.plane ?? null,
      trust: node.trust ?? null,
      standing,
      href,
      x: rounded(graph.getNodeAttribute(node.id, "x")),
      y: rounded(graph.getNodeAttribute(node.id, "y")),
      content: node,
    });
  });
  const edges = sourceEdges.map((edge, index) => rooted({
    edge_id: `edge_${sha256(`${index}:${canonicalJson(edge)}`).slice(7, 31)}`,
    source_id: edge.source,
    target_id: edge.target,
    relation: edge.relation,
    trust: edge.trust ?? null,
    inferred: Boolean(edge.inferred),
    source_root: edge.source_root ?? null,
    evidence: edge.evidence ?? null,
  }));
  const layoutRoot = sha256(canonicalJson(
    nodes.map(({ node_id, x, y }) => ({ node_id, x, y })).sort((a, b) => a.node_id.localeCompare(b.node_id)),
  ));
  return {
    metadata: {
      schema: "site.repository-graph-projection.v2",
      source_path: ".vela/repository.json + canonical records",
      source_sha256: sourceRoot,
      source_repository_root: repositoriesRoot,
      layout_root: layoutRoot,
      node_count: nodes.length,
      edge_count: edges.length,
      problem_count: nodes.filter((node) => node.kind === "problem").length,
      claim_count: nodes.filter((node) => node.kind === "claim").length,
    },
    nodes,
    edges,
  };
}

export const frontierProjectionSchema = "site.frontier-projection.v1";
export const frontierBasisClasses = Object.freeze([
  "source_asserted",
  "mechanically_verified",
  "authority_decided",
  "exact_derivation",
  "heuristic_advisory",
]);

const occurrenceEdgeRef = (occurrence) => `${occurrence.source_id}/${occurrence.native_id}`;

function nativeRecordBasisRef(record) {
  return {
    kind: "native_record",
    source_id: record.source_id,
    native_id: record.native_id,
    native_kind: record.native_kind,
    content_root: record.content_root ?? null,
    row_root: record.row_root,
  };
}

/**
 * One typed frontier edge per retained relationship the builder already holds
 * in memory. Every edge names the retained record that justifies its basis
 * class in `basis_ref`; nothing here reads a network, infers an equivalence,
 * or upgrades a heuristic grouping past what a reviewed packet decided.
 *
 * `claimProblemBindings` maps a Claim to the reviewed resolver entity its
 * accepted occurrence packet names. It is the only path that sets
 * `problem_entity_id` on Claim-anchored edges: a classifier match on titles or
 * numbers is navigation, not identity, so a Claim without a packet keeps NULL
 * rather than borrowing an entity it was never bound to.
 */
export function projectFrontierEdges({
  claims,
  reviews,
  verifications,
  transitions,
  nativeRecords,
  sourceDeclarations,
  resolutionConfig = problemResolutionConfig,
  claimProblemBindings = new Map(),
  classifySourceId = sourceIdForClaim,
}) {
  const edges = new Map();
  const addEdge = ({
    repository_id = null,
    problem_entity_id = null,
    source_kind,
    source_ref,
    source_root = null,
    target_kind,
    target_ref,
    target_root = null,
    relation,
    basis,
    basis_ref,
    nonclaims = [],
  }) => {
    assert(frontierBasisClasses.includes(basis), `frontier edge ${relation} carries unknown basis ${basis}`);
    assert(
      basis_ref !== null && typeof basis_ref === "object" && !Array.isArray(basis_ref),
      `frontier edge ${relation} ${source_ref} -> ${target_ref} names no retained basis record`,
    );
    const identity = {
      repository_id,
      problem_entity_id,
      source_kind,
      source_ref,
      target_kind,
      target_ref,
      relation,
    };
    const row = {
      edge_id: `edge_${sha256(canonicalJson(identity)).slice(7, 39)}`,
      problem_entity_id,
      repository_id,
      source_kind,
      source_ref,
      source_root,
      target_kind,
      target_ref,
      target_root,
      relation,
      basis,
      basis_ref,
      nonclaims,
    };
    const existing = edges.get(row.edge_id);
    if (existing) {
      /* The same relationship stated twice from the same records is one edge;
         the same identity with a different basis or root is a derivation bug. */
      assert(
        canonicalJson(existing) === canonicalJson(row),
        `frontier edge identity collision: ${relation} ${source_ref} -> ${target_ref}`,
      );
      return;
    }
    edges.set(row.edge_id, row);
  };

  /* Resolver-grouped occurrences. The canonical occurrence is the Source's own
     assertion of which Problem it states; every other reviewed occurrence is a
     navigation grouping whose equivalence nobody has established — unless an
     accepted Claim's occurrence packet bound it, which is a Decision. */
  const nativeByIdentity = new Map(
    nativeRecords.map((record) => [`${record.source_id}\0${record.native_id}`, record]),
  );
  const packetBoundOccurrences = new Map();
  for (const [claimId, binding] of claimProblemBindings) {
    for (const occurrence of binding.occurrences) {
      packetBoundOccurrences.set(
        `${binding.entity_id}\0${occurrence.source_id}\0${occurrence.native_id}`,
        { claim_id: claimId, ...binding },
      );
    }
  }
  for (const entity of resolutionConfig.entities) {
    const canonical = nativeByIdentity.get(
      `${entity.canonical_occurrence.source_id}\0${entity.canonical_occurrence.native_id}`,
    );
    if (canonical) {
      addEdge({
        problem_entity_id: entity.entity_id,
        source_kind: "occurrence",
        source_ref: occurrenceEdgeRef(canonical),
        source_root: canonical.row_root,
        target_kind: "problem",
        target_ref: entity.entity_id,
        relation: "occurrence_of",
        basis: "source_asserted",
        basis_ref: nativeRecordBasisRef(canonical),
      });
    }
    for (const occurrence of entity.reviewed_occurrences) {
      const record = nativeByIdentity.get(`${occurrence.source_id}\0${occurrence.native_id}`);
      /* No retained record, no edge: an occurrence the release does not carry
         has no bytes for basis_ref to name. */
      if (!record) continue;
      if (occurrence.relation_kind === "formal_statement_reference") {
        addEdge({
          problem_entity_id: entity.entity_id,
          source_kind: "occurrence",
          source_ref: occurrenceEdgeRef(record),
          source_root: record.row_root,
          target_kind: "problem",
          target_ref: entity.entity_id,
          relation: "formalizes",
          basis: "source_asserted",
          basis_ref: nativeRecordBasisRef(record),
        });
      }
      const bound = packetBoundOccurrences.get(
        `${entity.entity_id}\0${occurrence.source_id}\0${occurrence.native_id}`,
      );
      addEdge({
        problem_entity_id: entity.entity_id,
        source_kind: "occurrence",
        source_ref: occurrenceEdgeRef(record),
        source_root: record.row_root,
        target_kind: "problem",
        target_ref: entity.entity_id,
        relation: "grouped_with",
        basis: bound ? "authority_decided" : "heuristic_advisory",
        basis_ref: bound
          ? {
              kind: "claim_occurrence_packet",
              claim_id: bound.claim_id,
              claim_root: bound.claim_root,
              packet_root: bound.packet_root,
              entity_id: entity.entity_id,
            }
          : {
              kind: "reviewed_resolver_entity",
              entity_id: entity.entity_id,
              entity_root: problemResolutionEntityRoot(entity),
            },
        nonclaims: bound ? [] : ["semantic equivalence not established"],
      });
    }
  }

  const problemEntityForClaim = (claimId) => claimProblemBindings.get(claimId)?.entity_id ?? null;
  const claimByKey = new Map(claims.map((claim) => [`${claim.repository_id}\0${claim.claim_id}`, claim]));

  for (const claim of claims) {
    const problemEntityId = problemEntityForClaim(claim.claim_id);
    const accepted = claim.standing === "accepted";
    const acceptingReview = accepted
      ? reviews.find((review) => (
          review.repository_id === claim.repository_id
          && review.target === claim.claim_id
          && review.status === "accepted"
        )) ?? null
      : null;
    for (const evidence of claim.record?.evidence ?? []) {
      const artifactId = evidence.artifact_id ?? evidence.artifact_root?.slice(7);
      assert(artifactId, `${claim.claim_id}: Claim evidence has no artifact identity`);
      addEdge({
        repository_id: claim.repository_id,
        problem_entity_id: problemEntityId,
        source_kind: "artifact",
        source_ref: artifactId,
        source_root: evidence.artifact_root ?? null,
        target_kind: "claim",
        target_ref: claim.claim_id,
        target_root: claim.claim_root,
        relation: "evidence_for",
        basis: accepted ? "authority_decided" : "source_asserted",
        basis_ref: accepted
          ? acceptingReview
            ? {
                kind: "decision_event",
                proposal_id: acceptingReview.proposal_id,
                decision_event_id: acceptingReview.decision_event_id,
                applied_event_id: acceptingReview.applied_event_id,
                claim_id: claim.claim_id,
                claim_root: claim.claim_root,
              }
            /* Accepted with no retained Proposal row — the accepted Claim
               record under the current Repository root is the retained fact. */
            : {
                kind: "accepted_claim_record",
                claim_id: claim.claim_id,
                claim_root: claim.claim_root,
                standing: claim.standing,
              }
          : {
              kind: "claim_record",
              claim_id: claim.claim_id,
              claim_root: claim.claim_root,
              standing: claim.standing,
            },
      });
    }
    for (const relation of claim.record?.relations ?? []) {
      if (relation.kind !== "corrects" && relation.kind !== "supersedes") continue;
      const retiringReview = reviews.find((review) => (
        review.repository_id === claim.repository_id
        && review.retired_by_claim_id === claim.claim_id
        && review.target === relation.target_claim_id
      )) ?? null;
      addEdge({
        repository_id: claim.repository_id,
        problem_entity_id: problemEntityId,
        source_kind: "claim",
        source_ref: claim.claim_id,
        source_root: claim.claim_root,
        target_kind: "claim",
        target_ref: relation.target_claim_id,
        target_root: claimByKey.get(`${claim.repository_id}\0${relation.target_claim_id}`)?.claim_root ?? null,
        relation: relation.kind,
        basis: "authority_decided",
        basis_ref: retiringReview
          ? {
              kind: "decision_event",
              proposal_id: retiringReview.proposal_id,
              decision_event_id: retiringReview.decision_event_id,
              claim_retirement: retiringReview.claim_retirement,
              claim_id: claim.claim_id,
              claim_root: claim.claim_root,
            }
          : {
              kind: "claim_record",
              claim_id: claim.claim_id,
              claim_root: claim.claim_root,
              standing: claim.standing,
            },
      });
    }
    const sourceId = classifySourceId(claim);
    if (sourceId !== null) {
      const declaration = sourceDeclarations.find((row) => row.source_id === sourceId) ?? null;
      assert(declaration, `${claim.claim_id}: external dependency ${sourceId} has no retained Source declaration`);
      addEdge({
        repository_id: claim.repository_id,
        problem_entity_id: problemEntityId,
        source_kind: "claim",
        source_ref: claim.claim_id,
        source_root: claim.claim_root,
        target_kind: "external_reference",
        target_ref: sourceId,
        target_root: declaration.declaration_root,
        relation: "external_dependency",
        basis: "source_asserted",
        basis_ref: {
          kind: "source_declaration",
          source_id: sourceId,
          declaration_root: declaration.declaration_root,
          claim_id: claim.claim_id,
          claim_root: claim.claim_root,
        },
      });
    }
  }

  /* Proposal edges exist only where a signed Decision does. A pending or
     withdrawn Proposal has no decision provenance to rest an edge on, so it
     contributes nothing here rather than a weaker basis it never earned. */
  for (const review of reviews) {
    if (review.decision_provenance !== "signed_record") continue;
    const problemEntityId = problemEntityForClaim(review.target);
    const decisionRef = {
      kind: "decision_event",
      proposal_id: review.proposal_id,
      status: review.status,
      decision_event_id: review.decision_event_id,
      applied_event_id: review.applied_event_id,
      reviewed_by: review.reviewed_by,
      decision_actor_class: review.decision_actor_class,
    };
    addEdge({
      repository_id: review.repository_id,
      problem_entity_id: problemEntityId,
      source_kind: "claim",
      source_ref: review.target,
      source_root: review.content_root ?? null,
      target_kind: "proposal",
      target_ref: review.proposal_id,
      relation: "proposed_by",
      basis: "authority_decided",
      basis_ref: decisionRef,
    });
    addEdge({
      repository_id: review.repository_id,
      problem_entity_id: problemEntityId,
      source_kind: "proposal",
      source_ref: review.proposal_id,
      target_kind: "claim",
      target_ref: review.target,
      target_root: review.content_root ?? null,
      relation: "decided_by",
      basis: "authority_decided",
      basis_ref: decisionRef,
    });
  }

  for (const verification of verifications) {
    addEdge({
      repository_id: verification.repository_id,
      problem_entity_id: problemEntityForClaim(verification.claim_id),
      source_kind: "submission",
      source_ref: verification.submission_id,
      source_root: verification.submission_root,
      target_kind: "verification",
      target_ref: verification.verification_record_id,
      target_root: verification.verification_root,
      relation: "verified_by",
      basis: "mechanically_verified",
      basis_ref: {
        kind: "verification_record",
        verification_record_id: verification.verification_record_id,
        verification_root: verification.verification_root,
        proposal_id: verification.proposal_id,
        outcome: verification.outcome,
        property: verification.property ?? null,
      },
      /* The record's own declared limits ride along, so a reader never takes a
         scoped check for more than the scope it stated. */
      nonclaims: (verification.does_not_establish ?? []).map(String),
    });
  }

  for (const transition of transitions) {
    if (transition.comparison_state !== "verified") continue;
    for (const [change, claimIds] of [
      ["accepted_added", transition.accepted_added],
      ["accepted_removed", transition.accepted_removed],
    ]) {
      for (const claimId of claimIds) {
        addEdge({
          repository_id: transition.repository_id,
          problem_entity_id: problemEntityForClaim(claimId),
          source_kind: "transition",
          source_ref: transition.commit_sha,
          source_root: transition.semantic_delta_root,
          target_kind: "claim",
          target_ref: claimId,
          target_root: claimByKey.get(`${transition.repository_id}\0${claimId}`)?.claim_root ?? null,
          relation: "state_change",
          basis: "exact_derivation",
          basis_ref: {
            kind: "semantic_delta",
            semantic_delta_root: transition.semantic_delta_root,
            repository_root_before: transition.repository_root_before,
            repository_root_after: transition.repository_root_after,
            before_revision_root: transition.before_revision_root,
            after_revision_root: transition.after_revision_root,
            change,
          },
        });
      }
    }
  }

  return [...edges.values()].sort((left, right) => left.edge_id.localeCompare(right.edge_id));
}

export function frontierProjectionManifestBlock(frontierEdges) {
  return {
    schema: frontierProjectionSchema,
    edge_count: frontierEdges.length,
    basis_counts: Object.fromEntries(frontierBasisClasses.map((basis) => [
      basis,
      frontierEdges.filter((edge) => edge.basis === basis).length,
    ])),
  };
}

function tableRoot(rows) {
  return sha256(canonicalJson(rows.map((row) => row.row_root).sort()));
}

export function buildProjection({
  repositoriesRoot,
  vela,
  requiredVersion = repositoryRegistry.required_vela_version,
  sourceAdapterBundles,
  sourceAdapterArtifact,
}) {
  assert(sourceAdapterArtifact, "retained source-adapter artifact reference is required");
  const version = run(vela, ["--version"], repositoriesRoot);
  const velaPath = run("which", [vela], repositoriesRoot);
  const velaBinaryRoot = sha256(readFileSync(velaPath));
  assertVelaGeneratorIdentity({
    version,
    binaryRoot: velaBinaryRoot,
    requiredVersion,
  });
  const tables = {
    repositories: [],
    claims: [],
    reviews: [],
    submissions: [],
    verifications: [],
    graph_nodes: [],
    graph_edges: [],
    search_documents: [],
    commits: [],
    repository_revisions: [],
    repository_transitions: [],
    frontier_edges: [],
    source_declarations: [],
    source_observations: [],
    native_records: [],
    release_sources: [],
    repository_source_bindings: [],
  };
  const repositoryMaterials = [];
  const repositoryRows = [];

  for (const entry of repositoryRegistry.repositories) {
    const cwd = join(repositoriesRoot, entry.directory);
    const head = run("git", ["rev-parse", "HEAD"], cwd);
    const tree = run("git", ["rev-parse", "HEAD^{tree}"], cwd);
    const remote = run("git", ["remote", "get-url", "origin"], cwd);
    const remoteHead = run("git", ["rev-parse", `origin/${entry.branch}`], cwd);
    const dirty = run("git", ["status", "--porcelain=v1", "--untracked-files=all"], cwd);
    assert(remoteHead === head, `${entry.slug}: source is not at origin/${entry.branch}`);
    /* Any declared locator, not an operator-supplied lookalike. The current
       public Math boundary declares one canonical GitHub locator. */
    assert(
      entry.remotes.some((locator) => sameRepositoryLocator(remote, locator)),
      `${entry.slug}: origin ${remote} is not a declared locator (${entry.remotes.join(", ")})`,
    );
    assert(dirty === "", `${entry.slug}: source checkout is dirty`);

    const status = readStatus(vela, cwd);
    assert(status.repository.id === entry.repository_id, `${entry.slug}: repository identity drift`);
    assert(status.git.commit === head && status.git.tree === tree, `${entry.slug}: Git identity drift`);
    const coreRead = readCoreProjection(vela, cwd);
    assert(coreRead.state === "available", `${entry.slug}: current Core projection is unavailable`);
    const coreProjection = coreRead.projection;
    assert(coreProjection.repository.repository_id === entry.repository_id, `${entry.slug}: Core projection Repository drift`);
    assert(coreProjection.git.commit === head && coreProjection.git.tree === tree, `${entry.slug}: Core projection Git drift`);
    assert(coreProjection.repository.repository_root === status.roots.repository, `${entry.slug}: Core/status Repository root drift`);
    const current = currentRepositoryFromProjection(coreProjection);
    const decisionPackets = {
      entries: new Map(coreProjection.decision_inbox.entries.map((entry) => [entry.proposal_id, entry])),
      projection_root: coreProjection.decision_inbox.projection_root,
    };
    const commits = readCommits(cwd);
    const revisions = readRepositoryRevisions({
      vela,
      cwd,
      repositoryId: entry.repository_id,
      commits,
      currentCommit: head,
      readerVersion: version,
      readerBinaryRoot: velaBinaryRoot,
    });
    const transitions = readRepositoryTransitions(cwd, commits, revisions);
    const claims = current.claims.map(projectClaim);
    const claimById = new Map(claims.map((claim) => [claim.claim_id, claim]));
    let reviews = current.proposals
      .map((proposal) => projectReviewFromCore(proposal.projection, claimById, coreProjection.transitions))
      .sort((a, b) => (b.reviewed_at ?? b.created_at ?? "").localeCompare(a.reviewed_at ?? a.created_at ?? ""));
    const revisionByCommit = new Map(revisions.map((revision) => [revision.git_commit, revision]));
    const terminalTargets = new Set(reviews
      .filter(({ status: proposalStatus }) => proposalStatus !== "pending_review")
      .map(({ target }) => target));
    const terminalBases = transitions
      .filter((transition) => transition.pending_removed.some((target) => terminalTargets.has(target)))
      .map((transition) => revisionByCommit.get(transition.parent_sha))
      .filter(Boolean);
    const historicalPreviews = historicalDecisionInboxes({ vela, cwd, revisions: terminalBases });
    reviews = projectProposedStatePreviews({
      reviews,
      inbox: decisionPackets,
      revisions,
      transitions,
      historical: historicalPreviews,
      currentCommit: head,
    });
    const currentObjects = projectCurrentObjects(current);
    const graph = projectGraph(entry.slug, status.roots.repository, current, claims, reviews);
    const committedAt = run("git", ["show", "-s", "--format=%cI", "HEAD"], cwd);
    const reproduce = {
      clone: repositoryCheckoutCommand(entry),
      checkout: `git checkout ${head}`,
      command: "vela replay . --json",
    };

    /* Rooted after the loop, not here: `problem_count` counts source-native
       problem records, and those are built once every Repository's materials
       exist. Everything else about the row is known now. */
    repositoryRows.push({
      repository_id: status.repository.id,
      name: status.repository.name,
      /* Still one URL, deliberately. `source_remote` is a published column and
         `rooted()` hashes the row including its keys, so widening it here would
         move every published row root for a continuity gain the reader does not
         need. Access policy is declared by the checked registry; the URL is a
         locator and never implies anonymous access. */
      source_remote: entry.remotes[0],
      source_commit: head,
      source_tree: tree,
      committed_at: committedAt,
      origin_id: current.origin.origin_id,
      origin_root: status.roots.origin,
      repository_root: status.roots.repository,
      authority_keyset_root: status.roots.authority_keyset,
      authority_policy_root: status.roots.authority_policy,
      graph_source_root: graph.metadata?.source_sha256 ?? null,
      graph_layout_root: graph.metadata?.layout_root ?? null,
      graph_node_count: graph.metadata?.node_count ?? 0,
      graph_edge_count: graph.metadata?.edge_count ?? 0,
      /* `graph_` is the qualifier, not a leftover: this counts Claim-kind graph
         NODES, and `source_repositories.claim_count` beside it counts rows in the
         Claims table. They differ — a Proposal whose Claim is not in repository
         state still gets a node — so collapsing the two onto one name would
         merge two numbers that are allowed to disagree. Neither reaches a
         reader; `repositoryFromRows` serves this one as `claim_count`.

         (This used to say the name was stuck behind a two-phase change because
         the CI gate ran before the refresh. That ordering was reversed — the
         gate now runs `needs: refresh` for exactly that reason — so nothing is
         blocking the name. It stays because it is the right name.) */
      graph_claim_count: graph.metadata?.claim_count ?? 0,
      status,
      reproduce,
    });
    tables.claims.push(...claims.map((row) => rooted({ repository_id: entry.repository_id, ...row })));
    tables.reviews.push(...reviews.map((row) => rooted({ repository_id: entry.repository_id, ...row })));
    tables.submissions.push(...currentObjects.submissions.map((row) => rooted({ repository_id: entry.repository_id, ...row })));
    tables.verifications.push(...currentObjects.verifications.map((row) => rooted({ repository_id: entry.repository_id, ...row })));
    tables.graph_nodes.push(...graph.nodes.map(({ row_root: _root, ...row }) => rooted({ repository_id: entry.repository_id, ...row })));
    tables.graph_edges.push(...graph.edges.map(({ row_root: _root, ...row }) => rooted({ repository_id: entry.repository_id, ...row })));

    const searchRows = [
      {
        kind: "repository",
        document_id: status.repository.id,
        assertion: status.repository.name,
        source_title: status.repository.name,
        standing: "strict_pass",
        href: `/repositories/${entry.slug}`,
      },
      ...claims.map((claim) => ({
        kind: "claim",
        document_id: claim.claim_id,
        assertion: claim.assertion,
        source_title: claim.source_title,
        standing: claim.standing,
        href: `/repositories/${entry.slug}/claims/${claim.claim_id}`,
      })),
      /* Claim nodes are excluded because the `claims` mapping above already
         emits one search row per Claim, with the source title and the ledger
         href a graph node has neither of. Both write kind `claim`, and the
         table is keyed on (release_root, repository_id, kind, document_id), so
         without this the two would collide rather than duplicate. */
      ...graph.nodes.filter((node) => node.kind !== "claim").map((node) => ({
        kind: node.kind,
        document_id: node.node_id,
        assertion: node.label,
        source_title: null,
        standing: node.standing,
        href: node.href ?? `/graph?repository=${entry.slug}&node=${encodeURIComponent(node.node_id)}`,
      })),
    ];
    /* No `search_text` here. It restated the three fields above it and is now a
       generated column, so the schema derives it from the row it belongs to
       rather than this file deciding it in a second language. */
    /* The Repository's own history, from the checkout this loop already has open
       and already runs git in. */
    tables.commits.push(...commits.map((commit) => rooted({ repository_id: entry.repository_id, ...commit })));
    tables.repository_revisions.push(...revisions);
    tables.repository_transitions.push(...transitions
      .map((transition) => rooted({ repository_id: entry.repository_id, ...transition })));

    tables.search_documents.push(...searchRows.map((record) => rooted({
      repository_id: entry.repository_id,
      ...record,
    })));
    repositoryMaterials.push({
      slug: entry.slug,
      directory: cwd,
      head,
      tree,
      committed_at: committedAt,
      status,
      current,
      claims,
      graph,
    });
  }

  const sourceProjection = buildMathSourceProjection(
    repositoryMaterials,
    UNSCOPED_RELEASE_ROOT,
    sourceAdapterBundles,
    sourceAdapterArtifact,
  );
  Object.assign(tables, sourceProjection.tables);
  tables.repositories.push(...repositoryRows.map((row) => rooted({
    ...row,
    /* The exact Source declaration owns Repository coverage. Counting through
       it keeps this manifest gate aligned with the Problem reader when a
       release eventually carries more than one Repository. */
    problem_count: sourceNativeProblemCount({
      repositorySlug: repositoryRegistry.repositories.find(
        (entry) => entry.repository_id === row.repository_id,
      )?.slug,
      nativeRecords: tables.native_records,
      sourceDeclarations: tables.source_declarations,
    }),
  })));
  /* Frontier edges come last: they read the Claim, Proposal, Verification,
     transition and Source rows the loop and the source projection already
     produced, and add no new observation of their own. The packet bindings are
     the one file read — the same retained occurrence Artifacts the source
     projection just verified for its Claim bindings. */
  const claimProblemBindings = new Map();
  for (const material of repositoryMaterials) {
    for (const claim of material.claims) {
      const retained = retainedClaimOccurrencePacket(material, claim);
      if (!retained) continue;
      claimProblemBindings.set(claim.claim_id, {
        claim_root: claim.claim_root,
        entity_id: retained.packet.occurrence_resolution.entity_id,
        packet_root: retained.artifact_root,
        occurrences: reviewedClaimSubjectOccurrences(claim, retained.packet),
      });
    }
  }
  tables.frontier_edges.push(...projectFrontierEdges({
    claims: tables.claims,
    reviews: tables.reviews,
    verifications: tables.verifications,
    transitions: tables.repository_transitions,
    nativeRecords: tables.native_records,
    sourceDeclarations: tables.source_declarations,
    claimProblemBindings,
  }).map((row) => rooted(row)));

  const table_roots = Object.fromEntries(
    Object.entries(tables).map(([name, rows]) => [name, tableRoot(rows)]),
  );
  const source_repositories = tables.repositories.map((repository) => ({
    repository_id: repository.repository_id,
    commit: repository.source_commit,
    tree: repository.source_tree,
    origin_id: repository.origin_id,
    origin_root: repository.origin_root,
    repository_root: repository.repository_root,
    authority_keyset_root: repository.authority_keyset_root,
    authority_policy_root: repository.authority_policy_root,
    ...currentClaimStandingCounts(tables.claims, repository.repository_id),
    review_count: tables.reviews.filter((row) => row.repository_id === repository.repository_id).length,
    submission_count: tables.submissions.filter((row) => row.repository_id === repository.repository_id).length,
    verification_count: tables.verifications.filter((row) => row.repository_id === repository.repository_id).length,
    graph_source_root: repository.graph_source_root,
    graph_layout_root: repository.graph_layout_root,
    graph_node_count: repository.graph_node_count,
    graph_edge_count: repository.graph_edge_count,
    problem_count: repository.problem_count,
    graph_claim_count: repository.graph_claim_count,
  }));
  const generatedAt = latestRfc3339Instant(
    tables.repositories.map((row) => row.committed_at),
  );
  const manifestBody = {
    schema: currentProjectionContract.manifestSchema,
    generated_at: generatedAt,
    vela_version: version,
    vela_binary_sha256: velaBinaryRoot,
    table_roots,
    source_repositories,
    source_registry: sourceProjection.source_registry,
    frontier_projection: frontierProjectionManifestBlock(tables.frontier_edges),
  };
  const release_root = sha256(canonicalJson(manifestBody));
  const scopedSourceProjection = buildMathSourceProjection(
    repositoryMaterials,
    release_root,
    sourceAdapterBundles,
    sourceAdapterArtifact,
  );
  assert(
    scopedSourceProjection.source_registry.observation_bundle_root
      === sourceProjection.source_registry.observation_bundle_root,
    "Math source observation root changed under release scoping",
  );
  for (const [name, rows] of Object.entries(scopedSourceProjection.tables)) {
    assert(tableRoot(rows) === table_roots[name], `${name}: table root changed under release scoping`);
  }
  Object.assign(tables, scopedSourceProjection.tables);
  return {
    manifest: {
      ...manifestBody,
      activation_time: new Date().toISOString(),
      release_root,
    },
    tables,
  };
}
