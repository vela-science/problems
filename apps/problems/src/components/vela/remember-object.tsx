"use client";

import { useEffect } from "react";
import { rememberObject } from "@/lib/recent-objects";

/* Records that this object was opened, for the command palette's "Recently
   opened" group. Renders nothing.
 *
 * A component rather than a hook so a server-rendered page can drop it in
 * without becoming a client component itself. The title is passed in rather
 * than read from the DOM, because the object's own name is a fact the page
 * already has and scraping `document.title` would pick up the site suffix. */
export function RememberObject({ href, title, context }: { href: string; title: string; context?: string }) {
  useEffect(() => {
    rememberObject({ href, title, context });
  }, [href, title, context]);
  return null;
}
