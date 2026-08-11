import "server-only";

import { neon } from "@neondatabase/serverless";

export function activityDatabaseUrl(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const value = environment.VELA_ACTIVITY_DATABASE_URL?.trim();
  if (!value) throw new Error("VELA_ACTIVITY_DATABASE_URL is required for activity reads and writes");
  return value;
}

export function activitySql() {
  return neon(activityDatabaseUrl());
}
