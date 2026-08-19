"use server";

import { revalidatePath } from "next/cache";
import { ActivityDataError } from "@vela/activity-data";
import { currentActivityAccount, updateAccountProfile } from "@/lib/hosted-account";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
  handle?: string;
  version?: number;
};

function field(form: FormData, name: string, max: number): string {
  const value = form.get(name);
  if (typeof value !== "string" || value.length > max) throw new Error(`${name} is invalid`);
  return value;
}

export async function savePublicProfileAction(
  _previous: ProfileActionState,
  form: FormData,
): Promise<ProfileActionState> {
  const account = await currentActivityAccount();
  if (!account) return { status: "error", message: "Your session expired. Sign in again before saving." };
  const versionValue = field(form, "version", 24).trim();
  const expectedVersion = versionValue ? Number(versionValue) : 0;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    return { status: "error", message: "This profile version is invalid. Reload the page and try again." };
  }
  try {
    const profile = await updateAccountProfile(account.activity.id, {
      handle: field(form, "handle", 80),
      displayName: field(form, "displayName", 160),
      bio: field(form, "bio", 1_000),
      affiliation: field(form, "affiliation", 300),
      visibility: field(form, "visibility", 20) as "private" | "unlisted" | "public",
      links: {
        github: field(form, "github", 600),
        orcid: field(form, "orcid", 600),
        website: field(form, "website", 600),
        lab: field(form, "lab", 600),
      },
    }, expectedVersion || null);
    revalidatePath("/account");
    revalidatePath(`/people/${profile.handle}`);
    revalidatePath("/account/profile");
    return { status: "success", message: "Public profile settings saved.", handle: profile.handle, version: profile.version };
  } catch (error) {
    if (error instanceof ActivityDataError && error.code === "conflict") {
      return { status: "error", message: "That handle is unavailable or the profile changed in another tab. Reload and try again." };
    }
    if ((error instanceof ActivityDataError && error.code === "invalid") || (error instanceof Error && !(error instanceof ActivityDataError))) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "The profile could not be saved. Your account and scientific records were not changed." };
  }
}
