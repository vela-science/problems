import { CopyButton } from "./copy-button";

export function ExactValue({ value, label = "value", className = "" }: { value: string; label?: string; className?: string }) {
  return (
    <span className={`flex w-full min-w-0 max-w-full flex-col items-start gap-2 sm:flex-row sm:items-start ${className}`}>
      <span className="block min-w-0 max-w-full flex-1 font-mono text-xs leading-5 break-words tabular-nums [overflow-wrap:anywhere]">{value}</span>
      <CopyButton value={value} label={`Copy ${label}`} compact />
    </span>
  );
}
