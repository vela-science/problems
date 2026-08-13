# WorkOS hosted authority boundary

Status: adopted integration guidance, 2026-08-13

WorkOS authenticates hosted actors and can authorize actions inside the
Problems.science application. Vela Repository policy authorizes scientific
Decisions. The application must preserve that separation.

## Current implementation

`apps/observatory/src/lib/auth.ts` uses AuthKit and maps a signed-in WorkOS user
to one hosted Account. The activity database owns Workspace membership,
tenant checks, immutable scientific anchors, request roots, idempotency, and
its append-only audit. Hosted code has no Vela authority key, Verification
writer, Decision writer, or Standing table.

AuthKit 4.3.1 already returns more session context than the application uses:
session ID, organization ID, role and permission slugs, authentication method,
and an optional impersonator record. Discarding those fields is acceptable for
the current single-account pilot. It becomes insufficient when the product
adds organization administration, support impersonation, delegated agents, or
resource-scoped hosted permissions.

## Concepts to adopt

### Stable permission vocabulary

WorkOS assigns immutable slugs to roles and permissions. If Problems.science
adds hosted authorization beyond the existing owner/member matrix, use
resource-action permissions such as `workspace:view`, `workspace:contribute`,
and `workspace:admin`. Keep the check at the Server Action and database
boundary. A WorkOS permission may authorize hosted activity only.

### Complete hosted actor context

Before enabling impersonation, organization administration, or delegated
agent access, retain a bounded authentication context with each activity
request:

- WorkOS user and session identity;
- active organization, role, and permission slugs;
- authentication method;
- impersonation flag, administrator identity, and stated reason;
- delegated-agent identity and the subset of user permissions granted to it.

Treat this context as private activity provenance. Do not publish it in the
scientific projection. Do not copy access or refresh tokens into the database.

### Replayable identity synchronization

WorkOS recommends its ordered Events API for state synchronization. Use it if
Problems.science later mirrors organizations or memberships. Store the event
cursor, upsert by WorkOS object ID, and process retries idempotently. Webhooks
remain suitable for wake-up signals, but they can arrive more than once and out
of order.

### Audit event shape

WorkOS Audit Logs model an event with an actor, targets, action, context, and an
idempotency key. That shape matches the existing activity audit. Keep the Neon
audit as the product's exact write ledger; export selected operational events
to WorkOS only when an organization needs its own audit stream. The export is a
projection and cannot replace the rooted request record.

### CLI and agent authentication

WorkOS CLI Auth implements OAuth device authorization. WorkOS Connect exposes
OAuth and MCP authorization-server metadata, scopes, PKCE, and machine-to-machine
applications. These are useful for a future hosted Problems.science CLI or MCP
server. They authenticate a remote client to hosted tools. They do not grant a
Vela Repository signer or scientific Decision capability.

## Concepts to defer

Do not move the current Workspace membership matrix into WorkOS FGA yet. The
Neon policy already enforces tenant isolation and exact lineage, while the
pilot has no organization hierarchy or resource-specific role requirement.
Adding FGA now would create a second mutable authorization source and a sync
failure mode.

Adopt FGA after a real requirement needs at least one of these:

- organization-managed membership or custom roles;
- different permissions for individual Workspaces;
- delegated agent, tool, or dataset access;
- inheritance across an organization and its Workspace resources.

At that point, register hosted resources using application-owned external IDs,
keep the hierarchy shallow, and require an agent acting for a user to receive a
strict subset of that user's access. Continue to derive scientific authority
only from the exact Repository policy and authority transaction.

## Invariants

1. A WorkOS session proves hosted authentication, not a Vela actor signature.
2. A role, permission, FGA assignment, or OAuth scope authorizes hosted actions
   only.
3. An AuthKit organization is a hosted tenant, not a Vela Repository.
4. A WorkOS audit event reports application activity and cannot change Standing.
5. Impersonated and delegated sessions must remain visibly attributed.
6. A hosted agent receives no more access than its delegating principal.

## Sources

- [AuthKit](https://workos.com/docs/authkit/overview)
- [Role-Based Access Control](https://workos.com/docs/rbac)
- [RBAC configuration](https://workos.com/docs/rbac/configuration)
- [Fine-Grained Authorization](https://workos.com/docs/fga/query-language)
- [FGA resource types](https://workos.com/docs/fga/resource-types)
- [Audit Logs](https://workos.com/docs/audit-logs)
- [Events data syncing](https://workos.com/docs/events/data-syncing)
- [Webhook delivery semantics](https://workos.com/docs/events/data-syncing/webhooks)
- [CLI Auth](https://workos.com/docs/authkit/cli-auth)
- [WorkOS CLI](https://workos.com/docs/authkit/cli-installer)
- [OAuth authorization-server metadata](https://workos.com/docs/reference/workos-connect/metadata/oauth-authorization-server)
