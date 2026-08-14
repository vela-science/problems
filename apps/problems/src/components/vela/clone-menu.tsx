"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, SourceCodeIcon } from "@hugeicons/core-free-icons";
import { Button } from "@vela/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@vela/ui/components/popover";
import { CopyButton } from "@vela/ui/vela/copy-button";

/* The source-custody affordance, in the position GitHub puts its Code button
 * and Hugging Face puts "Use this model".
 *
 * A Repository remains ordinary Git state, and access is declared separately.
 * The current canonical Math Repository is public, so its registry-derived
 * command is an anonymous clone of the one declared locator.
 *
 * The exact commit is pinned in the command, so what a reader clones is the
 * checkout this release was built from, not whatever HEAD happens to be. */

export function CloneMenu({
  remote,
  cloneCommand,
  commit,
  reproduceHref,
}: {
  remote: string;
  cloneCommand: string;
  commit: string;
  reproduceHref: string;
}) {
  const directory = remote.split("/").at(-1)?.replace(/\.git$/u, "") ?? "repository";
  const command = `${cloneCommand}\ncd ${directory}\ngit checkout ${commit}`;
  const authenticated = cloneCommand.includes("gh auth status");
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        <HugeiconsIcon icon={SourceCodeIcon} aria-hidden />
        Get source
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(28rem,calc(100vw-2rem))] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-eyebrow uppercase text-muted-foreground">
            {authenticated ? "Authorized checkout at this release" : "Checkout at this release"}
          </h3>
          <CopyButton compact value={command} label="Copy source checkout commands" />
        </div>
        <pre className="mt-2 overflow-x-auto rounded-md bg-command p-3 text-micro leading-5 text-command-foreground">
          <code>{command}</code>
        </pre>
        <p className="mt-2 text-micro text-muted-foreground">
          {authenticated
            ? "Requires a GitHub account authorized for this private source. No credential is embedded in the command."
            : "Pinned to the exact commit this release was built from."}
        </p>
        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start px-0"
          render={<Link href={reproduceHref} />}
        >
          Verify and replay it →
        </Button>
      </PopoverContent>
    </Popover>
  );
}
