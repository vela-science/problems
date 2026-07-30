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
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      onClick={copy}
      aria-label={stateLabel}
      className="bg-transparent"
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
