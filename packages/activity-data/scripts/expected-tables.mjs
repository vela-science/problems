/* The activity plane's table inventory, in one place.

   Both the schema check and the live proof assert against this list. They used
   to hold it twice — schema.mjs by name and live-proof.mjs as a bare count —
   and the second copy is invisible to every gate that runs without a database,
   so adding a table passed review and failed mid-release instead. */
export const expectedTables = [
  "accounts",
  "activity_audit_entries",
  "approaches",
  "artifact_refs",
  "attempts",
  "connected_codebases",
  "discussion_entries",
  "follows",
  "github_installation_repositories",
  "github_installations",
  "github_webhook_deliveries",
  "idempotency_records",
  "pilot_telemetry",
  "public_profile_handles",
  "public_profile_performers",
  "public_profiles",
  "scientific_anchors",
  "submission_drafts",
  "workspace_crdt_updates",
  "workspace_memberships",
  "workspaces",
];
