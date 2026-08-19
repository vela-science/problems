import { permanentRedirect } from "next/navigation";

const ESSAY_URL = "https://vela.space/constellations";

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
