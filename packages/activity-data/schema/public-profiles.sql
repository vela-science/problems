SET LOCAL ROLE vela_activity_owner;

/* Public profiles describe a problems.science account. They are deliberately
   separate from Vela performers, authority principals, signers, and WorkOS
   identities. The default is private; nothing becomes public by account
   creation alone. */
CREATE TABLE IF NOT EXISTS activity.public_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid UNIQUE REFERENCES activity.accounts(id) ON DELETE SET NULL,
  handle text NOT NULL UNIQUE CHECK (
    handle = lower(handle)
    AND handle ~ '^[a-z0-9](?:[a-z0-9-]{1,37}[a-z0-9])$'
    AND handle !~ '^p-'
  ),
  profile_kind text NOT NULL DEFAULT 'account' CHECK (profile_kind = 'account'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
  bio text NOT NULL DEFAULT '' CHECK (length(bio) <= 800),
  affiliation text NOT NULL DEFAULT '' CHECK (length(affiliation) <= 240),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  links jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(links) = 'object'),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'active' AND account_id IS NOT NULL)
    OR (status = 'deleted' AND account_id IS NULL AND visibility = 'private')
  )
);
ALTER TABLE activity.public_profiles
  DROP CONSTRAINT IF EXISTS activity_public_profiles_handle_namespace;
ALTER TABLE activity.public_profiles
  ADD CONSTRAINT activity_public_profiles_handle_namespace CHECK (handle !~ '^p-');

COMMENT ON TABLE activity.public_profiles IS
  'User-owned public presentation only. It grants no Vela identity, authority, reviewer independence, or Standing.';
COMMENT ON COLUMN activity.public_profiles.profile_kind IS
  'Account presentation only. It is not evidence of human, agent, organization, signer, or Vela performer kind.';

/* Deleting a hosted account removes its private presentation and exact-link
   convenience without rewriting scientific attribution or releasing its old
   handles for impersonation. */
CREATE OR REPLACE FUNCTION activity.tombstone_public_profile_for_deleted_account()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, activity
AS $function$
DECLARE tombstone_profile_id uuid;
BEGIN
  SELECT profile.id INTO tombstone_profile_id
  FROM activity.public_profiles profile
  WHERE profile.account_id=OLD.id
  FOR UPDATE;
  IF tombstone_profile_id IS NOT NULL THEN
    DELETE FROM activity.public_profile_performers link
    WHERE link.profile_id=tombstone_profile_id;
    UPDATE activity.public_profiles SET
      account_id=NULL,
      status='deleted',
      display_name='Deleted contributor',
      bio='',
      affiliation='',
      visibility='private',
      links='{}'::jsonb,
      version=version+1,
      updated_at=now()
    WHERE id=tombstone_profile_id;
  END IF;
  RETURN OLD;
END
$function$;
DROP TRIGGER IF EXISTS activity_account_profile_tombstone ON activity.accounts;
CREATE TRIGGER activity_account_profile_tombstone
BEFORE DELETE ON activity.accounts
FOR EACH ROW EXECUTE FUNCTION activity.tombstone_public_profile_for_deleted_account();

/* Handles are never reassigned. A renamed address can therefore redirect
   permanently without allowing a later account to impersonate its history. */
CREATE TABLE IF NOT EXISTS activity.public_profile_handles (
  handle text PRIMARY KEY CHECK (
    handle = lower(handle)
    AND handle ~ '^[a-z0-9](?:[a-z0-9-]{1,37}[a-z0-9])$'
    AND handle !~ '^p-'
  ),
  profile_id uuid NOT NULL REFERENCES activity.public_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  CHECK (retired_at IS NULL OR retired_at >= created_at)
);
ALTER TABLE activity.public_profile_handles
  DROP CONSTRAINT IF EXISTS activity_public_profile_handles_namespace;
ALTER TABLE activity.public_profile_handles
  ADD CONSTRAINT activity_public_profile_handles_namespace CHECK (handle !~ '^p-');
CREATE UNIQUE INDEX IF NOT EXISTS activity_public_profile_current_handle_idx
  ON activity.public_profile_handles (profile_id) WHERE retired_at IS NULL;

/* Only exact, separately verified joins enter this table. No public account
   form writes it. Removing an account removes the convenience link while the
   immutable scientific records continue naming their original performer. */
CREATE TABLE IF NOT EXISTS activity.public_profile_performers (
  profile_id uuid NOT NULL REFERENCES activity.public_profiles(id) ON DELETE CASCADE,
  performer_id text NOT NULL UNIQUE CHECK (length(btrim(performer_id)) BETWEEN 1 AND 400),
  performer_kind text NOT NULL CHECK (performer_kind IN ('human', 'agent', 'organization')),
  verification_kind text NOT NULL CHECK (verification_kind IN ('signed_record', 'connected_github', 'connected_orcid', 'source_owner')),
  evidence_locator text NOT NULL CHECK (
    length(evidence_locator) BETWEEN 1 AND 2000
    AND evidence_locator ~ '^https://'
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, performer_id)
);

CREATE OR REPLACE FUNCTION activity.profile_handle_valid(p_handle text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
  SELECT p_handle = lower(p_handle)
    AND p_handle ~ '^[a-z0-9](?:[a-z0-9-]{1,37}[a-z0-9])$'
    AND p_handle !~ '^p-'
    AND p_handle NOT IN (
      'account', 'admin', 'api', 'auth', 'help', 'people', 'problems',
      'problems-science', 'root', 'security', 'support', 'system', 'vela'
    )
$function$;

CREATE OR REPLACE FUNCTION activity.profile_links_valid(p_links jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
  SELECT jsonb_typeof(p_links) = 'object'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_each(p_links) link
      WHERE link.key NOT IN ('github', 'orcid', 'website', 'lab')
        OR jsonb_typeof(link.value) <> 'string'
        OR length(link.value #>> '{}') NOT BETWEEN 8 AND 500
        OR link.value #>> '{}' !~ '^https://'
    )
$function$;

CREATE OR REPLACE FUNCTION activity_api.get_account_profile(p_account_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE answer jsonb;
BEGIN
  SELECT to_jsonb(profile) || jsonb_build_object(
    'handles', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'handle', handle.handle,
        'created_at', handle.created_at,
        'retired_at', handle.retired_at
      ) ORDER BY handle.created_at DESC)
      FROM activity.public_profile_handles handle
      WHERE handle.profile_id=profile.id
    ), '[]'::jsonb),
    'performers', coalesce((
      SELECT jsonb_agg(to_jsonb(link) - 'profile_id' ORDER BY link.performer_id)
      FROM activity.public_profile_performers link
      WHERE link.profile_id=profile.id
    ), '[]'::jsonb)
  ) INTO answer
  FROM activity.public_profiles profile
  WHERE profile.account_id=p_account_id
    AND profile.status='active';
  RETURN answer;
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.get_public_profile(
  p_handle text,
  p_viewer_account_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE answer jsonb;
BEGIN
  SELECT (to_jsonb(profile) - 'account_id') || jsonb_build_object(
    'requested_handle', requested.handle,
    'redirect', requested.handle <> profile.handle,
    'owner_preview', p_viewer_account_id IS NOT NULL AND profile.account_id=p_viewer_account_id,
    'performers', coalesce((
      SELECT jsonb_agg(to_jsonb(link) - 'profile_id' ORDER BY link.performer_id)
      FROM activity.public_profile_performers link
      WHERE link.profile_id=profile.id
    ), '[]'::jsonb)
  ) INTO answer
  FROM activity.public_profile_handles requested
  JOIN activity.public_profiles profile ON profile.id=requested.profile_id
  WHERE requested.handle=lower(p_handle)
    AND profile.status='active'
    AND (
      profile.visibility IN ('public', 'unlisted')
      OR (p_viewer_account_id IS NOT NULL AND profile.account_id=p_viewer_account_id)
    );
  RETURN answer;
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.get_profile_for_performer(p_performer_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
  SELECT (to_jsonb(profile) - 'account_id') || jsonb_build_object(
    'linked_performer_id', link.performer_id,
    'linked_performer_kind', link.performer_kind
  )
  FROM activity.public_profile_performers link
  JOIN activity.public_profiles profile ON profile.id=link.profile_id
  WHERE link.performer_id=p_performer_id
    AND profile.status='active'
    AND profile.visibility='public'
$function$;

CREATE OR REPLACE FUNCTION activity_api.save_public_profile(
  p_account_id uuid,
  p_profile jsonb,
  p_expected_version bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  current_profile activity.public_profiles%ROWTYPE;
  answer activity.public_profiles%ROWTYPE;
  requested_handle text := lower(btrim(p_profile->>'handle'));
  requested_name text := btrim(p_profile->>'display_name');
  requested_bio text := coalesce(btrim(p_profile->>'bio'), '');
  requested_affiliation text := coalesce(btrim(p_profile->>'affiliation'), '');
  requested_visibility text := coalesce(p_profile->>'visibility', 'private');
  requested_links jsonb := coalesce(p_profile->'links', '{}'::jsonb);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM activity.accounts account WHERE account.id=p_account_id) THEN
    RAISE EXCEPTION 'account not found' USING ERRCODE='VA404';
  END IF;
  IF NOT activity.profile_handle_valid(requested_handle) THEN
    RAISE EXCEPTION 'public profile handle is invalid or reserved' USING ERRCODE='22023';
  END IF;
  IF length(requested_name) NOT BETWEEN 1 AND 120
    OR length(requested_bio) > 800
    OR length(requested_affiliation) > 240
    OR requested_visibility NOT IN ('private', 'unlisted', 'public')
    OR NOT activity.profile_links_valid(requested_links) THEN
    RAISE EXCEPTION 'public profile fields are invalid' USING ERRCODE='22023';
  END IF;

  SELECT * INTO current_profile FROM activity.public_profiles
  WHERE account_id=p_account_id AND status='active' FOR UPDATE;

  IF current_profile.id IS NULL THEN
    IF p_expected_version IS NOT NULL AND p_expected_version <> 0 THEN
      RAISE EXCEPTION 'public profile version conflict' USING ERRCODE='VACAS';
    END IF;
    IF EXISTS (SELECT 1 FROM activity.public_profile_handles handle WHERE handle.handle=requested_handle) THEN
      RAISE EXCEPTION 'public profile handle is unavailable' USING ERRCODE='VA409';
    END IF;
    INSERT INTO activity.public_profiles (
      account_id, handle, display_name, bio, affiliation, visibility, links
    ) VALUES (
      p_account_id, requested_handle, requested_name, requested_bio,
      requested_affiliation, requested_visibility, requested_links
    ) RETURNING * INTO answer;
    INSERT INTO activity.public_profile_handles (handle, profile_id)
    VALUES (requested_handle, answer.id);
  ELSE
    IF p_expected_version IS NULL OR p_expected_version <> current_profile.version THEN
      RAISE EXCEPTION 'public profile version conflict' USING ERRCODE='VACAS';
    END IF;
    IF requested_handle <> current_profile.handle THEN
      IF EXISTS (SELECT 1 FROM activity.public_profile_handles handle WHERE handle.handle=requested_handle) THEN
        RAISE EXCEPTION 'public profile handle is unavailable' USING ERRCODE='VA409';
      END IF;
      UPDATE activity.public_profile_handles SET retired_at=now()
      WHERE profile_id=current_profile.id AND retired_at IS NULL;
      INSERT INTO activity.public_profile_handles (handle, profile_id)
      VALUES (requested_handle, current_profile.id);
    END IF;
    UPDATE activity.public_profiles SET
      handle=requested_handle,
      display_name=requested_name,
      bio=requested_bio,
      affiliation=requested_affiliation,
      visibility=requested_visibility,
      links=requested_links,
      version=version+1,
      updated_at=now()
    WHERE id=current_profile.id
    RETURNING * INTO answer;
  END IF;
  RETURN to_jsonb(answer) - 'account_id';
END
$function$;

REVOKE ALL ON activity.public_profiles, activity.public_profile_handles, activity.public_profile_performers
  FROM PUBLIC, vela_activity_app;
REVOKE ALL ON FUNCTION activity.profile_handle_valid(text), activity.profile_links_valid(jsonb)
  FROM PUBLIC, vela_activity_app;
REVOKE ALL ON FUNCTION activity.tombstone_public_profile_for_deleted_account()
  FROM PUBLIC, vela_activity_app;
REVOKE ALL ON FUNCTION activity_api.get_account_profile(uuid), activity_api.get_public_profile(text,uuid),
  activity_api.get_profile_for_performer(text), activity_api.save_public_profile(uuid,jsonb,bigint)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activity_api.get_account_profile(uuid), activity_api.get_public_profile(text,uuid),
  activity_api.get_profile_for_performer(text), activity_api.save_public_profile(uuid,jsonb,bigint)
  TO vela_activity_app;
