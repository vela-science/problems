"use client";

/* The last boundary, for a failure in the root layout itself.
 *
 * `app/error.tsx` cannot catch one: the root layout is what renders it. This
 * matters here because the layout awaits `allRepositories()` and
 * `projectionManifest()`, so a projection read that fails at that level had no
 * boundary at all and served the framework's default page.
 *
 * It replaces the root layout when active, so per Next's file convention it
 * declares its own `html` and `body`. Everything is inline and literal for the
 * same reason: providers, theme state and token layers are all part of what
 * just failed, so this page depends on none of them. `prefers-color-scheme`
 * stands in for the theme the pre-paint script would normally have applied.
 *
 * `reset` rather than `retry`: Next 16 provides both, and every other boundary
 * in this app takes `reset`. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100svh", display: "grid", placeContent: "center", gap: "1rem", padding: "2rem", background: "#f7f6f2", color: "#081224", fontFamily: "ui-sans-serif, system-ui, sans-serif", textAlign: "left" }}>
        <style>{"@media (prefers-color-scheme: dark) { body { background: #081224 !important; color: #f7f6f2 !important; } a { color: #f7f6f2 !important; } }"}</style>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.01em" }}>problems.science could not start.</h1>
        <p style={{ margin: 0, maxWidth: "42ch", lineHeight: 1.6, fontSize: "0.9375rem" }}>
          The published release could not be read, so nothing on this page would be exact. This site does not
          substitute unverified scientific state when a published view fails.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <button type="button" onClick={reset} style={{ minHeight: "2.75rem", padding: "0 1rem", border: "1px solid currentColor", borderRadius: "0.5rem", background: "transparent", color: "inherit", font: "inherit", cursor: "pointer" }}>Try again</button>
          {/* A plain anchor, deliberately, and the only lint exception in the
              app. `next/link` would navigate softly and re-render the root
              layout — which is precisely what threw to get here — so the most
              likely outcome is this same boundary again. A hard navigation asks
              the server for a fresh render, which is the actual recovery. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/problems" style={{ minHeight: "2.75rem", display: "inline-flex", alignItems: "center", padding: "0 1rem", borderRadius: "0.5rem", color: "inherit" }}>Open Problems</a>
        </div>
      </body>
    </html>
  );
}
