import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";

export const INFORMATION_ROUTES = [
  { href: "/about", label: "About" },
  { href: "/about/endless-frontiers", label: "Essay" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/contact", label: "Contact" },
] as const;

export function PublicInformationNav({ current }: { current: (typeof INFORMATION_ROUTES)[number]["href"] }) {
  return (
    <nav aria-label="About and policies" className="flex flex-wrap gap-x-5 gap-y-2 text-meta">
      {INFORMATION_ROUTES.map((route) => route.href === current ? (
        <span key={route.href} aria-current="page" className="font-medium text-foreground">{route.label}</span>
      ) : (
        <Link key={route.href} href={route.href} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {route.label}
        </Link>
      ))}
    </nav>
  );
}

export function PublicInformationPage({
  current,
  eyebrow,
  title,
  description,
  children,
  aside,
}: {
  current: (typeof INFORMATION_ROUTES)[number]["href"];
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <PageShell as="article" archetype="reading" layout="reading">
      <PageHero density="compact">
        <p className="text-eyebrow uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-display text-balance">{title}</h1>
        <p className="mt-3 max-w-[68ch] text-body leading-7 text-muted-foreground">{description}</p>
        <div className="mt-6"><PublicInformationNav current={current} /></div>
      </PageHero>

      <div className={aside ? "grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start" : "max-w-3xl"}>
        <div className="space-y-10">{children}</div>
        {aside ? <aside className="rounded-xl border bg-muted/25 p-5 text-meta leading-6 lg:sticky lg:top-6">{aside}</aside> : null}
      </div>
    </PageShell>
  );
}

export function InformationSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PageSection className="space-y-3">
      <h2 className="text-title text-balance">{title}</h2>
      <div className="space-y-3 text-body leading-7 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </PageSection>
  );
}

export function InformationList({ children }: { children: ReactNode }) {
  return <ul className="ml-5 list-disc space-y-2 marker:text-primary">{children}</ul>;
}
