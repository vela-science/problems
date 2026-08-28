"use client";

import { useState } from "react";
import { Copy01Icon as Copy, Tick02Icon as Check } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function CopyButton({
  value,
  label = "Copy commands",
  compact = false,
}: {
  value: string;
  label?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "success" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("success");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
    }
  }

  const stateLabel = state === "success" ? "Copied" : state === "error" ? "Copy failed" : label;
  const control = (
    <Button
      type="button"
      /* Ghost, not outline. An outline says "find me"; this sits at a fixed
         place beside the value it copies, so its position already teaches it,
         and a bordered square repeated beside every root on a Problem page is
         five boxes of chrome saying one thing. */
      variant="ghost"
      size={compact ? "icon-sm" : "sm"}
      onClick={copy}
      aria-label={stateLabel}
      className={compact ? "bg-transparent " : "bg-transparent"}
    >
      {state === "success" ? <HugeiconsIcon icon={Check} aria-hidden /> : <HugeiconsIcon icon={Copy} aria-hidden />}
      {compact ? null : stateLabel}
    </Button>
  );

  return compact ? (
    <Tooltip>
      <TooltipTrigger render={control} />
      <TooltipContent>{stateLabel}</TooltipContent>
    </Tooltip>
  ) : control;
}
