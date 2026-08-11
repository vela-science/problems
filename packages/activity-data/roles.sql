-- Bootstrap once on the existing Neon project main branch as its administrative
-- role. Passwords are provisioned by Neon and are never retained in this repo.
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vela_activity_owner') THEN
    CREATE ROLE vela_activity_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vela_activity_migrator') THEN
    CREATE ROLE vela_activity_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vela_activity_app') THEN
    CREATE ROLE vela_activity_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$roles$;

GRANT vela_activity_owner TO vela_activity_migrator;

-- This file intentionally contains no CREATE DATABASE or database-specific
-- grants. Create vela_activity as one standalone autocommit statement, then
-- apply database-privileges.sql while connected to it.
