SET LOCAL ROLE vela_activity_owner;

CREATE OR REPLACE FUNCTION activity_api.list_problem_workspaces(
  p_account_id uuid,
  p_repository_id text,
  p_problem_id text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
  SELECT coalesce(
    jsonb_agg(
      to_jsonb(w) || jsonb_build_object('role', m.role)
      ORDER BY w.name, w.id
    ),
    '[]'::jsonb
  )
  FROM activity.workspace_memberships m
  JOIN activity.workspaces w ON w.id = m.workspace_id
  WHERE m.account_id = p_account_id
    AND EXISTS (
      SELECT 1
      FROM activity.scientific_anchors a
      WHERE a.workspace_id = w.id
        AND a.repository_id = p_repository_id
        AND a.problem_id = p_problem_id
    )
$function$;

REVOKE ALL ON FUNCTION activity_api.list_problem_workspaces(uuid, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activity_api.list_problem_workspaces(uuid, text, text)
  TO vela_activity_app;
