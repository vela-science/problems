"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { queryHref, type QueryUpdate } from "@/lib/query-state";

/**
 * Update query-only view state without refetching an unchanged server route.
 *
 * `push` writes history directly, which is right for selection state the client
 * resolves out of data it already holds. It is wrong for any parameter the
 * server reads: the route does not re-render, the server-computed prop keeps
 * its old value, and a reconciliation effect comparing the two will treat the
 * new URL as stale and revert it. Use `navigate` for those — filters, sort,
 * pagination — so the server recomputes and the prop agrees with the URL.
 */
export function useQueryNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const renderedParams = useSearchParams();

  const href = useCallback((updates: QueryUpdate) => {
    const current = typeof window === "undefined"
      ? renderedParams
      : new URLSearchParams(window.location.search);
    return queryHref(pathname, current, updates);
  }, [pathname, renderedParams]);

  const push = useCallback((updates: QueryUpdate) => {
    const next = href(updates);
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) window.history.pushState(null, "", next);
  }, [href]);

  const navigate = useCallback((updates: QueryUpdate) => {
    const next = href(updates);
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) router.push(next, { scroll: false });
  }, [href, router]);

  const replace = useCallback((updates: QueryUpdate) => {
    window.history.replaceState(null, "", href(updates));
  }, [href]);

  return { href, push, navigate, replace };
}
