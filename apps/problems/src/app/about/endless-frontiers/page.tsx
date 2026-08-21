import { permanentRedirect } from "next/navigation";

/* The essay this address was published for was removed from vela.space on
   2026-08-21. The address itself stays — it is a published URL and something
   still links to it — so it now lands on the site root rather than on a 404. */
const ESSAY_URL = "https://vela.space";

type LegacyEssaySearchParams = Record<string, string | string[] | undefined>;

export function essayDestination(params: LegacyEssaySearchParams) {
  const destination = new URL(ESSAY_URL);
  for (const [name, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) destination.searchParams.append(name, item);
    } else if (value !== undefined) {
      destination.searchParams.append(name, value);
    }
  }
  return destination.toString();
}

export default async function LegacyEssayPage({
  searchParams,
}: {
  searchParams: Promise<LegacyEssaySearchParams>;
}) {
  permanentRedirect(essayDestination(await searchParams));
}
