SET LOCAL ROLE vela_activity_owner;

CREATE FUNCTION activity.enforce_problem_scoped_approach()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, activity
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.target_id IS DISTINCT FROM OLD.target_id
    OR NEW.target_packet_root IS DISTINCT FROM OLD.target_packet_root
    OR NEW.target_record_root IS DISTINCT FROM OLD.target_record_root
  ) THEN
    RAISE EXCEPTION 'retained Approach binding is immutable and unavailable to current writers'
      USING ERRCODE='22023';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.parent_approach_id IS NOT NULL THEN
    NEW.target_id := NULL;
    NEW.target_packet_root := NULL;
    NEW.target_record_root := NULL;
  ELSIF NEW.target_id IS NOT NULL
    OR NEW.target_packet_root IS NOT NULL
    OR NEW.target_record_root IS NOT NULL
  THEN
    RAISE EXCEPTION 'new Approaches are scoped to the exact Problem anchor, not a retired Target binding'
      USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER enforce_problem_scoped_approach
BEFORE INSERT OR UPDATE ON activity.approaches
FOR EACH ROW EXECUTE FUNCTION activity.enforce_problem_scoped_approach();

CREATE FUNCTION activity.freeze_retired_execution_lineage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, activity
AS $function$
BEGIN
  IF NEW.execution_packet_root IS NOT NULL
    OR NEW.execution_profile_root IS NOT NULL
    OR NEW.execution_verifier_capsule_root IS NOT NULL
    OR NEW.execution_result_contract_root IS NOT NULL
  THEN
    RAISE EXCEPTION 'retired execution binding is read-only; current activity is Problem-scoped'
      USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER freeze_retired_attempt_execution_lineage
BEFORE INSERT OR UPDATE ON activity.attempts
FOR EACH ROW EXECUTE FUNCTION activity.freeze_retired_execution_lineage();

CREATE TRIGGER freeze_retired_artifact_execution_lineage
BEFORE INSERT OR UPDATE ON activity.artifact_refs
FOR EACH ROW EXECUTE FUNCTION activity.freeze_retired_execution_lineage();

CREATE TRIGGER freeze_retired_draft_execution_lineage
BEFORE INSERT OR UPDATE ON activity.submission_drafts
FOR EACH ROW EXECUTE FUNCTION activity.freeze_retired_execution_lineage();

REVOKE ALL ON FUNCTION activity.enforce_problem_scoped_approach() FROM PUBLIC;
REVOKE ALL ON FUNCTION activity.freeze_retired_execution_lineage() FROM PUBLIC;

COMMENT ON FUNCTION activity.enforce_problem_scoped_approach() IS
  'Preserves old bound rows as immutable history while making every new Approach Problem-scoped.';
COMMENT ON FUNCTION activity.freeze_retired_execution_lineage() IS
  'Refuses new execution-binding lineage without rewriting retained historical rows.';
