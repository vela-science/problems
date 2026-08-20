"use client";

/* Recently opened objects, for the command palette.
 *
 * The convention every reference product in AGENTS.md shares — GitHub, Entire,
 * Linear, Hugging Face — is that the palette opens on what you were just
 * looking at, not on an empty field. This product had no such list: an empty
 * query showed only static destinations, so returning to the Problem you read
 * ten minutes ago meant retyping its number.
 *
 * Deliberately local and small:
 *
 * - `localStorage`, never the account. A list of which scientific Problems
 *   someone reads is exactly the kind of thing that should not become server
 *   state without a reason, and there is no reason here.
 * - Titles are stored alongside the path so the list reads as objects rather
 *   than URLs, and so drawing it costs no read.
 * - Capped, so the key cannot grow without bound.
 */

const KEY = "vela.recent-objects.v1";
const LIMIT = 8;

export type RecentObject = {
  href: string;
  title: string;
  /** "Erdős Problems", "Vela Mathematics Program" — the object's context. */
  context?: string;
  at: number;
};

/* A same-origin path, and only that. `startsWith("/")` alone admits
   `//evil.example/x`, which a browser reads as protocol-relative and follows
   off-origin — the palette navigates to whatever this returns. */
function samePath(href: unknown): href is string {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}

function read(): RecentObject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    /* Anything that is not the current shape is dropped rather than repaired:
       this is a convenience cache, so a bad entry costs nothing to discard. */
    return parsed.filter((entry): entry is RecentObject =>
      Boolean(entry)
      && samePath((entry as RecentObject).href)
      && typeof (entry as RecentObject).title === "string"
      && typeof (entry as RecentObject).at === "number",
    ).slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function recentObjects(): RecentObject[] {
  return read().sort((left, right) => right.at - left.at);
}

export function rememberObject(entry: Omit<RecentObject, "at">): void {
  if (typeof window === "undefined" || !samePath(entry.href)) return;
  try {
    const next = [{ ...entry, at: Date.now() }, ...read().filter((item) => item.href !== entry.href)].slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Private mode, a full quota, or storage disabled. The palette simply has
       no recents; nothing else depends on this. */
  }
}

export function forgetObjects(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* As above. */
  }
}
