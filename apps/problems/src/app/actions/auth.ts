"use server";

import { signOut } from "@workos-inc/authkit-nextjs";
import { accountReturnTo } from "@/lib/auth";

export async function signOutAccount() {
  const returnTo = accountReturnTo();
  if (!returnTo) return;
  await signOut({ returnTo });
}
