import Link from "next/link";

export function ModeSwitcher({ repository, problem, mode }: { repository: string; problem: string; mode: "state" | "work" }) {
  const href = (next: "state" | "work") => `/p/${repository}/${problem}?mode=${next}`;
  return <nav aria-label="Problem mode" className="inline-grid grid-cols-2 border bg-muted/40 p-1">
    {(["state", "work"] as const).map((item) => <Link
      key={item}
      href={href(item)}
      aria-current={mode === item ? "page" : undefined}
      className={`min-w-28 px-4 py-2 text-center text-label capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${mode === item ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >{item}</Link>)}
  </nav>;
}
