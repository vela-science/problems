"use client";

import { lazy, Suspense } from "react";

/* KaTeX, off the critical path of routes that typeset nothing.
 *
 * `ScientificText` imports katex at module scope, so the two client components
 * that render it — the record preview and the search results — pulled 261 KB
 * into the shared client chunk that every route loads, including the home page,
 * which has no mathematics on it at all. Server components are unaffected: they
 * typeset during the render and ship markup, not the library.
 *
 * `lazy` with a real fallback rather than `next/dynamic`, because a dynamic
 * import's loading state cannot see the props: the fallback here is the source
 * text itself, so the statement is readable from first paint and is replaced by
 * its typeset form when the library arrives. Nothing is hidden in between,
 * which is the same reason unparseable notation renders as its own source. */
const Typeset = lazy(() => import("@vela/ui/vela/scientific-text").then((module) => ({ default: module.ScientificText })));

export function LazyScientificText({ text }: { text: string }) {
  return <Suspense fallback={<span>{text}</span>}><Typeset text={text} /></Suspense>;
}
