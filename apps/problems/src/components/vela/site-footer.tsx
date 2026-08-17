import Link from "next/link";

/* The complete public route map, in one quiet landmark. The sidebar stays the
 * four-destination product spine; the routes that are published but not spine
 * — decisions, proposals, hubs, graph, search — were reachable only through
 * the command palette or a link someone already had. A footer is where a
 * reader expects the full map, and `contentinfo` is what a screen reader
 * asks for to find it. */
const GROUPS: ReadonlyArray<{ label: string; links: ReadonlyArray<{ href: string; label: string }> }> = [
  {
    label: "Product",
    links: [
      { href: "/", label: "Home" },
      { href: "/problems", label: "Problems" },
      { href: "/activity", label: "Updates" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    label: "Technical details",
    links: [
      { href: "/repositories", label: "Repositories" },
      { href: "/sources", label: "Sources" },
      { href: "/decisions", label: "Decisions" },
      { href: "/proposals", label: "Proposed changes" },
      { href: "/hubs", label: "Hubs" },
    ],
  },
  { label: "Explore context", links: [{ href: "/graph", label: "Relationship graph" }] },
  {
    label: "Exact release",
    links: [
      { href: "/.well-known/vela-site.json", label: "Deployment manifest" },
      { href: "/problems.json", label: "Problems JSON" },
      { href: "/sources.json", label: "Sources JSON" },
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
    <p className="mx-auto mt-10 max-w-6xl text-micro text-muted-foreground">problems.science serves an exact projection of signed scientific State. Hosted coordination is non-authoritative.</p>
  </footer>;
}
