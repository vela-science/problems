"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search01Icon as Search } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Toolbar } from "@base-ui/react/toolbar";
import { Button } from "@vela/ui/components/button";
import { SidebarTrigger } from "@vela/ui/components/sidebar";
import { RepositorySwitcher } from "@/components/vela/repository-switcher";
import { ProblemSwitcher } from "@/components/vela/problem-switcher";
import { AccountMenu } from "@/components/vela/account-menu";
import { COMMAND_PALETTE_TRIGGER_ID, useCommandPalette } from "@/components/vela/command-palette";
import { NotificationCenter } from "@/components/vela/notification-center";
import { ThemeToggle } from "@/components/vela/theme-toggle";
import type { PublishedProblemCollection } from "@/lib/problem-collections";
import { performerIdFromSegment } from "@/lib/performer-route";

type PublishedRepository = {
  slug: string;
  name: string;
  pending: number;
  hasGraph: boolean;
};

const sectionTitles: Record<string, string> = {
  claims: "Claims",
  problems: "Problems",
  proposals: "Proposed changes",
  graph: "Research map",
  reproduce: "Reproduce",
};

const globalTitles: Record<string, string> = {
  "/": "Home",
  "/problems": "Problems",
  "/frontiers": "Frontiers",
  "/contribute": "Add a contribution",
  "/updates": "Updates",
  "/repositories": "Repositories",
  "/decisions": "Decisions",
  "/proposals": "Proposed changes",
  "/sources": "Sources",
  "/search": "Search",
  /* The page calls itself the Research map, and so does PRODUCT.md. The trail
     called it "Graph", so one destination had two names depending on where a
     reader met it. */
  "/graph": "Research map",
  "/account": "Account",
  "/workspaces": "Workspaces",
  "/privacy": "Privacy",
  "/terms": "Terms",
  "/accessibility": "Accessibility",
  "/contact": "Contact",
};

/* A record's own identity, for the end of the trail.
 *
 * The trail used to stop at the section, so every Claim, Proposal and
 * Problem page read `Erdős ⌄ / Claims` — the same three words on 2,782 different
 * pages, none of which said which record was open. A content address is long by
 * construction, so it is truncated the way `RecordId` truncates one and kept in
 * mono; a Problem number is already short and is left alone. */
function recordTrailLabel(segment: string) {
  const decoded = decodeURIComponent(segment);
  return decoded.length > 22 ? `${decoded.slice(0, 18)}…` : decoded;
}

/* The ancestor crumb yields before the current page does.
 *
 * It was `shrink-0`, so at 320px it held full width, squeezed the current page
 * to `clientWidth: 0` — the page name vanished rather than ellipsising — and
 * ran nine pixels under the search trigger, which made its own right edge
 * unclickable. The page a reader is on is the part worth keeping. */
function headerTrail(pathname: string, repositories: PublishedRepository[], problemCollections: PublishedProblemCollection[]) {
  /* A Problem, with the optional section segment its rail links to. The
     section is the last crumb, the way it is the last crumb inside any object
     that owns its own sections. */
  const canonicalProblem = pathname.match(/^\/problems\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/u);
  if (canonicalProblem) {
    const namespace = canonicalProblem[1];
    const problem = canonicalProblem[2];
    const view = canonicalProblem[3] ?? null;
    const collection = problemCollections.find((entry) => entry.namespace === namespace);
    return {
      repository: null,
      section: null,
      sectionHref: null,
      sectionKey: null,
      collection: null,
      problem: collection && problem ? {
        collectionName: collection.name,
        collectionHref: `/problems/${collection.namespace}`,
        label: collection.identifierKind === "slug" ? recordTrailLabel(problem) : `#${recordTrailLabel(problem)}`,
        href: `/problems/${namespace}/${problem}`,
        namespace: namespace!,
      } : null,
      record: null,
      compactRecord: null,
      view: view ? { label: `${view.charAt(0).toUpperCase()}${view.slice(1)}`, href: `/problems/${namespace}/${problem}/${view}` } : null,
    };
  }
  const collectionMatch = pathname.match(/^\/problems\/([^/]+)$/u);
  if (collectionMatch) {
    const collection = problemCollections.find(({ namespace }) => namespace === collectionMatch[1]);
    if (collection) return {
      repository: null,
      section: "Problems",
      sectionHref: "/problems",
      sectionKey: null,
      collection: null,
      record: collection.name,
      compactRecord: collection.name,
view: null,
    };
  }
  if (pathname === "/account/profile") return {
    repository: null,
    section: "Account",
    sectionHref: "/account",
    sectionKey: null,
    collection: null,
    record: "Public profile",
    compactRecord: "Public profile",
view: null,
  };
  const contributorMatch = pathname.match(/^\/people\/([^/]+)$/u);
  if (contributorMatch) {
    const identity = decodeURIComponent(contributorMatch[1]!);
    return {
      repository: null,
      section: "Contributor",
      sectionHref: null,
      sectionKey: null,
      collection: null,
      record: performerIdFromSegment(identity) ? "Performer" : `@${recordTrailLabel(identity)}`,
      compactRecord: performerIdFromSegment(identity) ? "Performer" : `@${recordTrailLabel(identity)}`,
view: null,
    };
  }
  const repository = repositories.find(({ slug }) =>
    pathname === `/repositories/${slug}` || pathname.startsWith(`/repositories/${slug}/`));
  if (!repository) {
    if (pathname.startsWith("/sources/")) {
      const id = pathname.slice("/sources/".length).split("/").filter(Boolean)[0];
      return {
        repository: null,
        section: "Sources",
        sectionHref: "/sources",
        sectionKey: null,
        collection: null,
        record: id ? recordTrailLabel(id) : null,
        compactRecord: null,
view: null,
      };
    }
    return {
      repository: null,
      section: globalTitles[pathname] ?? "Vela",
      sectionHref: null,
      sectionKey: null,
      collection: null,
      record: null,
      compactRecord: null,
view: null,
    };
  }
  const base = `/repositories/${repository.slug}`;
  const rest = pathname.slice(base.length).split("/").filter(Boolean);
  const key = rest[0] ?? "";
  const named = Boolean(key) && Boolean(sectionTitles[key]);
  return {
    repository: { slug: repository.slug, name: repository.name },
    section: key ? sectionTitles[key] ?? null : "Overview",
    /* A link only when something sits below it. On the collection itself the
       section IS the page, and a link to the page you are on is a dead control. */
    sectionHref: named && rest.length > 1 ? `${base}/${key}` : null,
    /* The raw key, not a path: whether it survives a switch depends on the
       destination Repository, so `switchDestination` decides per entry. */
    sectionKey: named ? key : null,
    collection: null,
    record: named && rest[1] ? recordTrailLabel(rest[1]) : null,
    compactRecord: null,
view: null,
  };
}

export function AppHeader({
  repositories,
  problemCollections,
}: {
  repositories: PublishedRepository[];
  problemCollections: PublishedProblemCollection[];
}) {
  const pathname = usePathname();
  const { setOpen } = useCommandPalette();
  const trail = headerTrail(pathname, repositories, problemCollections);
  return (
    <header className="shrink-0 print:hidden">
      <Toolbar.Root className="flex min-h-12 min-w-0 flex-wrap items-center gap-1 px-(--vela-page-gutter) py-1 sm:h-12 sm:flex-nowrap sm:py-0">
      {/* Under `md` the rail is a Sheet that starts closed, and the trigger the
          sidebar owns is inside it — so nothing on screen can open it. This one
          exists only while the rail is off-screen, which is also why it does not
          reintroduce the duplication the sidebar-owned trigger removed: on
          desktop there is exactly one trigger, and it is still the rail's. */}
      <SidebarTrigger className="size-11 md:hidden" aria-label="Open navigation" />
      {/* The trail names where you are, and its first element is a control
          rather than a link: switching Repository from inside one used to mean
          going back to the list and picking again. The current section is the
          last element and is text, not a link — it is the page you are on. */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden pr-2 text-body text-muted-foreground">
        {trail.repository ? (
          <RepositorySwitcher
            current={trail.repository}
            repositories={repositories}
            section={trail.sectionKey}
          />
        ) : null}
        {trail.problem ? (
          <ProblemSwitcher
            collectionName={trail.problem.collectionName}
            collectionHref={trail.problem.collectionHref}
            label={trail.problem.label}
            collections={problemCollections}
            namespace={trail.problem.namespace}
          />
        ) : null}
        {trail.section ? (
          <>
            {/* Hidden exactly when the crumb to its right is. The section is a
                link only when it is not the current page, and only the link
                collapses below `sm`; the plain span stays, and so must the
                separator before it. */}
            {trail.repository ? (
              <span aria-hidden className={trail.sectionHref ? "hidden text-muted-foreground sm:inline" : "text-muted-foreground"}>/</span>
            ) : null}
            {trail.sectionHref ? (
              <Link href={trail.sectionHref} className="hidden min-h-6 min-w-0 shrink items-center truncate hover:text-foreground hover:underline sm:inline-flex">
                {trail.section}
              </Link>
            ) : (
              <span className="min-w-0 truncate font-medium text-foreground" aria-current={trail.record ? undefined : "page"}>{trail.section}</span>
            )}
          </>
        ) : null}
        {trail.record ? (
          <>
            {/* A separator needs something on its left. Collapsing the section
                crumb below `sm` left this one leading the breadcrumb, so every
                Problem and Source page opened with a bare "/" — 1,217 of the
                1,253 URLs in the sitemap. Hide it exactly when nothing visible
                precedes it: the Repository switcher never collapses, and a
                section without an href renders as a plain span that also
                stays. */}
            <span
              aria-hidden
              className={
                trail.repository || (trail.section && !trail.sectionHref)
                  ? "text-muted-foreground"
                  : "hidden text-muted-foreground sm:inline"
              }
            >
              /
            </span>
            <span
              className="min-w-0 truncate font-mono text-label text-foreground"
              aria-current="page"
            >
              {trail.compactRecord && trail.compactRecord !== trail.record
                ? <><span className="sm:hidden">{trail.compactRecord}</span><span className="hidden sm:inline">{trail.record}</span></>
                : trail.record}
            </span>
          </>
        ) : null}
        {trail.view ? (
          <>
            <span aria-hidden className="text-muted-foreground">/</span>
            <span className="min-w-0 truncate font-medium text-foreground" aria-current="page">{trail.view.label}</span>
          </>
        ) : null}
      </nav>
        <div className="flex shrink-0 items-center justify-end gap-1">
          <Button
            id={COMMAND_PALETTE_TRIGGER_ID}
            variant="outline"
            size="sm"
            className="h-11 min-w-11 gap-2 bg-background px-2.5 text-meta text-muted-foreground shadow-none md:h-8 md:min-w-0"
            onClick={() => setOpen(true)}
            aria-label="Search or navigate problems.science"
          >
            <HugeiconsIcon icon={Search} aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">Search or jump</span>
            <kbd className="hidden font-mono text-meta text-muted-foreground lg:inline">⌘K</kbd>
          </Button>
          <NotificationCenter repositories={repositories} />
          <ThemeToggle className="size-11 md:size-8" />
          <AccountMenu />
        </div>
      </Toolbar.Root>
    </header>
  );
}
