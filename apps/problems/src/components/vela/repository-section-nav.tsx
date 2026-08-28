"use client";

import { usePathname } from "next/navigation";
import { SectionNav, type SectionLink } from "@/components/vela/section-nav";

/* A Repository's sections, in the Repository's own header.
 *
 * They lived in the sidebar while a Problem's lived in its header, so the
 * product had two navigation models for two object types and nothing a reader
 * could predict from: open a Problem and the sections are above the content,
 * open a Repository and they are in the rail. A new object type would have had
 * no rule to follow.
 *
 * One rule now — the rail moves between objects, an object's header moves
 * between its sections — and this uses the same `SectionNav` the Problem
 * header uses, so the scroll-into-view, the overflow cue and the 44px
 * coarse-pointer target are one implementation rather than two.
 *
 * `usePathname` rather than a prop: the layout that renders this is a server
 * component and cannot read the active segment, and every page beneath it
 * already performs its own exact Repository read. Deriving the section from the
 * address avoids a second projection read on every route. */
const SECTIONS: Array<{ key: string; label: string }> = [
  { key: "", label: "Overview" },
  /* Not "Problems": the rail already has a link by that name pointing at the
     whole product. This is the Repository's own ledger, which is what its page
     calls it. */
  { key: "problems", label: "Problem ledger" },
  { key: "claims", label: "Assertions" },
  { key: "proposals", label: "Proposed changes" },
  { key: "commits", label: "Commits" },
  { key: "reproduce", label: "Reproduce" },
];

export function RepositorySectionNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  /* `/repositories/<slug>` plus one optional section segment. A deeper path —
     a Claim or Proposal record — keeps the row and marks no section, because it
     sits under a section rather than beside one. */
  const current = parts[0] === "repositories" && parts[1] === slug ? parts[2] ?? "" : "";
  const deeper = parts.length > 3;

  const sections: SectionLink[] = SECTIONS.map(({ key, label }) => ({
    key: key || "overview",
    label,
    href: key ? `/repositories/${slug}/${key}` : `/repositories/${slug}`,
  }));

  return <SectionNav
    label="Repository sections"
    sections={sections}
    current={deeper ? "" : current || "overview"}
  />;
}
