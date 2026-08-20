import Link from "next/link";
import { ArrowLeft01Icon as ArrowLeft, GitForkIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Button } from "@vela/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from "@vela/ui/components/empty";

export function RepositoryNotProjected({ repository }: { repository: ReactNode }) {
  return (
    <div className="grid min-h-[60svh] content-center">
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon"><HugeiconsIcon icon={GitForkIcon} aria-hidden /></EmptyMedia>
          <p className="font-mono text-meta text-primary">Repository not projected</p>
          <h1 className="text-display [overflow-wrap:anywhere]">Repository “{repository}” is not published here.</h1>
          <EmptyDescription>
            This exact Problems release contains no Repository under that scope. No source, state, or Standing was inferred from another Repository.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button nativeButton={false} render={<Link href="/repositories" />}>
            <HugeiconsIcon icon={ArrowLeft} aria-hidden />
            Read published repositories
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
