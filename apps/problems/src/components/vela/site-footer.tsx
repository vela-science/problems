import Link from "next/link";

/* Public orientation in one quiet landmark. Exact record routes remain
 * reachable from their context; the footer names stable product, trust, and
 * provenance destinations rather than repeating the internal object model. */
const GROUPS: ReadonlyArray<{ label: string; links: ReadonlyArray<{ href: string; label: string }> }> = [
  {
    label: "Product",
    links: [
      { href: "/", label: "Home" },
      { href: "/problems", label: "Problems" },
      { href: "/activity", label: "Updates" },
      { href: "/search", label: "Search" },
      { href: "/contribute", label: "Add a contribution" },
    ],
  },
  {
    label: "About",
    links: [
      { href: "/about", label: "How it works" },
      { href: "/contact", label: "Contact" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
  {
    label: "Policies",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    label: "Technical context",
    links: [
      { href: "/graph", label: "Relationship graph" },
      { href: "/sources", label: "Sources" },
      { href: "/repositories", label: "Repositories" },
      { href: "/.well-known/vela-site.json", label: "Deployment manifest" },
    ],
  },
];

export function SiteFooter() {
  return <footer className="mt-16 border-t px-5 py-10 text-meta sm:px-6 print:hidden">
    <nav aria-label="All public destinations" className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {GROUPS.map((group) => <div key={group.label}>
        <p className="text-eyebrow uppercase text-muted-foreground">{group.label}</p>
        <ul className="mt-3 space-y-2">
          {group.links.map((link) => <li key={link.href}>
            <Link href={link.href as never} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{link.label}</Link>
          </li>)}
        </ul>
      </div>)}
    </nav>
    <p className="mx-auto mt-10 max-w-6xl text-micro text-muted-foreground">problems.science publishes a read-only view of source-owned Problems and Repository-local scientific state. <Link href="/about" className="underline underline-offset-4 hover:text-foreground">How this view works</Link>.</p>
  </footer>;
}
