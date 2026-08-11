export function ExactRoot({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
    <dt className="text-eyebrow uppercase text-muted-foreground">{label}</dt>
    <dd className="min-w-0 break-all font-mono text-meta" title={value}>{value}</dd>
  </div>;
}
