# Plural-authority registry reference

## Status and claim ceiling

This slice demonstrates a global, discardable read model without a global authority. It is maintained code, tests, a bounded replay command, and a minimal `/frontiers` read surface.

The authority divergence is exact. Vela Core commit `4685462c44b1f073870f31025ae73d1d8770ce73` retains two complete Git bundles generated and qualified with Vela 0.977.4. The evidence packet pins the signed 0.977.4 macOS reader at binary root `sha256:06f912d107d29e4ce1dadd19bf7ef849ec42d7e62cbc9332c9807e6b8c9bd05e`; it is deliberately separate from the Web release's older general projection reader pin. The same authenticated Submission, Artifact bytes, and derived Claim occur in both Repositories. One local Decision accepts it; the other rejects the Proposal, leaving the Claim unassessed there.

The correction consequence is not real scientific use. Core's real Math correction has no producer-authored downstream dependency edges. The reference therefore binds a conspicuously synthetic correction and downstream-work packet to the exact shared predecessor. `replace_with_real_consequential_correction_packet` is the replacement seam for the separate real-correction workstream. Nothing here establishes a real accepted dependency cascade, scientific utility, consensus, or external adoption.

## Boundary

```text
exact Submission bytes
        |
        +--> Repository A -- local authenticated Decision --> accepted Local Standing
        |
        +--> Repository B -- local authenticated Decision --> unassessed Local Standing
                         (its Proposal was rejected)

attributed Repository reads + synthetic correction packet
        |
        v
discardable registry projection
        |
        +--> derived Frontier query: accepted work needing reassessment
        +--> derived Frontier query: unassessed work needing corrected input review
```

The registry observes source Repository ids, Git commits and trees, Repository roots, replay roots, Decision roots, Event roots and event-log roots, performers, principals, and Local Standing. Before it can set `replay_verified`, it re-hashes the retained raw Submission, Artifact, Claim, Proposal, authority-record envelope/payload, and Event bytes; reconstructs the authority event-log commitment; verifies the complete retained Vela projection commitment; and compares every displayed field to that evidence. Its source root commits those exact bytes, complete projection documents, repository evidence roots, and reader identity. It has `authority_effect: none`. It cannot sign, decide, replay on behalf of a Repository, transport Standing, infer consensus, or persist a Frontier as a governed object.

A Frontier identity is the root of its query definition. Its result root also binds the current registry projection root and members. Rebuilding unchanged inputs reproduces both roots; changing a source root preserves query identity and changes the result. `persistence: none` is part of every Frontier result.

## Retained inputs

The checked source packet is `packages/projection-data/config/plural-authority-reference.v1.json`. It binds:

- Core commit `4685462c44b1f073870f31025ae73d1d8770ce73`, tree `13c5e0cf2e64be907cee4c0fd740ab0027118e13`;
- portable-divergence flow root `sha256:8a4a2a09d6a84f565fc6d93e834f192367638a9c20681cd857a1ef6cc848009f`;
- frozen expectation root `sha256:858019d298f55295fe92989bb23a343ce73b6976338f36c7c637c82272274041`;
- accept bundle root `sha256:2a92803cdb30e2f16d0f3a9b41fcbc24be39fc9693f7abc6f04f2f261a0dd0ba`;
- reject bundle root `sha256:144de0583805ef53ea8116c3a6ba65eb7870be48563b85d8b8a0819ecea25c9a`;
- synthetic correction-conformance input, expected-output, and projection roots from the same Core tree;
- signed Vela 0.977.4 release commit `1a2e0328620b4e8c4584c3d4baf257adb11f3d45`, tree `1bd8ed4e11d3745f159b32f23539f5174fd44803`, archive root `sha256:023bf4d98766e9d7b1d0c7504fcade78220b3fe4f544daca1faaeace98d25d65`, manifest root `sha256:210a12c9aada097fc64d4222e199c785b2b3281d0924d3ba68f3779580cabbdc`, and binary root `sha256:06f912d107d29e4ce1dadd19bf7ef849ec42d7e62cbc9332c9807e6b8c9bd05e`;
- accept evidence root `sha256:fcff42697c5f5cb09fa1274196e41af60ca87bbcaf0dc2d50b0c052b291794bd` and exact Vela projection root `sha256:ba89cf9164ab7283d09bbe4551525b728a419c9e267766ac3a40223afff9b8e8`;
- reject evidence root `sha256:da0b7a5edda4912b3c5397f0025b7eeaabc395a66915cba5db4fa2936872cac4` and exact Vela projection root `sha256:83e9488e54cfac87f5fea686f9eefbdf3c3668c73c23ab2252597666f3f5c346`.

The current canonical source packet root is `sha256:38827057cca6161e9decd9ed9ca3408f12b81e1f237293a6903adb893613a325`. The derived registry projection root is `sha256:087ffd92fa2ebc56e88f1b5e304bc4ed07c45b96e987e65be391ec780e184709`. The conspicuously synthetic correction packet root is `sha256:a88e3fbf9bcc0d7b20ff9449cd2bfaaf36d807a1db176d3e8b548ec693c62745`. These `site.*` contracts belong only to the Web read model; they do not add Protocol or Core schemas.

## Reproduce in one bounded command

From this repository, with a local Vela Core checkout containing the pinned commit and the exact signed Vela 0.977.4 binary:

```bash
bun run demo:plural-authority -- --core /path/to/vela-core --vela /path/to/vela-0.977.4
```

The command checks the reader version and binary digest, Core tree, every retained fixture digest, bundle completeness, and strict Git object closure. It clones both frozen bundles, runs `vela projection <repository> --json` and `vela replay <repository> --json`, re-reads the raw retained objects and authority history, regenerates the complete checked source packet, compares it byte-semantically with every retained field and root, rebuilds the registry and Frontiers, prints a bounded receipt, and removes only its temporary directory. Reader-version, binary, projection-root, or evidence substitution fails before `verified: true` can be emitted.

The database is not an authority prerequisite for this demonstration. The reference projection is pure and can be discarded and rebuilt without touching Repository bytes or Standing. A production feed can use the same two-or-more-Repository builder with root-bound Protocol reader outputs after the real-correction packet supplies its exact predecessor, successor, relation-completeness boundary, and downstream work roots. Replacing that packet does not widen the registry's authority.

## Adversarial contract

`packages/projection-data/tests/plural-authority.test.ts` covers authority leakage, global-consensus inference, stale projection roots, cross-Repository Standing transport, correction omission/substitution, reader and bundle substitution, Decision/Event/principal/performer/Standing substitution, portable-object and Proposal substitution, replay-count drift, raw Event drift, and Frontier persistence/identity. These are projection refusals or visible stale states, never automatic scientific actions.
