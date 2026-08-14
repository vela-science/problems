"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOutAccount } from "@/app/actions/auth";
import {
  Login03Icon as LogIn,
  Logout03Icon as LogOut,
  UserCircleIcon as UserCircle,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@vela/ui/components/dropdown-menu";

type AccountState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "signed_out" }
  | { status: "signed_in"; account: { displayName: string; email: string; initials: string } };

function isAccountState(value: unknown): value is Exclude<AccountState, { status: "loading" }> {
  if (!value || typeof value !== "object" || !("status" in value)) return false;
  const record = value as Record<string, unknown>;
  if (record.status === "unavailable" || record.status === "signed_out") return true;
  if (record.status !== "signed_in" || !record.account || typeof record.account !== "object") return false;
  const account = record.account as Record<string, unknown>;
  return [account.displayName, account.email, account.initials].every((field) => typeof field === "string");
}

export function AccountMenu({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<AccountState>({ status: "loading" });
  const signOutForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    void fetch("/api/account", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("account request failed");
        const value: unknown = await response.json();
        if (!isAccountState(value)) throw new Error("invalid account response");
        if (current) setState(value);
      })
      .catch(() => {
        if (current) setState({ status: "unavailable" });
      });
    return () => { current = false; };
  }, [enabled]);

  if (!enabled) return null;
  if (state.status === "unavailable") return null;
  if (state.status === "loading") {
    return <span aria-label="Loading account" className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />;
  }
  if (state.status === "signed_out") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-11 min-w-11 gap-2 px-2.5 shadow-none md:h-8 md:min-w-0"
        render={<Link href="/sign-in" prefetch={false} />}
      >
        <HugeiconsIcon icon={LogIn} aria-hidden className="size-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  const { account } = state;
  return (
    <>
      <form id="vela-account-sign-out" ref={signOutForm} action={signOutAccount} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 rounded-full md:size-8"
              aria-label={`Open account menu for ${account.displayName}`}
            />
          )}
        >
          <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-foreground text-[0.6875rem] font-semibold text-background">
            {account.initials}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-2 normal-case">
              <span className="block truncate text-compact font-medium text-foreground">{account.displayName}</span>
              <span className="mt-0.5 block truncate font-normal text-muted-foreground">{account.email}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-9" render={<Link href="/account" prefetch={false} />}>
            <HugeiconsIcon icon={UserCircle} aria-hidden />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-9 w-full"
            onClick={() => signOutForm.current?.requestSubmit()}
            render={<button type="button" />}
          >
            <HugeiconsIcon icon={LogOut} aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
