"use client";

import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  BellDotIcon,
  BellIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@vela/ui/components/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@vela/ui/components/item";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@vela/ui/components/sheet";

export type PublishedReviewQueue = {
  slug: string;
  name: string;
  pending: number;
};

export function NotificationCenter({ repositories }: { repositories: PublishedReviewQueue[] }) {
  const pending = repositories.filter((repository) => repository.pending > 0);
  const pendingCount = pending.reduce((total, repository) => total + repository.pending, 0);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative size-11 md:size-8"
            aria-label={pendingCount ? `Notifications, ${pendingCount} pending` : "Notifications"}
          />
        }
      >
        <HugeiconsIcon icon={pendingCount ? BellDotIcon : BellIcon} aria-hidden />
        {pendingCount ? (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-status-caution ring-2 ring-background md:right-1 md:top-1"
          />
        ) : null}
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Proposals awaiting a Decision in this exact Problems release.</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          {pending.length ? (
            <ItemGroup className="divide-y">
              {pending.map((repository) => (
                <Item
                  key={repository.slug}
                  size="sm"
                  className="rounded-none px-0 py-3"
                  render={<Link href={`/repositories/${repository.slug}/proposals`} />}
                >
                  <ItemMedia variant="icon">
                    <HugeiconsIcon icon={Shield01Icon} aria-hidden />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{repository.name}</ItemTitle>
                    <ItemDescription>
                      {repository.pending} pending {repository.pending === 1 ? "Proposal" : "Proposals"} require a Decision.
                    </ItemDescription>
                  </ItemContent>
                  <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 text-muted-foreground" />
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <Empty className="border-0 px-3 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={BellIcon} aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No Proposal needs attention</EmptyTitle>
                <EmptyDescription>
                  Every projected Proposal has a terminal Decision in the current release.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        <SheetFooter className="border-t sm:flex-row">
          <Button nativeButton={false} variant="outline" className="flex-1" render={<Link href="/decisions" />}>
            Open decisions
          </Button>
          <Button nativeButton={false} className="flex-1" render={<Link href="/proposals" />}>
            Open proposals
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
