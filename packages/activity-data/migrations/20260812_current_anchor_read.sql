SET LOCAL ROLE vela_activity_owner;

CREATE OR REPLACE FUNCTION activity_api.get_problem_activity(
  p_account_id uuid,
  p_workspace_id uuid,
  p_repository_id text,
  p_problem_id text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  answer jsonb;
BEGIN
  PERFORM activity.require_membership(p_account_id, p_workspace_id);
  WITH anchors AS (
    SELECT * FROM activity.scientific_anchors
    WHERE workspace_id = p_workspace_id
      AND repository_id = p_repository_id
      AND problem_id = p_problem_id
  )
  SELECT jsonb_build_object(
    'anchors', coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY captured_at DESC) FROM anchors a), '[]'::jsonb),
    -- Temporary rollback compatibility for the deployed reader. New code derives
    -- current-anchor following exclusively from followedAnchorRoots below.
    'following', EXISTS (
      SELECT 1 FROM activity.follows f
      JOIN anchors a ON a.workspace_id = f.workspace_id AND a.anchor_root = f.anchor_root
      WHERE f.account_id = p_account_id
    ),
    'followedAnchorRoots', coalesce((
      SELECT jsonb_agg(f.anchor_root ORDER BY f.anchor_root)
      FROM activity.follows f JOIN anchors a
        ON a.workspace_id=f.workspace_id AND a.anchor_root=f.anchor_root
      WHERE f.account_id = p_account_id
    ), '[]'::jsonb),
    'approaches', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.updated_at DESC)
      FROM activity.approaches x JOIN anchors a
        ON a.workspace_id=x.workspace_id AND a.anchor_root=x.anchor_root), '[]'::jsonb),
    'attempts', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.updated_at DESC)
      FROM activity.attempts x JOIN anchors a
        ON a.workspace_id=x.workspace_id AND a.anchor_root=x.anchor_root), '[]'::jsonb),
    'discussion', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at)
      FROM activity.discussion_entries x JOIN anchors a
        ON a.workspace_id=x.workspace_id AND a.anchor_root=x.anchor_root
      WHERE x.visibility='workspace' OR x.author_account_id=p_account_id), '[]'::jsonb),
    'workRequests', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
      FROM activity.work_requests x JOIN anchors a
        ON a.workspace_id=x.workspace_id AND a.anchor_root=x.anchor_root), '[]'::jsonb),
    'artifacts', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
      FROM activity.artifact_refs x JOIN anchors a
        ON a.workspace_id=x.workspace_id AND a.anchor_root=x.anchor_root), '[]'::jsonb),
    'drafts', coalesce((SELECT jsonb_agg((to_jsonb(x) - 'payload') ORDER BY x.updated_at DESC)
      FROM activity.submission_drafts x JOIN anchors a
        ON a.workspace_id=x.workspace_id AND a.anchor_root=x.anchor_root), '[]'::jsonb),
    'audit', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.sequence DESC)
      FROM (SELECT l.* FROM activity.activity_audit_entries l JOIN anchors a
        ON a.workspace_id=l.workspace_id AND a.anchor_root=l.anchor_root
        ORDER BY l.sequence DESC LIMIT 100) x), '[]'::jsonb)
  ) INTO answer;
  RETURN answer;
END
$function$;

REVOKE ALL ON FUNCTION activity_api.get_problem_activity(uuid, uuid, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activity_api.get_problem_activity(uuid, uuid, text, text)
  TO vela_activity_app;
