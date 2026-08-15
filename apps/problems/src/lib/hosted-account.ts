import "server-only";

import { ensureCurrentAccount } from "@vela/activity-data";
import { currentAccount } from "./auth";

export async function currentActivityAccount() {
  const hosted = await currentAccount();
  if (!hosted) return null;
  const activity = await ensureCurrentAccount({ workosUserId: hosted.id, displayName: hosted.displayName, email: hosted.email });
  return { hosted, activity };
}
