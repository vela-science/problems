import type {
  MathSourceDeclarationInput,
  MathSourceRegistryInput,
} from "../src/math-sources";
import formalConjecturesAuditInput from "./formal-conjectures-audit.v1.json";

const formalConjecturesAuditSource = formalConjecturesAuditInput.source;

const referenceOnlyRights = (basis: string): MathSourceDeclarationInput["rights"] => ({
  status: "not_established",
  license_expression: null,
  access: "public",
  redistribution: "reference_only",
  basis,
});

const contentRootOnly = (reason: string): MathSourceDeclarationInput["snapshot_policy"] => ({
  mode: "content_root_only",
  retention: "none",
  reason,
});

const networkAdapter = (
  adapterId: string,
  version = "1.0.0",
): MathSourceDeclarationInput["adapter"] => ({
  adapter_id: adapterId,
  version,
  mode: "networked_acquisition",
  acquisition_contract: "vela.source-adapter-bundle.v2",
  observation_contract: "vela.math-source-observation.v1",
});

const gitAdapter = (
  adapterId: string,
  version = "1.0.0",
): MathSourceDeclarationInput["adapter"] => ({
  adapter_id: adapterId,
  version,
  mode: "exact_git_checkout",
  acquisition_contract: "vela.source-adapter-bundle.v2",
  observation_contract: "vela.math-source-observation.v1",
});

const retainedSnapshotAdapter = (
  adapterId: string,
): MathSourceDeclarationInput["adapter"] => ({
  adapter_id: adapterId,
  version: "1.0.0",
  mode: "retained_snapshot",
  acquisition_contract: "vela.source-adapter-bundle.v2",
  observation_contract: "vela.math-source-observation.v1",
});

const registry = {
  schema: "vela.math-source-registry-declarations.v1",
  sources: [
    {
      source_id: "source:erdos-problems",
      native_namespace: "erdosproblems",
      publisher_or_maintainer: "The Erdős Problems project; Thomas Bloom",
      locators: [
        {
          locator_id: "homepage",
          kind: "homepage",
          url: "https://www.erdosproblems.com/",
        },
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/teorth/erdosproblems",
        },
        {
          locator_id: "problem-data",
          kind: "artifact",
          url: "https://raw.githubusercontent.com/teorth/erdosproblems/main/data/problems.yaml",
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "The Erdős Problems project",
          basis_locator_id: "homepage",
        },
        {
          role: "maintainer",
          name: "Thomas Bloom",
          basis_locator_id: "homepage",
        },
      ],
      source_kind: "problem_collection",
      rights: referenceOnlyRights(
        "No source license is asserted by this declaration; the Atlas retains identity, roots, and attributed derived coverage only.",
      ),
      snapshot_policy: contentRootOnly(
        "The observed problems.yaml commit and content root are bound at acquisition; no second archive is created and no bytes are retained.",
      ),
      /* 3.0.0 writes each declared state as flat scalars — `status_state`,
         `formal_status_url` and the rest. 2.0.0 nested them, and a native
         record's metadata is flat scalars by contract, so the projection
         retained each one as the text of its own JSON and every read of a
         declared status returned nothing. It reads the pinned registry from an
         exact checkout, as 2.0.0 did; 1.0.0 read a normalized JSON file
         retained in a sibling repository's working tree, which the snapshot
         policy below does not permit and which was inherited rather than
         acquired, so its bytes answered to no pin. */
      adapter: gitAdapter("problems-data/erdos-problems", "3.0.0"),
      coverage: {
        repository_slugs: ["math"],
        included: [
          "Problem numbers, prize, subject tags and OEIS references as the pinned registry declares them",
          "Upstream informal and formal status, and upstream's own derived combination of the two",
        ],
        omissions: [
          {
            code: "no_source_truth_import",
            description: "Upstream labels remain attributed source facts and do not create Vela Standing.",
          },
          {
            code: "no_unobserved_pages",
            description: "Website content outside the pinned registry is not represented as covered.",
          },
          {
            code: "statement_prose_not_observed",
            description: "Verbatim problem statements are served by erdosproblems.com, which this source does not observe; records carry a locator to the problem page and no statement text.",
          },
        ],
      },
    },
    {
      source_id: "source:openai-ten-proofs",
      native_namespace: "openai-ten-proofs:comparator",
      publisher_or_maintainer: "OpenAI",
      locators: [
        {
          locator_id: "announcement",
          kind: "homepage",
          url: "https://openai.com/index/ten-advances-in-mathematics/",
        },
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/openai/ten-proofs",
        },
        {
          locator_id: "manuscript",
          kind: "artifact",
          url: "https://cdn.openai.com/pdf/ten-proofs-oai.pdf",
        },
        {
          locator_id: "discovery-notes",
          kind: "artifact",
          url: "https://cdn.openai.com/pdf/reasoning-walkthroughs.pdf",
        },
        {
          locator_id: "license",
          kind: "documentation",
          url: "https://github.com/openai/ten-proofs/blob/94bc0feb6a9ff12c7d31d6de640a725c9d43d2b6/LICENSE",
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "OpenAI",
          basis_locator_id: "announcement",
        },
        {
          role: "maintainer",
          name: "OpenAI",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "formal_library",
      rights: {
        status: "declared",
        license_expression: "Apache-2.0",
        access: "public",
        redistribution: "full_under_license",
        basis: "The exact pinned repository tree includes an Apache-2.0 LICENSE file; manuscript and discovery-note rights remain separate and their bytes are not repackaged.",
      },
      snapshot_policy: contentRootOnly(
        "The adapter binds the exact Git commit, tree, Comparator files, Lean toolchain, and Lake manifests without creating a second repository archive.",
      ),
      adapter: gitAdapter("problems-data/openai-ten-proofs", "2.0.0"),
      coverage: {
        repository_slugs: ["math"],
        included: [
          "All twelve Comparator profiles declared by formalization.yaml at commit 94bc0feb6a9ff12c7d31d6de640a725c9d43d2b6",
          "Exact challenge, solution, toolchain, Lake manifest, lakefile, formalization manifest, and license roots",
        ],
        omissions: [
          {
            code: "no_independent_reproduction",
            description: "Repository presence and publisher review do not establish an independent Lean build, Comparator result, or Vela Verification.",
          },
          {
            code: "no_fidelity_novelty_or_standing",
            description: "The adapter does not infer statement fidelity, mathematical novelty, field acceptance, or Vela Standing from formal artifacts.",
          },
          {
            code: "publication_bytes_not_retained",
            description: "The announcement and PDF locators are attributed release context; their bytes and rights are outside this exact-Git adapter.",
          },
        ],
      },
    },
    {
      source_id: "source:formal-conjectures",
      native_namespace: "formal-conjectures",
      publisher_or_maintainer: "Google DeepMind; Formal Conjectures authors",
      locators: [
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/google-deepmind/formal-conjectures",
        },
        {
          locator_id: "published-data",
          kind: "artifact",
          url: "https://google-deepmind.github.io/formal-conjectures/data/conjectures.json",
        },
        {
          locator_id: "license",
          kind: "documentation",
          url: "https://github.com/google-deepmind/formal-conjectures/blob/main/LICENSE",
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "Google DeepMind",
          basis_locator_id: "repository",
        },
        {
          role: "maintainer",
          name: "Formal Conjectures authors",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "formal_library",
      rights: {
        status: "declared",
        license_expression: "Apache-2.0",
        access: "public",
        redistribution: "full_under_license",
        basis: "The upstream repository contains an Apache-2.0 LICENSE file; each retained observation still binds the exact source revision.",
      },
      /* The one source here that retains bytes, and it says so rather than
         retaining under a policy that reads `retention: "none"`.
         `retained_exact_bytes` is gated on `redistribution:
         "full_under_license"`, which this source has and which is exactly what
         erdos-problems does not: its statements came out for that reason.
         What is retained is two files, both exact and both pinned — the served
         Pages artifact, and the `lake exe extract_names` output from the commit
         that produced it. Neither can be re-fetched at a revision: the first is
         a build artifact tracked at no ref, and the second requires elaborating
         the library under Lean, which takes about half an hour and ten
         gigabytes and so cannot be a step in a daily refresh. Retaining them is
         what makes every refresh deterministic and offline. The cost is that
         conjectures added upstream do not appear until a human moves the pin. */
      snapshot_policy: {
        mode: "retained_exact_bytes",
        retention: "immutable_artifact",
        reason:
          "The published dataset is a Pages build artifact tracked at no ref, and the elaborated statements exist only by running Lean over the pinned checkout; both are retained exactly, under Apache-2.0, so the acquisition is reproducible without refetching either.",
      },
      adapter: networkAdapter("problems-data/formal-conjectures", "3.0.0"),
      coverage: {
        repository_slugs: ["math"],
        included: [
          "Observed formal declaration identity, source path, commit, tree, and file root",
          "The elaborated formal statement and docstring of every theorem, read from the pinned checkout by the repository's own extractor",
          "Pinned Lean, Lake, and Mathlib environment identities retained by current Repository records",
        ],
        omissions: [
          {
            code: "kernel_not_fidelity",
            description: "Kernel elaboration is not represented as statement fidelity or scientific acceptance.",
          },
          {
            code: "unretained_source_files",
            description: "Files not referenced by a declared Repository observation remain outside Atlas coverage.",
          },
        ],
      },
    },
    {
      source_id: "source:formal-conjectures-pr-audit",
      native_namespace: "formal-conjectures-pr-audit-v1",
      publisher_or_maintainer: "William Blair",
      locators: [
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/williamjblair/formal-conjectures",
        },
        {
          locator_id: "audit-packet",
          kind: "artifact",
          url: `${formalConjecturesAuditSource.repository}/tree/${formalConjecturesAuditSource.commit}/audit/pr-audit-v1`,
        },
        {
          locator_id: "license",
          kind: "documentation",
          url: `${formalConjecturesAuditSource.repository}/blob/${formalConjecturesAuditSource.commit}/LICENSE`,
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "William Blair",
          basis_locator_id: "repository",
        },
        {
          role: "maintainer",
          name: "William Blair",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "frozen_reference",
      rights: {
        status: "declared",
        license_expression: "Apache-2.0",
        access: "public",
        redistribution: "full_under_license",
        basis:
          "The exact pinned fork commit includes an Apache-2.0 LICENSE and publicly distributes the bounded audit packet.",
      },
      snapshot_policy: {
        mode: "reference_only",
        retention: "none",
        reason:
          "The dedicated Formal Conjectures audit projection verifies the ten exact core and observation records through Math custody; the generic native-record plane retains only this pinned package declaration and does not duplicate them.",
      },
      adapter: gitAdapter("problems-data/formal-conjectures-pr-audit-reference"),
      coverage: {
        repository_slugs: ["math"],
        included: [
          `The public audit package identity at commit ${formalConjecturesAuditSource.commit} and tree ${formalConjecturesAuditSource.tree}`,
          "The five bounded pull-request audit cases projected separately through exact Math source custody",
        ],
        omissions: [
          {
            code: "dedicated_projection_not_duplicated",
            description:
              "The generic source-adapter set emits no duplicate native records; the dedicated audit projection owns the exact core and observation record verification.",
          },
          {
            code: "audit_not_authority",
            description:
              "Audit dispositions, pull-request state, checks, reviews, and merges do not create a Vela Verification, Decision, Event, or Standing.",
          },
          {
            code: "clean_ground_truth_unmet",
            description:
              "The clean-candidate case remains inconclusive because exact-head independent human source-fidelity ground truth is not retained.",
          },
        ],
      },
    },
    {
      source_id: "source:physlib",
      native_namespace: "leanprover-community/physlib:API-map",
      publisher_or_maintainer: "The Physlib community",
      locators: [
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/leanprover-community/physlib",
        },
        {
          locator_id: "api-map-guide",
          kind: "documentation",
          url: "https://github.com/leanprover-community/physlib/blob/ad1d812c1cfd269898282081384bd92aef33b278/docs/API_MAP_GUIDE.md",
        },
        {
          locator_id: "ai-policy",
          kind: "documentation",
          url: "https://github.com/leanprover-community/physlib/blob/ad1d812c1cfd269898282081384bd92aef33b278/AI-POLICY.md",
        },
        {
          locator_id: "review-guidelines",
          kind: "documentation",
          url: "https://github.com/leanprover-community/physlib/blob/ad1d812c1cfd269898282081384bd92aef33b278/docs/ReviewGuidelines.md",
        },
        {
          locator_id: "api-tracker",
          kind: "homepage",
          url: "https://physlib.io/api-tracker",
        },
        {
          locator_id: "todo-list",
          kind: "homepage",
          url: "https://physlib.io/TODOList",
        },
        {
          locator_id: "license",
          kind: "documentation",
          url: "https://github.com/leanprover-community/physlib/blob/ad1d812c1cfd269898282081384bd92aef33b278/LICENSE",
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "The Physlib community",
          basis_locator_id: "repository",
        },
        {
          role: "maintainer",
          name: "The Physlib community",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "formal_library",
      rights: {
        status: "declared",
        license_expression: "Apache-2.0",
        access: "public",
        redistribution: "full_under_license",
        basis: "The exact pinned repository tree includes an Apache-2.0 LICENSE file. This projection retains roots and source-native metadata rather than a second repository archive.",
      },
      snapshot_policy: contentRootOnly(
        "The adapter binds the exact Git commit, tree, native API maps, toolchain, Lake manifests, license, AI policy, agent guidance, and review guidance without copying the repository.",
      ),
      adapter: gitAdapter("problems-data/physlib-api-maps", "3.0.0"),
      coverage: {
        repository_slugs: ["math"],
        included: [
          "Every requirement in all 20 Physlib/API-map.yaml files at commit ad1d812c1cfd269898282081384bd92aef33b278",
          "Exact source-reported planned or implemented status, location, parent APIs, references, Lean toolchain, and policy roots",
        ],
        omissions: [
          {
            code: "native_status_not_vela_standing",
            description: "A Physlib done flag remains attributed native map state and does not create a Vela Claim, Verification, Decision, or Standing result.",
          },
          {
            code: "mutable_coordination_not_observed",
            description: "GitHub issues, pull requests, reviewer allocation, generated trackers, and merge state are outside this exact-Git observation.",
          },
          {
            code: "no_independent_native_verification",
            description: "The adapter does not run Lean, Physlib linters, axiom checks, source-fidelity review, or maintainer review.",
          },
        ],
      },
    },
    {
      source_id: "source:plby-lean-proofs",
      native_namespace: "plby-lean-proofs",
      publisher_or_maintainer: "plby",
      locators: [
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/plby/lean-proofs",
        },
        {
          locator_id: "proof-manifest",
          kind: "artifact",
          url: "https://raw.githubusercontent.com/plby/lean-proofs/main/data/sources.yaml",
        },
      ],
      attributed_claims: [
        {
          role: "maintainer",
          name: "plby",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "proof_manifest",
      rights: referenceOnlyRights(
        "No license is asserted here; only exact source identity and the content root already retained by the Erdős Repository may be projected.",
      ),
      snapshot_policy: contentRootOnly(
        "The Problems projection acquisition config binds the observed proof manifest without authorizing a second archive.",
      ),
      adapter: gitAdapter("problems-data/plby-lean-proofs"),
      coverage: {
        repository_slugs: ["math"],
        included: ["Proof-manifest entries observed by the Problems projection acquisition config"],
        omissions: [
          {
            code: "proof_bytes_not_archived",
            description: "The Atlas does not retain or redistribute unlicensed proof-source bytes.",
          },
        ],
      },
    },
    {
      source_id: "source:jayyhk-erdos-lean",
      native_namespace: "jayyhk-erdos-lean",
      publisher_or_maintainer: "Jayyhk",
      locators: [
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/Jayyhk/erdos-lean",
        },
        {
          locator_id: "problem-manifest",
          kind: "artifact",
          url: "https://raw.githubusercontent.com/Jayyhk/erdos-lean/main/data/problems.yaml",
        },
      ],
      attributed_claims: [
        {
          role: "maintainer",
          name: "Jayyhk",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "proof_manifest",
      rights: referenceOnlyRights(
        "No license is asserted here; only exact source identity and the content root already retained by the Erdős Repository may be projected.",
      ),
      snapshot_policy: contentRootOnly(
        "The Problems projection acquisition config binds the observed proof manifest without authorizing a second archive.",
      ),
      adapter: gitAdapter("problems-data/jayyhk-erdos-lean"),
      coverage: {
        repository_slugs: ["math"],
        included: ["Problem and hosted-proof references observed by the Problems projection acquisition config"],
        omissions: [
          {
            code: "proof_bytes_not_archived",
            description: "The Atlas does not retain or redistribute unlicensed proof-source bytes.",
          },
        ],
      },
    },
    /* The Erdős Repository has been building this repository and retaining its
       machine verdicts since June and did not declare it until now. The
       declaration landed in the Repository first, where it belongs; this entry is
       the publishing half of it.

       It is the one Erdős source with no projection adapter, and the reason is
       that the Repository holds no locator for its bytes. plby and Jayyhk each
       publish a manifest file whose content root the Erdős lock pins, and the
       adapter re-reads exactly that file. AlphaProof publishes no such file —
       the evidence is a directory of Lean sources — so the Repository's pin is a
       commit and tree rather than a content root, and there is nothing here to
       re-derive records from. Declaring the locator and the attribution is the
       whole of what this Atlas can honestly say about it, so the snapshot
       policy says `reference_only` and the coverage says the verdicts are not
       projected. Giving it a records adapter would mean publishing a reading of
       proof sources whose rights are not established. */
    {
      source_id: "source:alphaproof-nexus-results",
      native_namespace: "alphaproof-nexus-results",
      publisher_or_maintainer: "Google DeepMind",
      locators: [
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/google-deepmind/alphaproof-nexus-results",
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "Google DeepMind",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "formal_library",
      rights: referenceOnlyRights(
        "No license is asserted here; the Erdős Repository pins a commit and tree and retains no AlphaProof bytes, so only source identity may be projected.",
      ),
      snapshot_policy: {
        mode: "reference_only",
        retention: "none",
        reason:
          "The source declaration pins the commit and tree; the audited Lean sources have no single content locator and are not archived here.",
      },
      adapter: gitAdapter("problems-data/alphaproof-nexus-results-reference"),
      coverage: {
        repository_slugs: ["math"],
        included: [
          "The repository identity and commit the source declaration pins",
        ],
        omissions: [
          {
            code: "no_external_snapshot",
            description:
              "No AlphaProof Lean source is retained or projected, so no proof-level coverage is claimed.",
          },
          {
            code: "machine_verdicts_not_projected",
            description:
              "The Erdős Repository's machine verdicts over this library are Repository-derived evidence and are not published as source records.",
          },
        ],
      },
    },
    {
      source_id: "source:williamjblair-lean-proofs",
      native_namespace: "williamjblair-lean-proofs",
      publisher_or_maintainer: "William Blair",
      locators: [
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/williamjblair/lean-proofs",
        },
        {
          locator_id: "proof-manifest",
          kind: "artifact",
          url: "https://raw.githubusercontent.com/williamjblair/lean-proofs/main/proofs.yaml",
        },
      ],
      attributed_claims: [
        {
          role: "maintainer",
          name: "William Blair",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "proof_manifest",
      rights: referenceOnlyRights(
        "The declaration does not infer a license from repository access; the Atlas projects only exact retained source identities and roots.",
      ),
      snapshot_policy: contentRootOnly(
        "The Problems projection acquisition config binds the observed proof manifest without creating a second source archive.",
      ),
      adapter: gitAdapter("problems-data/williamjblair-lean-proofs"),
      coverage: {
        repository_slugs: ["math"],
        included: ["Proof-manifest entries observed by the Problems projection acquisition config"],
        omissions: [
          {
            code: "working_tree_excluded",
            description: "Mutable or uncommitted proof work is outside the source observation.",
          },
        ],
      },
    },
    {
      source_id: "source:erdos-ai-contributions-wiki",
      native_namespace: "erdosproblems-wiki",
      publisher_or_maintainer: "Erdős Problems wiki contributors",
      locators: [
        {
          locator_id: "wiki-page",
          kind: "documentation",
          url: "https://github.com/teorth/erdosproblems/wiki/AI-contributions-to-Erd%C5%91s-problems",
        },
        {
          locator_id: "wiki-repository",
          kind: "git",
          url: "https://github.com/teorth/erdosproblems.wiki.git",
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "Erdős Problems wiki contributors",
          basis_locator_id: "wiki-page",
        },
      ],
      source_kind: "frozen_reference",
      rights: referenceOnlyRights(
        "The historical Repository retains a frozen attributed observation; this declaration does not infer redistribution rights for wiki text.",
      ),
      snapshot_policy: contentRootOnly(
        "The Problems projection binds the frozen commit and content root in its acquisition config and does not reacquire or duplicate the wiki snapshot.",
      ),
      adapter: retainedSnapshotAdapter("problems-data/erdos-ai-contributions-wiki"),
      coverage: {
        repository_slugs: ["math"],
        included: ["The exact retired AI-contributions page observation frozen by the Erdős Repository"],
        omissions: [
          {
            code: "later_wiki_history_excluded",
            description: "No wiki revisions beyond the retained frozen commit are represented.",
          },
        ],
      },
    },
    {
      source_id: "source:gpt-erdos",
      native_namespace: "gpt-erdos",
      publisher_or_maintainer: "Neel Somani",
      locators: [
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/neelsomani/gpt-erdos",
        },
      ],
      attributed_claims: [
        {
          role: "maintainer",
          name: "Neel Somani",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "frozen_reference",
      rights: referenceOnlyRights(
        "The historical Repository retains an attributed frozen observation; this declaration does not infer redistribution rights for repository bytes.",
      ),
      snapshot_policy: contentRootOnly(
        "The Problems projection binds only the commit and content root named by its acquisition config.",
      ),
      adapter: retainedSnapshotAdapter("problems-data/gpt-erdos"),
      coverage: {
        repository_slugs: ["math"],
        included: ["The exact candidate-classification snapshot retained by the Erdős Repository"],
        omissions: [
          {
            code: "later_repository_history_excluded",
            description: "Repository history after the retained commit is outside current declared coverage.",
          },
        ],
      },
    },
    /* The first source here whose rights permit redistributing what it
       publishes. Every other entry carrying problem prose is `not_established`
       / `reference_only`, which is why `source:erdos-problems` retains a
       locator to each problem page and no statement text. VibeMathed licenses
       its catalogue CC BY 4.0 and says so in two places that travel with the
       bytes: the repository README, and a `license` field inside the dataset
       response itself. So the statements may be retained, with the attribution
       the licence requires, and the coverage below claims them.

       What this source originates is the curatorial attribution: that a problem
       was first solved with AI assistance, and that a moderator approved the
       entry saying so. That judgment is not derivable from the arXiv preprints
       and Lean repositories the entries link out to, which is the whole reason
       to observe it. It is also not a Vela result, and the omissions and the
       adapter's loss disclosure both say so, in the same terms
       `source:erdos-ai-contributions-wiki` uses for the same species of claim.

       The dataset endpoint is the acquisition and the repository is not, even
       though the repository is the pinnable one. `src/data/problems.json` is a
       seed and disaster-recovery export of a database that is the record, so it
       is stale between exports by design and lossy when fresh. The Repository's
       `sources.yaml` carries the measurement. */
    {
      source_id: "source:vibemathed",
      native_namespace: "vibemathed",
      publisher_or_maintainer: "Rasmus Lindahl (mrconter1)",
      locators: [
        {
          locator_id: "homepage",
          kind: "homepage",
          url: "https://vibemathed.com",
        },
        {
          locator_id: "dataset",
          kind: "api",
          url: "https://vibemathed.com/api/dataset",
        },
        {
          locator_id: "methodology",
          kind: "documentation",
          url: "https://vibemathed.com/methodology",
        },
        {
          locator_id: "repository",
          kind: "git",
          url: "https://github.com/mrconter1/vibemathed",
        },
        {
          locator_id: "license",
          kind: "documentation",
          url: "https://creativecommons.org/licenses/by/4.0/",
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "VibeMathed",
          basis_locator_id: "homepage",
        },
        {
          role: "maintainer",
          name: "Rasmus Lindahl",
          basis_locator_id: "repository",
        },
      ],
      source_kind: "problem_collection",
      rights: {
        status: "declared",
        license_expression: "CC-BY-4.0",
        access: "public",
        redistribution: "full_under_license",
        basis: "The repository README licenses the catalogue and the dataset CC BY 4.0 and the site's code MIT; the dataset response repeats the licence in its own `license` field. Only the catalogue is acquired, and every record carries the attribution the licence requires.",
      },
      snapshot_policy: contentRootOnly(
        "The adapter roots each record on the catalogue entry it observed and binds the retrieval that served it; no second archive of the dataset is created.",
      ),
      adapter: networkAdapter("problems-data/vibemathed"),
      coverage: {
        repository_slugs: ["math"],
        included: [
          "Every catalogue entry the dataset endpoint serves, with its curatorial labels: resolution, verification rung, AI-contribution tier, and significance score",
          "The problem statement text where the catalogue carries one, retained under CC BY 4.0 with attribution",
        ],
        omissions: [
          {
            code: "curatorial_labels_not_vela_standing",
            description: "Verification rung, AI-contribution tier, significance score and moderator approval are source attributions. None of them creates Vela Standing, Verification, or acceptance.",
          },
          {
            code: "no_pinned_revision",
            description: "The endpoint serves no commit locator and re-renders its envelope on a cache cycle, so an observation names a retrieval rather than a revision.",
          },
          {
            code: "community_state_not_observed",
            description: "Votes, comment counts, submitter pseudonyms, edit changelogs, discussion threads and member profiles are mutable site state and are not projected.",
          },
          {
            code: "linked_evidence_not_acquired",
            description: "The preprints and Lean repositories an entry cites are retained as locators; their bytes and their separate rights are outside this source.",
          },
        ],
      },
    },
    {
      source_id: "source:oeis-a309370",
      native_namespace: "oeis",
      publisher_or_maintainer: "The OEIS Foundation Inc.",
      locators: [
        {
          locator_id: "sequence",
          kind: "homepage",
          url: "https://oeis.org/A309370",
        },
        {
          locator_id: "sequence-json",
          kind: "api",
          url: "https://oeis.org/A309370?fmt=json",
        },
        {
          locator_id: "foundation",
          kind: "documentation",
          url: "https://oeisf.org/",
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "The OEIS Foundation Inc.",
          basis_locator_id: "foundation",
        },
      ],
      source_kind: "sequence_database",
      rights: referenceOnlyRights(
        "The Atlas treats A309370 as an attributed native reference and does not infer redistribution rights for OEIS content.",
      ),
      snapshot_policy: contentRootOnly(
        "The Sidon Repository retains exact witness evidence and an observed OEIS identity; the Atlas does not mirror the OEIS entry.",
      ),
      adapter: networkAdapter("problems-data/oeis-a309370"),
      coverage: {
        repository_slugs: ["math"],
        included: ["A309370 identity and the exact observed bounds referenced by current Sidon Claims"],
        omissions: [
          {
            code: "oeis_entry_not_mirrored",
            description: "Unreferenced OEIS fields, revision history, comments, and linked sequences are outside declared coverage.",
          },
        ],
      },
    },
    {
      source_id: "source:codetables-stabilizer",
      native_namespace: "codetables-stabilizer",
      publisher_or_maintainer: "CodeTables.de",
      locators: [
        {
          locator_id: "homepage",
          kind: "homepage",
          url: "https://codetables.de/",
        },
      ],
      attributed_claims: [
        {
          role: "publisher",
          name: "CodeTables.de",
          basis_locator_id: "homepage",
        },
      ],
      source_kind: "problem_collection",
      rights: referenceOnlyRights(
        "Current Quantum provenance contains only an attributed CodeTables locator; no license, exact external snapshot, or broader ownership claim is inferred.",
      ),
      snapshot_policy: {
        mode: "reference_only",
        retention: "none",
        reason: "The Atlas preserves the external locator only; the exact retained certificate is a separate Repository-local source.",
      },
      adapter: networkAdapter("problems-data/codetables-stabilizer-reference"),
      coverage: {
        repository_slugs: ["math"],
        included: ["The CodeTables.de locator attributed by the current Quantum open-question Claim"],
        omissions: [
          {
            code: "no_external_snapshot",
            description: "No exact CodeTables table response or archive is currently retained, so no external table coverage is claimed.",
          },
        ],
      },
    },
  ],
} satisfies MathSourceRegistryInput;

export default registry;
