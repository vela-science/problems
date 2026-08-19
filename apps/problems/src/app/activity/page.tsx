import { permanentRedirect } from "next/navigation";

export default async function LegacyActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const query = await searchParams;
  const target = new URLSearchParams();
  if (query.view === "transitions" || query.view === "commits") target.set("view", query.view);
  permanentRedirect(target.size ? `/updates?${target.toString()}` : "/updates");
}
