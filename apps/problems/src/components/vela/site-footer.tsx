import Link from "next/link";

/* A compact trust landmark, not another copy of product navigation. Task and
 * technical routes stay with the sidebar, command palette, and their owning
 * surfaces. */
const LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter() {
  return <footer className="mt-8 border-t px-5 py-3 text-meta sm:px-6 print:hidden">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1">
      <p className="hidden py-1.5 text-micro text-muted-foreground sm:block">problems.science</p>
      <nav aria-label="Product information">
        <ul className="-mx-2 flex flex-wrap items-center gap-x-1">
          {LINKS.map((link) => <li key={link.href}>
            <Link href={link.href} className="inline-flex min-h-8 items-center px-2 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{link.label}</Link>
          </li>)}
        </ul>
      </nav>
    </div>
  </footer>;
}
