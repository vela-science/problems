# Plural-authority registry reference

## Status and claim ceiling

This slice demonstrates a global, discardable read model without a global authority. It is maintained code, tests, a bounded replay command, and a minimal `/frontiers` read surface.

The authority divergence is exact. Vela Core commit `4685462c44b1f073870f31025ae73d1d8770ce73` retains two complete Git bundles. The pinned Vela 0.977.3 reader replays the same authenticated Submission and derived Claim in both Repositories. One local Decision accepts it; the other rejects the Proposal, leaving the Claim unassessed there.

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

The registry observes source Repository ids, Git commits and trees, Repository roots, replay roots, Decision roots, performers, principals, and Local Standing. It has `authority_effect: none`. It cannot sign, decide, replay on behalf of a Repository, transport Standing, infer consensus, or persist a Frontier as a governed object.

A Frontier identity is the root of its query definition. Its result root also binds the current registry projection root and members. Rebuilding unchanged inputs reproduces both roots; changing a source root preserves query identity and changes the result. `persistence: none` is part of every Frontier result.

## Retained inputs

The checked source packet is `packages/projection-data/config/plural-authority-reference.v1.json`. It binds:

- Core commit `4685462c44b1f073870f31025ae73d1d8770ce73`, tree `13c5e0cf2e64be907cee4c0fd740ab0027118e13`;
- portable-divergence flow root `sha256:8a4a2a09d6a84f565fc6d93e834f192367638a9c20681cd857a1ef6cc848009f`;
- frozen expectation root `sha256:858019d298f55295fe92989bb23a343ce73b6976338f36c7c637c82272274041`;
- accept bundle root `sha256:2a92803cdb30e2f16d0f3a9b41fcbc24be39fc9693f7abc6f04f2f261a0dd0ba`;
- reject bundle root `sha256:144de0583805ef53ea8116c3a6ba65eb7870be48563b85d8b8a0819ecea25c9a`;
- synthetic correction-conformance input, expected-output, and projection roots from the same Core tree;
- pinned macOS reader root `sha256:3a1173918bdcb887155bab681411bf5e9ff64d925fe1b50369ac37ab020b94ad`.

The current canonical source packet root is `sha256:44c39ad559b03af1ae8e5698cc6dffc79608dcd972318d6ef917e973d5d30dcc`. The derived registry projection root is `sha256:679e5b7074e22eca7ff23ff37dc252d3ed56987fd34c72b3880a93ff2b53dc70`. These `site.*` contracts belong only to the Web read model; they do not add Protocol or Core schemas.

## Reproduce in one bounded command

From this repository, with a local Vela Core checkout containing the pinned commit and the accepted Vela 0.977.3 binary at `~/.local/bin/vela`:

```bash
bun run demo:plural-authority -- --core /path/to/vela
```

The command checks the Core tree and every retained fixture digest, clones both frozen bundles into a temporary directory, runs `vela status --json` and `vela replay --json` through the digest-pinned reader, compares exact Repository ids/commits/trees/roots, rebuilds the registry and Frontiers, prints the complete rooted projection, and removes only its temporary directory.

The database is not an authority prerequisite for this demonstration. The reference projection is pure and can be discarded and rebuilt without touching Repository bytes or Standing. A production feed can use the same two-or-more-Repository builder with root-bound Protocol reader outputs after the real-correction packet supplies its exact predecessor, successor, relation-completeness boundary, and downstream work roots. Replacing that packet does not widen the registry's authority.

## Adversarial contract

`packages/projection-data/tests/plural-authority.test.ts` covers authority leakage, global-consensus inference, stale projection roots, cross-Repository Standing transport, correction omission and predecessor-root substitution, and Frontier persistence/identity. These are projection refusals or visible stale states, never automatic scientific actions.
