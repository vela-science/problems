import { permanentRedirect } from "next/navigation";

/* Retired. The hub vocabulary held exactly one entry — "Erdős Problems" — and
   that is the collection itself, so the page restated `/problems` under a
   second name and its own call to action resolved back to the collection the
   reader had just come from. Nothing linked here: the one inbound link, on the
   collection page, sat in a section that does not render.

   The redirect stays because the route was in `sitemap.ts` and is indexed. */
export default async function RetiredHubsPage() {
  permanentRedirect("/problems");
}
