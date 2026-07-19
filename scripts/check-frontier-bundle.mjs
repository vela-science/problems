import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = process.env.VELA_SITE_BUNDLE_PATH ?? join(root, "data/site-frontier-bundle.v1.json");
const manifestPath = process.env.VELA_SITE_BUNDLE_MANIFEST_PATH ?? join(root, "data/site-frontier-bundle-manifest.v1.json");
const configPath = process.env.VELA_SITE_FRONTIER_CONFIG_PATH ?? join(root, "config/frontiers.v1.json");
const bundleBytes = readFileSync(bundlePath);
const bundle = JSON.parse(bundleBytes.toString("utf8"));
const manifest = JSON.parse(
  readFileSync(manifestPath, "utf8"),
);
const config = JSON.parse(
  readFileSync(configPath, "utf8"),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRoot(value) {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

assert(bundle.schema === "site.frontier-bundle.v1", "unsupported bundle schema");
assert(
  manifest.schema === "site.frontier-bundle-manifest.v1",
  "unsupported bundle manifest schema",
);
assert(manifest.bundle_sha256 === sha256(bundleBytes), "bundle manifest root drift");
assert(manifest.generated_at === bundle.generated_at, "bundle manifest time drift");
assert(
  manifest.vela_version === bundle.generator.vela_version &&
    manifest.vela_binary_sha256 === bundle.generator.vela_binary_sha256,
  "bundle manifest generator drift",
);
assert(
  bundle.generator.vela_version === config.required_vela_version,
  "unsupported Vela version",
);
assert(isRoot(bundle.generator.vela_binary_sha256), "invalid Vela binary root");
assert(
  bundle.frontiers.length === config.frontiers.length,
  "missing configured frontier",
);

const slugs = new Set();
for (const frontier of bundle.frontiers) {
  const source = config.frontiers.find((entry) => entry.slug === frontier.slug);
  assert(source, `${frontier.slug}: not configured`);
  assert(!slugs.has(frontier.slug), `${frontier.slug}: duplicate slug`);
  slugs.add(frontier.slug);
  assert(source.commit === frontier.source.commit, `${frontier.slug}: stale source pin`);
  assert(source.remote === frontier.source.remote, `${frontier.slug}: remote drift`);
  assert(frontier.status.schema === "vela.status.v1", `${frontier.slug}: bad status`);
  assert(frontier.status.git.clean === true, `${frontier.slug}: dirty status`);
  assert(
    frontier.status.git.commit === frontier.source.commit &&
      frontier.status.git.tree === frontier.source.tree,
    `${frontier.slug}: Git identity disagreement`,
  );
  for (const value of Object.values(frontier.status.roots)) {
    assert(isRoot(value), `${frontier.slug}: malformed root`);
  }
  assert(
    frontier.status.counts.findings === frontier.findings.length,
    `${frontier.slug}: finding count disagreement`,
  );
  assert(
    frontier.status.counts.pending_review ===
      frontier.reviews.filter((review) => review.status === "pending_review").length,
    `${frontier.slug}: missing review data`,
  );
  const findingIds = new Set();
  for (const finding of frontier.findings) {
    assert(!findingIds.has(finding.id), `${frontier.slug}: duplicate finding ID`);
    findingIds.add(finding.id);
  }
  const reviewIds = new Set();
  for (const review of frontier.reviews) {
    assert(!reviewIds.has(review.proposal_id), `${frontier.slug}: duplicate review ID`);
    reviewIds.add(review.proposal_id);
    if (review.content_root !== null) {
      assert(isRoot(review.content_root), `${frontier.slug}: malformed review root`);
    }
    if (review.receipt_root !== null) {
      assert(isRoot(review.receipt_root), `${frontier.slug}: malformed Receipt root`);
    }
    if (review.decision_plan_root !== null) {
      assert(isRoot(review.decision_plan_root), `${frontier.slug}: malformed Decision Plan root`);
    }
    const expectedProvenance = review.decision_event_id
      ? "signed_event"
      : review.status === "pending_review"
        ? "pending"
        : "legacy_materialized";
    assert(
      review.decision_provenance === expectedProvenance,
      `${frontier.slug}: review decision provenance disagrees with its event and standing`,
    );
  }
  for (const offer of frontier.offers) {
    assert(isRoot(offer.packet.sha256), `${frontier.slug}: malformed packet root`);
  }
  for (const researchRun of frontier.research_runs ?? []) {
    for (const key of [
      "mission_root",
      "evidence_root",
      "artifact_root",
      "verifier_root",
      "receipt_root",
    ]) {
      assert(isRoot(researchRun[key]), `${frontier.slug}: malformed research run ${key}`);
    }
    assert(researchRun.route === "defer", `${frontier.slug}: research run route is not Defer`);
    assert(
      researchRun.accepted_event_delta === 0,
      `${frontier.slug}: research run changed accepted state`,
    );
    const proposal = frontier.reviews.find(
      (review) => review.proposal_id === researchRun.proposal_id,
    );
    assert(proposal, `${frontier.slug}: research run proposal projection is missing`);
    assert(proposal.status === researchRun.status, `${frontier.slug}: research run standing drift`);
    assert(
      proposal.receipt_root === researchRun.receipt_root,
      `${frontier.slug}: research run Receipt projection drift`,
    );
  }
  for (const expected of source.required_decisions ?? []) {
    const decision = frontier.reviews.find(
      (review) => review.proposal_id === expected.proposal_id,
    );
    assert(decision, `${frontier.slug}: required decision ${expected.proposal_id} is missing`);
    assert(decision.status === expected.status, `${frontier.slug}: required decision status drift`);
    assert(decision.content_root === expected.proposal_root, `${frontier.slug}: required proposal root drift`);
    assert(decision.receipt_root === expected.receipt_root, `${frontier.slug}: required Receipt root drift`);
    assert(decision.decision_event_id === expected.decision_event_id, `${frontier.slug}: required decision event drift`);
    assert(decision.decision_plan_root === expected.decision_plan_root, `${frontier.slug}: required Decision Plan root drift`);
    assert(decision.decision_reason === expected.reason, `${frontier.slug}: required decision reason drift`);
    assert(decision.decision_provenance === "signed_event", `${frontier.slug}: required decision is not signed-event backed`);
  }
}

assert(
  JSON.stringify(manifest.source_frontiers) === JSON.stringify(
    bundle.frontiers.map((frontier) => ({
      slug: frontier.slug,
      commit: frontier.source.commit,
      tree: frontier.source.tree,
      event_log_root: frontier.status.roots.event_log,
      snapshot_root: frontier.status.roots.snapshot,
      proposal_root: frontier.status.roots.proposals,
      finding_count: frontier.findings.length,
      review_count: frontier.reviews.length,
    })),
  ),
  "bundle manifest frontier identities drift",
);

console.log(
  JSON.stringify({
    ok: true,
    schema: bundle.schema,
    vela: bundle.generator.vela_version,
    frontiers: bundle.frontiers.length,
    findings: bundle.frontiers.reduce((sum, item) => sum + item.findings.length, 0),
    reviews: bundle.frontiers.reduce((sum, item) => sum + item.reviews.length, 0),
  }),
);
