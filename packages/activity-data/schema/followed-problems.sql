SET LOCAL ROLE vela_activity_owner;

/* Every Problem this account watches, across the workspaces it belongs to.
 *
 * A follow already binds to one exact anchor, and `get_problem_activity`
 * already reads the follows for one Problem. What had no read at all was the
 * other direction — "what am I watching" — so a watch could only be discovered
 * by revisiting the Problem that set it, which is the one circumstance in which
 * a watch is worth nothing.
 *
 * This adds a read and nothing else. No table, no column, no command, and no
 * notification record: what a reader is told is derived at read time by
 * comparing the anchor retained here against the current projection, in the
 * application, on the exact-state plane's own terms.
 *
 * Two tenancy properties, both load-bearing. The membership join is the guard —
 * a follow whose membership has since been revoked stops being readable,
 * matching every other activity read in this schema. And DISTINCT ON keeps the
 * EARLIEST follow per Problem, because the question a watch answers is "what
 * has changed since I started watching", and the earliest anchor is the one
 * that fixes the state this account has actually seen. */
CREATE OR REPLACE FUNCTION activity_api.list_followed_problems(p_account_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
  SELECT coalesce(jsonb_agg(entry ORDER BY followed_at DESC, repository_id, problem_id), '[]'::jsonb)
  FROM (
    SELECT DISTINCT ON (a.repository_id, a.problem_id)
      a.repository_id,
      a.problem_id,
      f.created_at AS followed_at,
      jsonb_build_object(
        'workspace_id', f.workspace_id,
        'workspace_name', w.name,
        'followed_at', f.created_at,
        'anchor', to_jsonb(a)
      ) AS entry
    FROM activity.follows f
    JOIN activity.workspace_memberships m
      ON m.workspace_id = f.workspace_id AND m.account_id = f.account_id
    JOIN activity.workspaces w ON w.id = f.workspace_id
    JOIN activity.scientific_anchors a
      ON a.workspace_id = f.workspace_id AND a.anchor_root = f.anchor_root
    WHERE f.account_id = p_account_id
    ORDER BY a.repository_id, a.problem_id, f.created_at
  ) followed
$function$;

REVOKE ALL ON FUNCTION activity_api.list_followed_problems(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activity_api.list_followed_problems(uuid) TO vela_activity_app;
