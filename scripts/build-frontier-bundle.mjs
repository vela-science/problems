import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
  readFileSync(join(root, "config/frontiers.v1.json"), "utf8"),
);
const frontierRoot = resolve(
  process.env.VELA_FRONTIERS_ROOT ?? join(root, ".."),
);
const vela = process.env.VELA_BIN ?? "vela";

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function json(command, args, cwd) {
  return JSON.parse(run(command, args, cwd));
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function projectFinding(finding) {
  return {
    id: finding.id,
    assertion: finding.assertion?.text ?? "",
    assertion_type: finding.assertion?.type ?? "unknown",
    conditions: finding.conditions?.text ?? "",
    created: finding.created ?? null,
    updated: finding.updated ?? null,
    source_title: finding.provenance?.title ?? null,
    source_type: finding.provenance?.source_type ?? null,
    reviewed: Boolean(finding.provenance?.review?.reviewed),
    contested: Boolean(finding.flags?.contested),
    retracted: Boolean(finding.flags?.retracted),
    evidence_count: finding.evidence?.evidence_spans?.length ?? 0,
  };
}

function projectReview(proposal, compactById, decisionByProposal) {
  const compact = compactById.get(proposal.id);
  const decision = decisionByProposal.get(proposal.id);
  const receiptRoot = proposal.payload?.vela_submission?.receipt_root ?? null;
  assert(
    decision?.receipt_root === undefined || decision.receipt_root === receiptRoot,
    `${proposal.id}: proposal and Decision Plan Receipt roots disagree`,
  );
  const claim =
    compact?.claim || proposal.payload?.finding?.assertion?.text || proposal.reason || "";
  return {
    proposal_id: proposal.id,
    status: proposal.status,
    kind: proposal.kind,
    target: compact?.target ?? proposal.target?.id ?? "",
    claim,
    content_root: compact?.content_root ?? decision?.proposal_root ?? null,
    receipt_root: receiptRoot,
    created_at: proposal.created_at ?? null,
    reviewed_at: proposal.reviewed_at ?? null,
    reviewed_by: proposal.reviewed_by ?? null,
    decision_event_id: decision?.event_id ?? null,
    decision_plan_root: decision?.decision_plan_root ?? null,
    decision_provenance: decision
      ? "signed_event"
      : proposal.status === "pending_review"
        ? "pending"
        : "legacy_materialized",
    applied_event_id: proposal.applied_event_id ?? null,
    decision_reason: proposal.decision_reason ?? null,
  };
}

const version = run(vela, ["--version"], root);
assert(
  version === config.required_vela_version,
  `expected ${config.required_vela_version}, found ${version}`,
);
const velaPath = run("which", [vela], root);
const velaBinaryRoot = sha256(readFileSync(velaPath));

const frontiers = config.frontiers.map((entry) => {
  const cwd = join(frontierRoot, entry.directory);
  const head = run("git", ["rev-parse", "HEAD"], cwd);
  const tree = run("git", ["rev-parse", "HEAD^{tree}"], cwd);
  const branch = run("git", ["branch", "--show-current"], cwd);
  const remote = run("git", ["remote", "get-url", "origin"], cwd);
  const remoteHead = run("git", ["rev-parse", "origin/main"], cwd);
  const dirty = run(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    cwd,
  );
  assert(branch === "main", `${entry.slug}: source is not on main`);
  assert(head === entry.commit, `${entry.slug}: configured source pin is stale`);
  assert(remoteHead === head, `${entry.slug}: source is not at origin/main`);
  assert(remote === entry.remote, `${entry.slug}: origin does not match config`);
  assert(dirty === "", `${entry.slug}: source checkout is dirty`);

  const status = json(vela, ["status", ".", "--json"], cwd);
  const offers = json(vela, ["next", ".", "--limit", "20", "--json"], cwd);
  const reviews = json(
    vela,
    ["review", "list", ".", "--limit", "10000", "--json"],
    cwd,
  );
  const state = JSON.parse(readFileSync(join(cwd, "frontier.json"), "utf8"));

  assert(status.schema === "vela.status.v1", `${entry.slug}: unsupported status`);
  assert(offers.schema === "vela.offer.v1", `${entry.slug}: unsupported offers`);
  assert(reviews.schema === "vela.review.v1", `${entry.slug}: unsupported reviews`);
  assert(status.git.clean, `${entry.slug}: Vela reports a dirty source`);
  assert(status.git.commit === head, `${entry.slug}: status commit drift`);
  assert(status.git.tree === tree, `${entry.slug}: status tree drift`);
  assert(status.frontier.id === state.frontier_id, `${entry.slug}: frontier ID drift`);
  assert(
    status.roots.event_log === state._meta?.event_log_hash,
    `${entry.slug}: event root disagreement`,
  );
  assert(
    status.roots.snapshot === state._meta?.snapshot_hash,
    `${entry.slug}: snapshot root disagreement`,
  );
  assert(
    offers.event_log_root === status.roots.event_log,
    `${entry.slug}: offer event root disagreement`,
  );
  assert(
    reviews.event_log_root === status.roots.event_log,
    `${entry.slug}: review event root disagreement`,
  );
  assert(
    reviews.proposal_state_root === status.roots.proposals,
    `${entry.slug}: proposal root disagreement`,
  );
  assert(
    status.counts.findings === state.findings.length &&
      status.counts.events === state.events.length,
    `${entry.slug}: compact counts disagree with materialized state`,
  );
  assert(
    reviews.total === status.counts.pending_review &&
      reviews.items.length === status.counts.pending_review,
    `${entry.slug}: missing review data`,
  );

  for (const offer of offers.targets) {
    const packet = readFileSync(join(cwd, offer.packet.path));
    assert(
      sha256(packet) === offer.packet.sha256,
      `${entry.slug}: packet root drift for ${offer.target_id}`,
    );
  }

  const compactById = new Map(
    reviews.items.map((review) => [review.proposal_id, review]),
  );
  const decisionByProposal = new Map(
    state.events
      .filter((event) =>
        event.kind === "review.accepted" ||
        event.kind === "review.rejected" ||
        event.kind === "review.revision_requested" ||
        event.kind === "proposal.withdrawn",
      )
      .map((event) => {
        const decisionRef = event.payload?.provenance?.input_refs?.find(
          (reference) => typeof reference === "string" &&
            reference.startsWith("urn:vela:decision-root:sha256:"),
        );
        let decisionPlan = null;
        if (decisionRef) {
          const decisionPlanRoot = decisionRef.slice("urn:vela:decision-root:".length);
          assert(/^sha256:[0-9a-f]{64}$/.test(decisionPlanRoot), `${event.id}: malformed Decision Plan root`);
          const decisionPath = join(
            cwd,
            "records",
            "decision-evidence",
            "decision-root",
            `${decisionPlanRoot.slice("sha256:".length)}.json`,
          );
          decisionPlan = JSON.parse(readFileSync(decisionPath, "utf8"));
          const answer = decisionPlan.ordered_answers?.find(
            (item) => item.proposal_id === (event.payload?.proposal_id ?? event.target?.id),
          );
          const facts = decisionPlan.consumed_fact_roots?.find(
            (item) => item.proposal_id === (event.payload?.proposal_id ?? event.target?.id),
          );
          assert(answer, `${event.id}: Decision Plan omits its proposal answer`);
          assert(facts, `${event.id}: Decision Plan omits its consumed proposal facts`);
          assert(answer.reason === event.reason, `${event.id}: Decision Plan reason drift`);
          decisionPlan = {
            root: decisionPlanRoot,
            proposal_root: answer.proposal_root,
            receipt_root: facts.receipt_root,
          };
        }
        return [
          event.payload?.proposal_id ?? event.target?.id,
          {
            event_id: event.id,
            decision_plan_root: decisionPlan?.root ?? null,
            proposal_root: decisionPlan?.proposal_root ?? null,
            receipt_root: decisionPlan?.receipt_root ?? undefined,
          },
        ];
      }),
  );
  const committedAt = run("git", ["show", "-s", "--format=%cI", "HEAD"], cwd);
  const researchRuns = (entry.research_runs ?? []).map((researchRun) => {
    const proposal = state.proposals.find(
      (candidate) => candidate.id === researchRun.proposal_id,
    );
    assert(proposal, `${entry.slug}: research run proposal is missing`);
    assert(
      proposal.status === researchRun.status,
      `${entry.slug}: research run proposal standing drift`,
    );
    assert(
      proposal.payload?.vela_submission?.receipt_root === researchRun.receipt_root,
      `${entry.slug}: research run Receipt root drift`,
    );
    assert(
      researchRun.route === "defer" && researchRun.accepted_event_delta === 0,
      `${entry.slug}: research run exceeds the read-only site authority ceiling`,
    );
    return researchRun;
  });
  return {
    slug: entry.slug,
    source: { remote, commit: head, tree, committed_at: committedAt },
    published_snapshot_at: committedAt,
    status,
    offers: offers.targets,
    reviews: state.proposals
      .map((proposal) => projectReview(proposal, compactById, decisionByProposal))
      .sort((a, b) =>
        (b.reviewed_at ?? b.created_at ?? "").localeCompare(
          a.reviewed_at ?? a.created_at ?? "",
        ),
      ),
    findings: state.findings.map(projectFinding),
    research_runs: researchRuns,
    reproduce: {
      clone: `git clone ${remote}`,
      checkout: `git checkout ${head}`,
      command: "vela reproduce .",
    },
  };
});

const generatedAt = frontiers
  .map((frontier) => frontier.source.committed_at)
  .sort()
  .at(-1);
const bundle = {
  schema: "site.frontier-bundle.v1",
  generated_at: generatedAt,
  generator: {
    vela_version: version,
    vela_binary_sha256: velaBinaryRoot,
  },
  frontiers,
};
const bundleBytes = `${JSON.stringify(bundle, null, 2)}\n`;
writeFileSync(join(root, "data/site-frontier-bundle.v1.json"), bundleBytes);
const bundleManifest = {
  schema: "site.frontier-bundle-manifest.v1",
  bundle_sha256: sha256(bundleBytes),
  generated_at: generatedAt,
  vela_version: version,
  vela_binary_sha256: velaBinaryRoot,
  source_frontiers: frontiers.map((frontier) => ({
    slug: frontier.slug,
    commit: frontier.source.commit,
    tree: frontier.source.tree,
    event_log_root: frontier.status.roots.event_log,
    snapshot_root: frontier.status.roots.snapshot,
    proposal_root: frontier.status.roots.proposals,
    finding_count: frontier.findings.length,
    review_count: frontier.reviews.length,
  })),
};
writeFileSync(
  join(root, "data/site-frontier-bundle-manifest.v1.json"),
  `${JSON.stringify(bundleManifest, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    ok: true,
    schema: bundle.schema,
    generated_at: generatedAt,
    vela: version,
    vela_binary_sha256: velaBinaryRoot,
    frontiers: frontiers.map((frontier) => ({
      slug: frontier.slug,
      commit: frontier.source.commit,
      event_root: frontier.status.roots.event_log,
      findings: frontier.findings.length,
      offers: frontier.offers.length,
      reviews: frontier.reviews.length,
    })),
  }),
);
