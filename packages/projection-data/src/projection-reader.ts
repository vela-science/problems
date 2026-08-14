/**
 * The Problems read boundary has two distinct role identities.
 *
 * Grants attach to the stable NOLOGIN permission role so credentials can rotate
 * without rewriting the projection schema. Hosted and integration readers
 * connect only as the versioned login, which inherits that permission role.
 */
export const projectionReaderIdentity = Object.freeze({
  database: "vela_projection",
  loginRole: "vela_projection_reader_20260813",
  permissionRole: "vela_projection_reader",
});
