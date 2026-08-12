# ADR: Bind a Workspace Approach to one exact Target packet

**Status:** implementation candidate; database migration created but not applied

**Date:** 2026-08-12

**Work package:** `WEB-01` design gate

**Depends on:** `GOV-03` in `docs/security/vela-web-threat-model.md`

**Authority effect:** none

## Context

At the design baseline, the Workspace rooted every Approach in one exact
scientific anchor, but did not persist which Target caused the Approach to
exist. The UI therefore correctly called every Approach unbound. Current
source-owned Targets already
arrive as `WorkOffer` rows containing `target_id` and an exact rooted packet
(`packet.sha256`, path, and schema) in
`packages/observatory-data/src/index.ts`. The mutable activity database cannot
foreign-key to those SELECT-only projection rows and must not become their
authority.

The missing relationship is useful only if it preserves these facts:

- a Target is source-owned scientific direction, not a hosted activity object;
- an Approach is mutable, non-authoritative Workspace activity;
- the Target packet root identifies the exact source-owned work packet the
  user saw;
- currentness is determined by re-reading the scientific projection in the
  application, not by trusting hidden form fields or the activity database;
- an unbound Approach remains valid when work starts from Workspace Overview;
  and
- a relationship never creates Verification, acceptance, Decision, Standing,
  or an FC/community status.

## Decision

Add one optional, immutable Target binding directly to `activity.approaches`.
An Approach has exactly one of two states:

```text
unbound:
  target_id = null
  target_packet_root = null
  target_record_root = null

bound:
  target_id = non-empty source-native Target id
  target_packet_root = sha256 root of the exact source-owned packet
  target_record_root = optional sha256 root of an independently available
                       exact Target record
```

Every Approach also exposes the literal `authority_effect = "none"`. It may be
stored as a constrained column for fail-closed SQL responses or projected as a
closed constant, but the migration implementation must select one representation
and test that no other value is possible. The recommended implementation is a
`NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none')` column because raw
database/API responses then carry the nonclaim without consumer inference.

The binding is immutable. A user cannot rebind an existing Approach after a
source correction or Target packet advance. They create a successor Approach
against the current Target. A fork inherits all three binding fields from its
source Approach and keeps the same scientific anchor. Multiple Approaches may
bind the same Target; no uniqueness constraint is appropriate.

This is an activity-plane association only. No Vela protocol type, Core field,
graph authority edge, cross-database foreign key, or scientific State write is
introduced.

## Typed contract

The implementation should add a discriminated contract equivalent to:

```ts
export type ApproachTargetBinding =
  | { kind: "unbound"; targetId: null; targetPacketRoot: null; targetRecordRoot: null }
  | {
      kind: "target";
      targetId: string;
      targetPacketRoot: HashRoot;
      targetRecordRoot: HashRoot | null;
    };

export type CreateApproachInput = {
  anchor: ScientificAnchor;
  title: string;
  summary: string;
  target?: ApproachTargetBinding; // omitted remains backward-compatible unbound work
};

export type ActivityApproach = {
  // current fields remain
  target: ApproachTargetBinding;
  authorityEffect: "none";
};
```

The wire/SQL payload uses `target_id`, `target_packet_root`, and
`target_record_root`. The read parser must fail closed on partial bindings,
malformed roots, or an authority effect other than `none`. It must continue to
parse rows created by old code after the additive migration because those rows
carry the migration defaults/nulls.

## Application guard

The existing `createApproachAction` remains the explicit unbound creation path
used by Workspace Overview. Add a separate `createTargetApproachAction` for the
Target control so a missing field can never make a bound request silently fall
back to unbound. Neither action trusts Target fields posted by the browser.
After `mutationContext` reloads exact scientific State and proves
`expectedAnchorRoot`, the bound action calls a new pure guard that should:

1. require every bound field rather than accepting an omitted binding;
2. find exactly one current `state.offers` entry whose
   `target_id` matches;
3. require the posted packet root to equal `offer.packet.sha256`;
4. retain the current scientific anchor root already computed by
   `mutationContext`;
5. accept `target_record_root` only when the current source read contract
   supplies and matches it; the current `WorkOffer` does not, so the first UI
   must store `null`; and
6. classify a missing Target as `not_found` and an anchor/packet advance as a
   `conflict`, without revealing another Workspace's activity.

Conceptually:

```ts
const offer = state.offers.find((candidate) => candidate.target_id === input.targetId);
if (!offer) throw new WorkspaceMutationError("not_found");
if (offer.packet.sha256 !== input.targetPacketRoot) {
  throw new WorkspaceMutationError("conflict");
}
return {
  kind: "target",
  targetId: offer.target_id,
  targetPacketRoot: offer.packet.sha256,
  targetRecordRoot: null,
};
```

The database still validates the all-or-nothing shape and roots. It does not
claim the Target exists or is current; a compromised app credential can bypass
the application read, which remains an explicit residual risk in GOV-03.

### Server-only write gate

Target-bound creation is independently gated by
`VELA_TARGET_BOUND_APPROACH_ENABLED`. Only the exact string `true` enables the
write. An absent value, `false`, whitespace, case drift, or any malformed value
is disabled. `createTargetApproachAction` checks this gate before loading
scientific State, resolving hosted identity, or calling activity data, so a
direct form post cannot bypass the UI state. The Workspace may still read and
render exact bound rows while writes are disabled; the form is absent and the
UI says that binding-aware reads are active but Target-bound creation is
unavailable. Unbound creation remains available from Workspace Overview.

## Database migration

The implementation candidate adds the immutable, additive
`20260812_target_bound_approach.sql` after
`20260812_current_anchor_read.sql`; neither applied predecessor was rewritten.
The new migration has not been applied to Neon or any live database. It remains
frozen for review and disposable-local database proof before an operator may
run the rooted migration entrypoint.

The additive DDL should be equivalent to:

```sql
ALTER TABLE activity.approaches
  ADD COLUMN target_id text,
  ADD COLUMN target_packet_root text,
  ADD COLUMN target_record_root text,
  ADD COLUMN authority_effect text NOT NULL DEFAULT 'none';

ALTER TABLE activity.approaches
  ADD CONSTRAINT activity_approaches_target_binding_check CHECK (
    (
      target_id IS NULL
      AND target_packet_root IS NULL
      AND target_record_root IS NULL
    ) OR (
      target_id IS NOT NULL
      AND target_packet_root IS NOT NULL
      AND length(btrim(target_id)) BETWEEN 1 AND 1000
      AND target_id = btrim(target_id)
      AND target_packet_root ~ '^sha256:[0-9a-f]{64}$'
      AND (
        target_record_root IS NULL
        OR target_record_root ~ '^sha256:[0-9a-f]{64}$'
      )
    )
  ),
  ADD CONSTRAINT activity_approaches_authority_effect_check
    CHECK (authority_effect = 'none');

CREATE INDEX activity_approaches_target_idx
  ON activity.approaches
    (workspace_id, anchor_root, target_id, updated_at DESC)
  WHERE target_id IS NOT NULL;
```

The migration must also replace `activity_api.execute_command` so
`approach.create` inserts the three normalized fields and `approach.fork`
copies them from the locked source row. The command must reject a partial
binding before insertion. `get_problem_activity` already serializes
`to_jsonb(x)` and will expose the additive columns without a second reader or
database.

Do not add a cross-database foreign key, a Target table in `vela_activity`, a
trigger that reads the Observatory database, or an update/rebind command.
Privileges remain unchanged: only `vela_activity_app` may execute the reviewed
API functions, and it receives no base-table access.

## Deployment and compatibility sequence

1. Freeze the migration bytes and run the rooted migration-plan tests.
2. Keep `VELA_TARGET_BOUND_APPROACH_ENABLED` absent or exactly `false`. Through
   the migrator/owner proof path, verify the live count of
   `activity.approaches.target_id IS NOT NULL` is exactly zero. Do not broaden
   the application role's base-table privileges to perform this check.
3. Apply the additive migration through
   `VELA_ACTIVITY_MIGRATOR_DATABASE_URL` on the fixed `vela_activity` database.
   Run `activity:db:check` and `activity:db:verify`. During this zero-bound-row
   window the old application may remain deployed: its create payload omits
   binding fields and remains unbound after migration.
4. Deploy the binding-aware parser, current-offer guard, default-off action,
   and UI with writes still disabled. This reader build cannot precede the
   migration: its fail-closed parser requires the additive columns in every
   Approach row.
5. Finish the rollback-window checks against the migrated schema, including an
   old-client unbound create/read and accurate disabled UI. Then run
   `activity:db:live-proof`. The proof first reasserts that the live bound-row
   count is zero through the migrator role; it then creates and reads the first
   exact bound row, proves fork inheritance, retry/conflict behavior,
   cross-tenant denial, and audit/request-root linkage without changing app
   ACLs.
6. Once the live proof creates its bound row, advance the rollback floor: the
   only safe application rollback is this binding-aware build with the flag
   absent/false. Never deploy the pre-binding `9feb6975` reader again, because
   it would silently present retained bound provenance as unbound.
7. Run signed-out, disabled, bound, unbound, current/stale-offer, narrow-screen,
   keyboard, and forced-colors browser QA. Current/stale WorkOffer validation
   remains an application/browser proof because the activity database cannot
   read the external offer catalogue.
8. Set `VELA_TARGET_BOUND_APPROACH_ENABLED=true`, redeploy, recheck direct-post
   refusal under a temporary default-off deployment, and monitor conflict and
   authorization outcomes.

Never roll back the DDL during an incident; dropping columns would destroy
retained activity provenance. After the first bound write, disable new writes
and forward-fix from the binding-aware reader. A later removal requires a
separate retention decision and frozen export.

## UI behavior

- With the server write gate enabled, a Target object offers **Start an
  Approach from this Target** and posts its exact id and packet root. With the
  gate disabled, it keeps the rooted Target readable but renders no form and
  accurately marks creation unavailable.
- Workspace Overview retains **New unbound Approach**.
- A bound Approach remains under **Approaches and Attempts**, while its exact
  `parentId` is presented once as a keyboard-focusable **Bound to Target** link
  to the matching object under **Targets**. Cross-group relations never
  relocate Work objects into the Targets list. The relation exists only when
  both retained Target id and packet root match that offer. An id-only match
  may offer an explicitly current successor, but never asserts that the
  historical Approach belongs to the changed packet. The Approach displays
  Target id, packet root, anchor state, and `activity only` / `authority none`.
- An unbound Approach remains in the Workspace work group and is labelled
  **Unbound activity direction**.
- A stale bound Approach remains readable. It cannot start new attempts or
  promotion work; when Current State still offers the same Target id, the UI
  offers creation of a successor from the current packet without relabelling
  the historical parent.
- Forks remain in Work, retain the same exact Target relation link, and disclose
  that they inherited the exact binding. Attempts remain nested beneath their
  actual parent Approach within Work.
- No copy says verified, accepted, approved, Standing, or authoritative merely
  because a binding exists.

## Security and privacy consequences

- Exact Target and packet roots improve provenance but may reveal what a team
  is working on. They inherit Workspace visibility and do not enter anonymous
  output.
- Artifact and external-session locators remain Workspace-visible under the
  current policy. Target binding does not broaden that visibility.
- The binding joins no databases and creates no scientific authority. Deleting
  `vela_activity` cannot change Repository State or replay.
- The immutable design avoids an ambiguous history where an Approach appears
  to have always belonged to a later Target.
- Application currentness remains a critical control because the activity
  database cannot independently validate the external Target catalogue.

## Required tests before implementation is complete

### Typed/unit tests

- parse exact bound and unbound rows;
- reject partial bindings, malformed roots, empty Target ids, and any authority
  effect other than `none`;
- create-command request roots change with Target id, packet root, and record
  root;
- old call sites that omit a binding remain unbound.

### Server Action tests

- an absent, explicit-false, or malformed feature flag keeps writes disabled;
- a direct form post is refused by the feature gate before State, identity, or
  activity access;
- the unbound action creates an unbound Approach without accepting Target
  fields;
- the bound action requires every binding field and accepts a current exact
  Target and packet root;
- an unknown Target is refused;
- a current Target with a substituted or advanced packet root is refused;
- a direct form post rendered against an old anchor is refused;
- omitting a field from the bound action cannot fall back to an unbound
  Approach; and
- a supplied Target record root is refused while the current source contract
  cannot verify it.

### Migration/database tests

- an existing database migrates without rewriting current rows;
- old code can create/read an unbound Approach during the deployment window;
- bound insert, unbound insert, partial binding, malformed roots, fork
  inheritance, cross-tenant read/write, idempotent retry, and conflicting retry
  all behave as designed;
- no rebind/update command exists;
- role and cross-plane proofs remain unchanged;
- the append-only audit request root covers every binding field; and
- rerunning migration check reports an exact complete ledger.

### Browser tests

- signed-out users receive no hosted Target binding or locator;
- a default-off deployment retains binding-aware reads but renders no bound
  form and accurately labels creation unavailable;
- mixed and all-bound workloads retain the Targets and Approaches/Attempts
  headings, exact per-group counts, one object node per record, keyboard/ARIA
  relation truth, and same-group Attempt nesting;
- stale bound work remains readable but action-disabled;
- keyboard, touch, 200% zoom, reduced motion, forced colors, and print preserve
  the authority and freshness labels.

## Alternatives considered

### Store only `target_id`

Rejected. A mutable Target id cannot identify which work packet the user saw.

### Store only `target_packet_root`

Rejected. A root alone cannot give the user or source adapter a stable
source-native Target label.

### Add an activity Target table or relationship graph

Rejected. It duplicates source-owned scientific direction and invites the
activity database to become a second Target authority.

### Add a cross-plane foreign key

Rejected. The two databases deliberately have opposite role boundaries, and
the scientific projection is disposable/SELECT-only.

### Allow rebinding after a source advance

Rejected. Mutation would erase which exact Target packet originated the work.
A successor Approach is explicit and preserves correction history.

### Require every Approach to be bound

Rejected. Workspace Overview is a legitimate place to begin exploratory work,
provided the UI says it is unbound and promotion later proves an exact packet.

## Consequences and next gate

The candidate now contains the typed contract, additive migration,
current-offer Server Action guard, default-off server gate, bound/unbound UI,
parser refusal tests, expanded live-proof source, and disposable-local database
proof. This is frozen implementation evidence, not a live deployment. `WEB-01`
and `WEB-02` remain incomplete until independent review, the ordered migration
and binding-aware default-off deployment, an actual `activity:db:check` /
`activity:db:verify` / `activity:db:live-proof` run on the fixed database, and
authenticated browser evidence all pass. The migration must be reviewed on
frozen bytes before anyone runs `activity:db:migrate`.
