/* The route's name, for screen readers only.
 *
 * The app header already names where you are — `Erdős formalization fidelity ⌄
 * / Claims` — so a second copy directly beneath it was a band that repeated the
 * trail, floated a count, added a sentence of explanation, and drew a rule
 * above content that then introduced itself again ("Claim ledger"). Removing
 * the band and keeping the heading is what GitHub does under a repository tab:
 * the tab names the page, the page gets on with it.
 *
 * DESIGN.md still requires exactly one descriptive `h1` per route body, and a
 * screen reader has no trail to read it from, so the heading stays here and
 * carries its scope. Anything a reader should see — the count, the filters, the
 * view controls — belongs in the content's own toolbar row, where it sits
 * beside the thing it counts or controls.
 */
export function RouteTitle({ title, scope }: { title: string; scope?: string }) {
  return <h1 className="sr-only">{scope ? `${title} · ${scope}` : title}</h1>;
}
