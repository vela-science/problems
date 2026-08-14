import { allRepositories } from "@vela/projection-data";
import { RepositoryRouteScope } from "./repository-route-scope";

// Prebuild the registry's published repository shells while allowing rooted
// Claim records to be materialized beneath them on first access. No count here:
// generateStaticParams builds whatever allRepositories() returns, so naming a
// number only records how many there were the day it was written. Each page
// performs its exact Repository read; keeping that guard in the page lets this
// segment's not-found boundary name the missing Repository scope.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await allRepositories()).map((repository) => ({ slug: repository.slug }));
}

export default async function RepositoryWorkspaceLayout({
  children,
  params,
}: LayoutProps<"/repositories/[slug]">) {
  const { slug } = await params;

  return (
    <div className="min-w-0">
      <RepositoryRouteScope slug={slug}>{children}</RepositoryRouteScope>
    </div>
  );
}
