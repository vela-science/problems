"use client";

import { useRef } from "react";
import Link from "next/link";
import { signOutAccount } from "@/app/actions/auth";
import {
  Login03Icon as LogIn,
  Logout03Icon as LogOut,
  UserCircleIcon as UserCircle,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button, buttonVariants } from "@vela/ui/components/button";
import { cn } from "@vela/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@vela/ui/components/dropdown-menu";
import { useAccountState } from "@/components/vela/account-state";

export function AccountMenu() {
  const state = useAccountState();
  const signOutForm = useRef<HTMLFormElement>(null);
  if (state.status === "unavailable") return null;
  if (state.status === "loading") {
    return <span aria-label="Loading account" className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />;
  }
  if (state.status === "signed_out") {
    return (
      /* Signing in navigates, so this is a link and carries a link's role.
         Routing it through `Button` made Base UI put `role="button"` on an
         `<a href>` and warn on every page in the application, because the
         header shell renders this control everywhere. Borrowing the variants
         keeps it identical to look at while `account-menu.test.tsx`'s
         `findByRole("link")` — which was already asserting the truth — passes
         unchanged. */
      <Link
        href="/sign-in"
        prefetch={false}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-11 min-w-11 gap-2 px-2.5 shadow-none md:h-8 md:min-w-0",
        )}
      >
        <HugeiconsIcon icon={LogIn} aria-hidden className="size-4" />
        {/* Below `sm` the label is hidden, which left an icon-only link with
            no accessible name on every page in the application. `sr-only`
            keeps the name in the accessibility tree at every width instead of
            removing it from the document. */}
        <span className="sr-only sm:not-sr-only sm:inline">Sign in</span>
      </Link>
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
          <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-foreground text-micro font-semibold text-background">
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
          <DropdownMenuItem className="min-h-9" render={<Link href="/my-work" prefetch={false} />}>
            My work
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-9" render={<Link href="/account" prefetch={false} />}>
            <HugeiconsIcon icon={UserCircle} aria-hidden />
            Account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Also in the sidebar, because these must be reachable signed out. */}
          <DropdownMenuItem className="min-h-9" render={<Link href="/privacy" prefetch={false} />}>Privacy</DropdownMenuItem>
          <DropdownMenuItem className="min-h-9" render={<Link href="/terms" prefetch={false} />}>Terms</DropdownMenuItem>
          <DropdownMenuItem className="min-h-9" render={<Link href="/about" prefetch={false} />}>About</DropdownMenuItem>
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
