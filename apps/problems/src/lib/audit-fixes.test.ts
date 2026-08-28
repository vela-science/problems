import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), "src", path), "utf8");

/* Rules a platform audit had to measure in a browser to find. Each one below
 * was a real defect on `main`; the assertion is here so it does not come back
 * silently the way the first three did. */
describe("audit fixes", () => {
  /* `/account`, `/account/connections` and `/account/profile` answered 200 to a
     signed-out reader while every other gated route answered 307, because
     `app/account/loading.tsx` opens a Suspense boundary before the page's own
     auth check runs. The proxy is the only place guaranteed to run before any
     rendering. */
  it("gates the account routes in the proxy, ahead of any streaming boundary", () => {
    const proxy = source("proxy.ts");
    expect(proxy).toContain("GATED_ACCOUNT_PATHS");
    for (const path of ["/account", "/account/connections", "/account/profile"]) {
      expect(proxy).toContain(`"${path}"`);
    }
    expect(proxy).toContain("NextResponse.redirect");
    /* The skeleton the redirect used to defeat is still there for the reader it
       was written for. */
    expect(() => source("app/account/loading.tsx")).not.toThrow();
  });

  /* At 375px the section row was 339px wide over 441px of tabs with
     `scrollbar-width: none` and `scrollLeft: 0`, so the open section sat
     entirely off-screen and nothing was marked current. */
  it("scrolls the open Problem section into view and cues the overflow", () => {
    const nav = source("components/vela/section-nav.tsx");
    expect(nav).toContain("scrollLeft");
    expect(nav).toContain('aria-current="page"');
    expect(nav).toContain("dataset.overflow");
    /* `scrollIntoView` would drag every ancestor; only this row should move.
       The name appears in the comment explaining that, so this looks for the
       call rather than the word. */
    expect(nav).not.toMatch(/\.scrollIntoView\(/u);

    /* The row owns its own stylesheet now: it is shared by the Problem and the
       Repository headers, and reaching into `problem-header.module.css` for it
       said the Repository's tabs belonged to the Problem. What is left in CSS
       is only what utilities cannot say readably — a hidden scrollbar and the
       three mask gradients. */
    const styles = source("components/vela/section-nav.module.css");
    for (const cue of ['[data-overflow="start"]', '[data-overflow="end"]', '[data-overflow="both"]']) {
      expect(styles).toContain(cue);
    }
    /* Primary navigation, so it meets the touch target on a coarse pointer.
       An anchor is not a control slot, so it opts in with a minimum and
       `globals.css` promotes it — one policy, not a per-component variant. */
    expect(nav).toContain("min-h-9");
    expect(nav).not.toContain("pointer-coarse:");
  });

  /* An accepted partial Result must never read as resolution of the headline
     Problem. The Problem page refuses that four ways; Home rendered a green
     node, the Problem's name, then the bare word "accepted". */
  it("never labels a Result with a bare 'accepted' beside a Problem name on Home", () => {
    const panel = source("components/vela/home-state-panel.tsx");
    expect(panel).toContain("Result accepted");
    expect(panel).not.toMatch(/>\s*accepted\{/u);
    /* Green is the semantic success token; an open Problem does not get one. */
    expect(panel).not.toContain("bg-status-progress ring-2");
  });

  /* Each check printed `check.property` as its title and again beneath it as
     "Scope: …" — the same string, sentence-cased then not. */
  it("does not print a check's scope twice", () => {
    expect(source("components/vela/problem-overview.tsx")).not.toContain("Scope: {humanize(check.property");
  });

  /* A Lean symbol path has no break opportunity, so it set a min-content floor
     wider than a phone and every `overflow-hidden` ancestor clipped it: 143px
     of content lost at 320 on the Results section. */
  it("lets exact identifiers wrap so they are not clipped", () => {
    expect(source("app/globals.css")).toContain("overflow-wrap: anywhere");
    expect(source("components/vela/problem-research.tsx")).toContain("vela-exact-text");
  });

  /* The agent mark was cobalt on a 10% cobalt tint: 3.95:1 in light, under the
     4.5 that 14px semibold needs, and the only contrast failure in the product
     carrying meaning. */
  it("keeps the machine performer mark above the contrast threshold", () => {
    expect(source("app/globals.css")).toContain(".vela-machine-mark");
    expect(source("components/vela/actor.tsx")).toContain("vela-machine-mark");
    expect(source("components/vela/actor.tsx")).not.toContain("bg-primary/10 text-primary");
  });
});
