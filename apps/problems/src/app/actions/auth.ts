"use server";

import { signOut } from "@workos-inc/authkit-nextjs";
import { signOutReturnTo } from "@/lib/auth";

export async function signOutAccount() {
  const returnTo = signOutReturnTo();
  if (returnTo) await signOut({ returnTo });
}
